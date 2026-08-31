# pi-video-cua

A **Computer-Use Agent (CUA)** extension for [pi.dev](https://pi.dev) designed specifically for controlling Windows 11 desktop applications, with special optimizations for video editing software like **DaVinci Resolve**.

`pi-video-cua` equips AI agents with precise visual perception and interaction capabilities over the Windows desktop.

---

## 🎯 Design Philosophy: Visual Feedback Loop

This extension is built around the principle that **the agent reasons visually**:
- **Normalized Coordinate Space**: All coordinates are expressed as normalized fractions from `0.0` (top-left) to `1.0` (bottom-right), making them independent of display resolution and DPI scaling.
- **Immediate Visual Feedback**: Every tool that changes screen state returns an instant, high-resolution screenshot with the mouse cursor rendered in place. The agent can immediately inspect the effect of its action, self-correct if it miscalculated a coordinate, and plan its next move.
- **Zero Latency**: A persistent native helper process (`pi-video-cua-helper.exe`) stays alive across tool invocations, eliminating startup overhead.
- **Hardware-Accelerated Compatibility**: Uses low-level Windows Desktop Duplication and SendInput APIs to reliably interact with Qt-based, GPU-accelerated applications like DaVinci Resolve.

---

## 🛠️ The 9 Agent Tools

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `screenshot` | *(none)* | Captures the entire primary display with cursor overlay and returns image + resolution metadata. |
| `move_mouse` | `x`, `y` | Moves the cursor to normalized coordinates `(0.0 - 1.0)` and returns a screenshot to verify cursor placement. |
| `click` | `button?` (`"left"` \| `"right"` \| `"middle"`) | Clicks at the current cursor position. Returns a screenshot of the resulting UI state. |
| `type_text` | `text` | Injects Unicode characters into the currently focused text field character-by-character. |
| `press_key` | `key` | Presses single keys (`enter`, `space`, `tab`, `backspace`, `f1`-`f12`, etc.) or modifier combinations (`ctrl+s`, `ctrl+shift+z`, `alt+tab`). |
| `wait` | `ms` | Waits for a specified duration in milliseconds (for render completion, animations, or playback) and returns a fresh screenshot. |
| `screen_record` | `duration` | Records the screen and system audio simultaneously using FFmpeg for the specified duration (seconds). Returns video file path and end screenshot. |
| `drag` | `x1`, `y1`, `x2`, `y2` | Presses left mouse button at `(x1, y1)`, performs smooth interpolated drag movement with micro-delays to `(x2, y2)`, releases, and returns a screenshot. |
| `scroll` | `x`, `y`, `direction`, `amount?` | Positions cursor at `(x, y)` and simulates vertical (`"up"`/`"down"`) or horizontal (`"left"`/`"right"`) mouse wheel scrolling. |

---

## 📐 Normalized Coordinate System

To prevent hallucination of raw pixel offsets across different monitor setups (1080p, 1440p, 4K) and DPI scale factors (100%, 125%, 150%, 200%), coordinates are always normalized:

$$\text{Pixel } X = x_{\text{norm}} \times (\text{Width} - 1)$$
$$\text{Pixel } Y = y_{\text{norm}} \times (\text{Height} - 1)$$

- `(0.0, 0.0)` is the **Top-Left** corner of the primary display.
- `(0.5, 0.5)` is the **Center** of the screen.
- `(1.0, 1.0)` is the **Bottom-Right** corner of the primary display.

---

## 🎬 DaVinci Resolve Automation Examples

### 1. Timeline Navigation & Playback
```typescript
// 1. Move cursor over the timeline viewer and click to focus
await move_mouse({ x: 0.5, y: 0.6 });
await click({ button: "left" });

// 2. Start playback (Space)
await press_key({ key: "space" });

// 3. Record 5 seconds of audio/video playback to inspect edit
const recordResult = await screen_record({ duration: 5.0 });

// 4. Pause playback
await press_key({ key: "space" });
```

### 2. Blade Tool & Cutting Clips
```typescript
// Select Blade Tool (B shortcut in DaVinci Resolve)
await press_key({ key: "b" });

// Position playhead/cursor at the cut location on the timeline
await move_mouse({ x: 0.42, y: 0.75 });
await click({ button: "left" });

// Switch back to Selection Arrow Tool (A shortcut)
await press_key({ key: "a" });
```

### 3. Dragging & Trimming Clips
```typescript
// Drag clip from media pool (x1: 0.15, y1: 0.3) to timeline track (x2: 0.55, y2: 0.75)
await drag({
  x1: 0.15,
  y1: 0.30,
  x2: 0.55,
  y2: 0.75
});
```

### 4. Zooming the Timeline
```typescript
// Position cursor over timeline ruler and scroll to zoom in
await scroll({
  x: 0.5,
  y: 0.7,
  direction: "up",
  amount: 4
});
```

---

## 📦 Installation & Setup

### Installing in Pi

```bash
pi install pi-video-cua
```

### Building from Source

**Requirements:**
- Windows 10/11 x64
- Node.js 18+ & npm
- Rust toolchain (`cargo` / `rustc`)
- FFmpeg on system `PATH` (or `FFMPEG_PATH` environment variable)

```bash
# 1. Clone repository
git clone https://github.com/your-org/pi-video-cua.git
cd pi-video-cua

# 2. Install dependencies & build native helper + TypeScript
npm install
npm run build

# 3. Run smoke test
npm test
```

---

## 🏗️ Architecture

```
pi-video-cua/
├── bin/
│   └── pi-video-cua-helper.exe       # High-performance native Windows helper
├── helper/                           # Rust source for Win32 SendInput & Desktop Duplication
│   ├── Cargo.toml
│   └── src/
│       ├── capture.rs                # GDI/DXGI capture + cursor blending + DPI scaling
│       ├── input.rs                  # SendInput mouse, keyboard & smooth drag interpolation
│       ├── recorder.rs               # FFmpeg screen & WASAPI audio loopback recorder
│       ├── protocol.rs               # Stdio JSON-RPC protocol definition
│       └── main.rs                   # Event loop
├── src/                              # TypeScript Pi extension wrapper
│   ├── index.ts                      # Tool exports & Pi extension entry point
│   ├── helper-client.ts              # Process manager & JSON-RPC client
│   ├── types.ts                      # Tool arguments & multimodal response types
│   └── tools/                        # 9 individual tool modules
└── test/
    └── smoke-test.ts                 # End-to-end integration test
```

---

## 📄 License
MIT
