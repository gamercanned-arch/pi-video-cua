use anyhow::{anyhow, Result};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::thread::sleep;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use crate::capture::{capture_screen, capture_screen_raw, get_screen_dimensions, prune_old_files_async};
use crate::protocol::RecordResult;

static RECORD_COUNTER: AtomicU64 = AtomicU64::new(0);

fn get_recording_dir() -> PathBuf {
    let mut temp_dir = std::env::temp_dir();
    temp_dir.push("pi-video-cua");
    temp_dir.push("recordings");
    let _ = fs::create_dir_all(&temp_dir);
    temp_dir
}

fn find_ffmpeg() -> Result<PathBuf> {
    if let Ok(env_path) = std::env::var("FFMPEG_PATH") {
        let p = PathBuf::from(env_path);
        if p.is_file() {
            return Ok(p);
        }
    }

    if let Ok(output) = Command::new("where.exe").arg("ffmpeg").output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = stdout.lines().next() {
                let p = PathBuf::from(first_line.trim());
                if p.is_file() {
                    return Ok(p);
                }
            }
        }
    }

    let candidates = [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\ProgramData\chocolatey\bin\ffmpeg.exe",
        r"C:\scoop\apps\ffmpeg\current\bin\ffmpeg.exe",
    ];

    for candidate in &candidates {
        let p = PathBuf::from(candidate);
        if p.is_file() {
            return Ok(p);
        }
    }

    Err(anyhow!(
        "FFmpeg executable not found. Please ensure ffmpeg is installed and added to PATH or set FFMPEG_PATH environment variable."
    ))
}

pub fn record_screen(duration_secs: f64) -> Result<RecordResult> {
    let duration_secs = duration_secs.max(0.5).min(300.0);
    let ffmpeg_bin = find_ffmpeg()?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let count = RECORD_COUNTER.fetch_add(1, Ordering::SeqCst);
    let file_name = format!("recording_{}_{}.mp4", timestamp, count);
    let output_file = get_recording_dir().join(file_name);
    let output_path_str = output_file.to_string_lossy().to_string();

    let dims = get_screen_dimensions();
    let width = dims.width;
    let height = dims.height;
    let fps = 30u32;
    let total_frames = ((duration_secs * (fps as f64)).round() as usize).max(1);

    let mut child = Command::new(&ffmpeg_bin)
        .args([
            "-y",
            "-f", "rawvideo",
            "-pix_fmt", "rgba",
            "-s", &format!("{}x{}", width, height),
            "-r", &format!("{}", fps),
            "-i", "-",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-pix_fmt", "yuv420p",
            &output_path_str,
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| anyhow!("Failed to spawn FFmpeg process: {}", e))?;

    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| anyhow!("Failed to open FFmpeg stdin pipe"))?;

    let start_time = Instant::now();
    let frame_interval = Duration::from_millis(1000 / (fps as u64));

    // Capture live frames and stream to FFmpeg stdin at 30fps
    let mut last_frame: Option<Vec<u8>> = None;

    for _ in 0..total_frames {
        let frame_start = Instant::now();

        let frame_data = match capture_screen_raw() {
            Ok((rgba, _, _)) => {
                last_frame = Some(rgba.clone());
                rgba
            }
            Err(_) => {
                if let Some(ref prev) = last_frame {
                    prev.clone()
                } else {
                    break;
                }
            }
        };

        if stdin.write_all(&frame_data).is_err() {
            break;
        }

        let elapsed = frame_start.elapsed();
        if elapsed < frame_interval {
            sleep(frame_interval - elapsed);
        }
    }

    drop(stdin);

    let status = child
        .wait()
        .map_err(|e| anyhow!("Failed to wait for FFmpeg: {}", e))?;

    if !status.success() || !output_file.exists() {
        return Err(anyhow!(
            "FFmpeg screen recording failed with exit code: {:?}",
            status.code()
        ));
    }

    let elapsed_total = start_time.elapsed().as_secs_f64();
    let final_screenshot = capture_screen().ok();

    // Prune old recordings in background (keep max 20 files, max 24 hours old)
    prune_old_files_async(get_recording_dir(), 20, Duration::from_secs(24 * 3600));

    Ok(RecordResult {
        success: true,
        video_path: output_path_str,
        duration: elapsed_total,
        screenshot: final_screenshot,
        error: None,
    })
}
