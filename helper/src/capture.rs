use anyhow::{anyhow, Result};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use image::codecs::png::PngEncoder;
use image::{ColorType, ImageEncoder};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use windows::core::Interface;
use windows::Win32::Foundation::{HMODULE, HWND};
use windows::Win32::Graphics::Direct3D::{
    D3D_DRIVER_TYPE_HARDWARE, D3D_FEATURE_LEVEL_10_0, D3D_FEATURE_LEVEL_10_1,
    D3D_FEATURE_LEVEL_11_0,
};
use windows::Win32::Graphics::Direct3D11::{
    D3D11CreateDevice, ID3D11Device, ID3D11DeviceContext, ID3D11Resource, ID3D11Texture2D,
    D3D11_CPU_ACCESS_READ, D3D11_CREATE_DEVICE_BGRA_SUPPORT, D3D11_MAP_READ,
    D3D11_MAPPED_SUBRESOURCE, D3D11_SDK_VERSION, D3D11_TEXTURE2D_DESC, D3D11_USAGE_STAGING,
};
use windows::Win32::Graphics::Dxgi::Common::{DXGI_FORMAT_B8G8R8A8_UNORM, DXGI_SAMPLE_DESC};
use windows::Win32::Graphics::Dxgi::{
    IDXGIAdapter, IDXGIDevice, IDXGIOutput, IDXGIOutput1, IDXGIOutputDuplication, IDXGIResource,
    DXGI_OUTDUPL_FRAME_INFO,
};
use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, RGBQUAD,
    SRCCOPY,
};
use windows::Win32::UI::HiDpi::{
    GetDpiForSystem, SetProcessDpiAwarenessContext, DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2,
};
use windows::Win32::UI::WindowsAndMessaging::{GetCursorPos, GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};

use crate::protocol::{ScreenDimensions, ScreenshotResult};

static COUNTER: AtomicU64 = AtomicU64::new(0);

struct DxgiContext {
    device: ID3D11Device,
    context: ID3D11DeviceContext,
    duplication: IDXGIOutputDuplication,
    staging_texture: Option<ID3D11Texture2D>,
    staging_width: u32,
    staging_height: u32,
}

static DXGI_CACHE: Mutex<Option<DxgiContext>> = Mutex::new(None);

pub fn init_dpi_awareness() {
    unsafe {
        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    }
}

pub fn get_screen_dimensions() -> ScreenDimensions {
    unsafe {
        let width = GetSystemMetrics(SM_CXSCREEN) as u32;
        let height = GetSystemMetrics(SM_CYSCREEN) as u32;
        let dpi = GetDpiForSystem();
        let dpi_scale = (dpi as f64) / 96.0;

        ScreenDimensions {
            width: width.max(1),
            height: height.max(1),
            physical_width: width.max(1),
            physical_height: height.max(1),
            dpi_scale,
        }
    }
}

fn get_screenshot_dir() -> PathBuf {
    let mut temp_dir = std::env::temp_dir();
    temp_dir.push("pi-video-cua");
    temp_dir.push("screenshots");
    let _ = fs::create_dir_all(&temp_dir);
    temp_dir
}

pub fn prune_old_files_async(dir: PathBuf, max_count: usize, max_age: Duration) {
    std::thread::spawn(move || {
        let _ = prune_dir_sync(&dir, max_count, max_age);
    });
}

fn prune_dir_sync(dir: &std::path::Path, max_count: usize, max_age: Duration) -> Result<()> {
    if !dir.exists() {
        return Ok(());
    }
    let now = SystemTime::now();
    let cutoff = now.checked_sub(max_age).unwrap_or(now);

    let mut entries = Vec::new();
    if let Ok(read_dir) = fs::read_dir(dir) {
        for entry in read_dir.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let modified = entry
                .metadata()
                .and_then(|m| m.modified())
                .unwrap_or(UNIX_EPOCH);
            entries.push((path, modified));
        }
    }

    // Sort newest first
    entries.sort_by(|a, b| b.1.cmp(&a.1));

    for (idx, (path, modified)) in entries.iter().enumerate() {
        let is_too_old = *modified < cutoff;
        let is_excess = idx >= max_count;
        if is_too_old || is_excess {
            let _ = fs::remove_file(path);
        }
    }

    Ok(())
}

pub fn capture_screen_raw() -> Result<(Vec<u8>, u32, u32)> {
    let dims = get_screen_dimensions();
    match capture_dxgi() {
        Ok(res) => Ok(res),
        Err(_) => capture_fallback_gdi(dims.width, dims.height),
    }
}

pub fn capture_screen() -> Result<ScreenshotResult> {
    let dims = get_screen_dimensions();
    let (raw_rgba, width, height) = capture_screen_raw()?;

    let mut png_buffer = Vec::new();
    let encoder = PngEncoder::new(&mut png_buffer);
    encoder
        .write_image(&raw_rgba, width, height, ColorType::Rgba8.into())
        .map_err(|e| anyhow!("Failed to encode PNG: {}", e))?;

    let image_base64 = BASE64.encode(&png_buffer);

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let count = COUNTER.fetch_add(1, Ordering::SeqCst);
    let file_name = format!("screenshot_{}_{}.png", timestamp, count);
    let screenshot_dir = get_screenshot_dir();
    let file_path = screenshot_dir.join(file_name);
    let path_str = file_path.to_string_lossy().to_string();

    fs::write(&file_path, &png_buffer)
        .map_err(|e| anyhow!("Failed to write screenshot file: {}", e))?;

    // Prune old screenshots in background (keep max 100 files, max 24 hours old)
    prune_old_files_async(screenshot_dir, 100, Duration::from_secs(24 * 3600));

    Ok(ScreenshotResult {
        success: true,
        image_path: path_str,
        image_base64,
        dimensions: ScreenDimensions {
            width,
            height,
            physical_width: width,
            physical_height: height,
            dpi_scale: dims.dpi_scale,
        },
        error: None,
    })
}

struct FrameGuard<'a>(&'a IDXGIOutputDuplication);

impl<'a> Drop for FrameGuard<'a> {
    fn drop(&mut self) {
        unsafe {
            let _ = self.0.ReleaseFrame();
        }
    }
}

struct MapGuard<'a> {
    context: &'a ID3D11DeviceContext,
    resource: &'a ID3D11Resource,
    mapped: bool,
}

impl<'a> Drop for MapGuard<'a> {
    fn drop(&mut self) {
        if self.mapped {
            unsafe {
                self.context.Unmap(self.resource, 0);
            }
        }
    }
}

fn create_dxgi_context() -> Result<DxgiContext> {
    unsafe {
        let feature_levels = [
            D3D_FEATURE_LEVEL_11_0,
            D3D_FEATURE_LEVEL_10_1,
            D3D_FEATURE_LEVEL_10_0,
        ];
        let mut device: Option<ID3D11Device> = None;
        let mut context: Option<ID3D11DeviceContext> = None;

        D3D11CreateDevice(
            None,
            D3D_DRIVER_TYPE_HARDWARE,
            HMODULE::default(),
            D3D11_CREATE_DEVICE_BGRA_SUPPORT,
            Some(&feature_levels),
            D3D11_SDK_VERSION,
            Some(&mut device),
            None,
            Some(&mut context),
        )?;

        let device = device.ok_or_else(|| anyhow!("Failed to create D3D11 Device"))?;
        let context = context.ok_or_else(|| anyhow!("Failed to create D3D11 Context"))?;

        let dxgi_device: IDXGIDevice = device.cast()?;
        let adapter: IDXGIAdapter = dxgi_device.GetAdapter()?;
        let output: IDXGIOutput = adapter.EnumOutputs(0)?;
        let output1: IDXGIOutput1 = output.cast()?;

        let duplication: IDXGIOutputDuplication = output1.DuplicateOutput(&device)?;

        Ok(DxgiContext {
            device,
            context,
            duplication,
            staging_texture: None,
            staging_width: 0,
            staging_height: 0,
        })
    }
}

fn capture_dxgi_inner(dxgi: &mut DxgiContext) -> Result<(Vec<u8>, u32, u32)> {
    unsafe {
        let mut frame_info = DXGI_OUTDUPL_FRAME_INFO::default();
        let mut resource: Option<IDXGIResource> = None;

        let mut acquired = false;
        for _ in 0..5 {
            let res = dxgi.duplication.AcquireNextFrame(20, &mut frame_info, &mut resource);
            if res.is_ok() && resource.is_some() {
                acquired = true;
                break;
            }
            if let Err(ref e) = res {
                let code = e.code().0 as u32;
                // DXGI_ERROR_WAIT_TIMEOUT is 0x887A0027 - retry is normal when frame hasn't changed
                if code != 0x887A0027 {
                    return Err(anyhow!("DXGI AcquireNextFrame fatal error: {:?}", e));
                }
            }
            std::thread::sleep(Duration::from_millis(15));
        }

        if !acquired || resource.is_none() {
            return Err(anyhow!("Failed to acquire DXGI frame within timeout"));
        }

        // FrameGuard ensures ReleaseFrame is called regardless of early returns or panics
        let _frame_guard = FrameGuard(&dxgi.duplication);

        let resource = resource.unwrap();
        let texture: ID3D11Texture2D = resource.cast()?;

        let mut desc = D3D11_TEXTURE2D_DESC::default();
        texture.GetDesc(&mut desc);

        let width = desc.Width;
        let height = desc.Height;

        if width == 0 || height == 0 {
            return Err(anyhow!("Invalid texture dimensions: {}x{}", width, height));
        }

        // Recreate staging texture if dimensions changed or first time
        if dxgi.staging_texture.is_none() || dxgi.staging_width != width || dxgi.staging_height != height {
            let staging_desc = D3D11_TEXTURE2D_DESC {
                Width: width,
                Height: height,
                MipLevels: 1,
                ArraySize: 1,
                Format: DXGI_FORMAT_B8G8R8A8_UNORM,
                SampleDesc: DXGI_SAMPLE_DESC {
                    Count: 1,
                    Quality: 0,
                },
                Usage: D3D11_USAGE_STAGING,
                BindFlags: 0,
                CPUAccessFlags: D3D11_CPU_ACCESS_READ.0 as u32,
                MiscFlags: 0,
            };

            let mut staging: Option<ID3D11Texture2D> = None;
            dxgi.device.CreateTexture2D(&staging_desc, None, Some(&mut staging))?;
            dxgi.staging_texture = staging;
            dxgi.staging_width = width;
            dxgi.staging_height = height;
        }

        let staging_texture = dxgi
            .staging_texture
            .as_ref()
            .ok_or_else(|| anyhow!("Staging texture not available"))?;

        let tex_res: ID3D11Resource = texture.cast()?;
        let staging_res: ID3D11Resource = staging_texture.cast()?;

        dxgi.context.CopyResource(&staging_res, &tex_res);

        let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
        dxgi.context.Map(&staging_res, 0, D3D11_MAP_READ, 0, Some(&mut mapped))?;

        // MapGuard ensures Unmap is called even if reading pixels fails
        let _map_guard = MapGuard {
            context: &dxgi.context,
            resource: &staging_res,
            mapped: true,
        };

        let row_pitch = mapped.RowPitch as usize;
        let p_data = mapped.pData as *const u8;

        let mut rgba_buffer = vec![0u8; (width * height * 4) as usize];

        for y in 0..height as usize {
            let row_src = p_data.add(y * row_pitch);
            let row_dst_start = y * (width as usize) * 4;

            for x in 0..width as usize {
                let src_idx = x * 4;
                let dst_idx = row_dst_start + src_idx;

                let b = *row_src.add(src_idx);
                let g = *row_src.add(src_idx + 1);
                let r = *row_src.add(src_idx + 2);

                rgba_buffer[dst_idx] = r;
                rgba_buffer[dst_idx + 1] = g;
                rgba_buffer[dst_idx + 2] = b;
                rgba_buffer[dst_idx + 3] = 255;
            }
        }

        drop(_map_guard);
        drop(_frame_guard);

        overlay_cursor_pixels(&mut rgba_buffer, width, height);

        Ok((rgba_buffer, width, height))
    }
}

fn capture_dxgi() -> Result<(Vec<u8>, u32, u32)> {
    let mut guard = DXGI_CACHE.lock().unwrap_or_else(|poisoned| poisoned.into_inner());

    if guard.is_none() {
        match create_dxgi_context() {
            Ok(ctx) => *guard = Some(ctx),
            Err(e) => return Err(anyhow!("Failed to initialize DXGI context: {}", e)),
        }
    }

    if let Some(ref mut ctx) = *guard {
        match capture_dxgi_inner(ctx) {
            Ok(res) => Ok(res),
            Err(first_err) => {
                // Drop dead context (e.g. DXGI_ERROR_ACCESS_LOST or display mode change)
                *guard = None;

                // Recreate and retry once
                if let Ok(mut new_ctx) = create_dxgi_context() {
                    match capture_dxgi_inner(&mut new_ctx) {
                        Ok(res) => {
                            *guard = Some(new_ctx);
                            Ok(res)
                        }
                        Err(second_err) => {
                            Err(anyhow!("DXGI capture retry failed: {}", second_err))
                        }
                    }
                } else {
                    Err(anyhow!("DXGI capture failed and recreation failed: {}", first_err))
                }
            }
        }
    } else {
        Err(anyhow!("DXGI context unavailable"))
    }
}

fn overlay_cursor_pixels(rgba: &mut [u8], width: u32, height: u32) {
    unsafe {
        let mut pt = windows::Win32::Foundation::POINT::default();
        if GetCursorPos(&mut pt).is_ok() {
            let cx = pt.x;
            let cy = pt.y;

            // Draw a high-contrast cursor crosshair/arrow pointer at (cx, cy)
            let cursor_size = 12i32;
            for dy in 0..cursor_size {
                for dx in 0..cursor_size {
                    if dx <= dy && dx + dy <= cursor_size {
                        let px = cx + dx;
                        let py = cy + dy;

                        if px >= 0 && px < width as i32 && py >= 0 && py < height as i32 {
                            let idx = ((py as usize) * (width as usize) + (px as usize)) * 4;
                            let is_border = dx == 0 || dy == dx || dx + dy == cursor_size;
                            if is_border {
                                rgba[idx] = 0;
                                rgba[idx + 1] = 0;
                                rgba[idx + 2] = 0;
                                rgba[idx + 3] = 255;
                            } else {
                                rgba[idx] = 255;
                                rgba[idx + 1] = 255;
                                rgba[idx + 2] = 255;
                                rgba[idx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
    }
}

pub fn capture_fallback_gdi(width: u32, height: u32) -> Result<(Vec<u8>, u32, u32)> {
    unsafe {
        let hdc_screen = GetDC(HWND::default());
        let hdc_mem = if !hdc_screen.is_invalid() {
            CreateCompatibleDC(hdc_screen)
        } else {
            windows::Win32::Graphics::Gdi::HDC::default()
        };

        let hbitmap = if !hdc_screen.is_invalid() && !hdc_mem.is_invalid() {
            CreateCompatibleBitmap(hdc_screen, width as i32, height as i32)
        } else {
            windows::Win32::Graphics::Gdi::HBITMAP::default()
        };

        let pixel_count = (width * height) as usize;
        let mut rgba = vec![0u8; pixel_count * 4];

        if !hdc_mem.is_invalid() && !hbitmap.is_invalid() {
            let old_bitmap = SelectObject(hdc_mem, hbitmap);

            let blt_res = BitBlt(
                hdc_mem,
                0,
                0,
                width as i32,
                height as i32,
                hdc_screen,
                0,
                0,
                SRCCOPY,
            );

            if blt_res.is_ok() {
                let mut bmi = BITMAPINFO {
                    bmiHeader: BITMAPINFOHEADER {
                        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                        biWidth: width as i32,
                        biHeight: -(height as i32),
                        biPlanes: 1,
                        biBitCount: 32,
                        biCompression: BI_RGB.0,
                        biSizeImage: 0,
                        biXPelsPerMeter: 0,
                        biYPelsPerMeter: 0,
                        biClrUsed: 0,
                        biClrImportant: 0,
                    },
                    bmiColors: [RGBQUAD::default()],
                };

                let mut bgra_buffer = vec![0u8; pixel_count * 4];
                let scanlines = GetDIBits(
                    hdc_mem,
                    hbitmap,
                    0,
                    height,
                    Some(bgra_buffer.as_mut_ptr() as *mut _),
                    &mut bmi,
                    DIB_RGB_COLORS,
                );

                if scanlines > 0 {
                    for i in 0..pixel_count {
                        let b = bgra_buffer[i * 4];
                        let g = bgra_buffer[i * 4 + 1];
                        let r = bgra_buffer[i * 4 + 2];
                        rgba[i * 4] = r;
                        rgba[i * 4 + 1] = g;
                        rgba[i * 4 + 2] = b;
                        rgba[i * 4 + 3] = 255;
                    }
                }
            }

            let _ = SelectObject(hdc_mem, old_bitmap);
            let _ = DeleteObject(hbitmap);
            let _ = DeleteDC(hdc_mem);
        }

        if !hdc_screen.is_invalid() {
            let _ = ReleaseDC(HWND::default(), hdc_screen);
        }

        overlay_cursor_pixels(&mut rgba, width, height);

        Ok((rgba, width, height))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_capture_fallback_gdi() {
        init_dpi_awareness();
        let dims = get_screen_dimensions();
        let (rgba, w, h) = capture_fallback_gdi(dims.width, dims.height).expect("fallback capture should succeed");
        assert_eq!(w, dims.width);
        assert_eq!(h, dims.height);
        assert_eq!(rgba.len(), (dims.width * dims.height * 4) as usize);
    }



    #[test]
    fn test_prune_old_files() {
        let temp_dir = std::env::temp_dir().join("pi_cua_test_prune");
        let _ = fs::create_dir_all(&temp_dir);

        for i in 0..10 {
            let file_path = temp_dir.join(format!("test_file_{}.tmp", i));
            let _ = fs::write(&file_path, b"test");
        }

        prune_dir_sync(&temp_dir, 5, Duration::from_secs(3600)).unwrap();

        let count = fs::read_dir(&temp_dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_file())
            .count();

        assert_eq!(count, 5);
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
