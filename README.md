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
- **Session-Guarded Safety**: Desktop interaction tools (mouse, keyboard, recording) are locked by default. An agent must explicitly call `start_session` to open a session. Upon calling `start_session`, the agent receives the complete operational playbook and an immediate desktop screenshot. When finished, `end_session` locks the tools again.

---

## 🛠️ The Agent Tools (Session-Guarded)

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| 🛡️ `start_session` | `purpose?` | **REQUIRED FIRST STEP**. Opens the CUA session, unlocks desktop control tools, captures the initial screen, and delivers operational instructions & application shortcuts. |
| `screenshot` | *(none)* | Captures the entire primary display with cursor overlay and returns image + resolution metadata. *(Guarded)* |
| `move_mouse` | `x`, `y`, `pixel_x?`, `pixel_y?`, `coordinate?` | Moves cursor to position and returns a screenshot to verify cursor placement. Accepts normalized, raw pixels, or `[x, y]`. *(Guarded)* |
| `click` | `button?`, `click_type?`, `double_click?`, `count?`, `delay_ms?` | Clicks at current cursor position (`"left"`, `"right"`, `"middle"`). Supports single, double, and triple clicks with configurable UI settle delay. Returns resulting screenshot. *(Guarded)* |
| `type_text` | `text` | Injects Unicode characters into the currently focused text field character-by-character. *(Guarded)* |
| `press_key` | `key` | Presses single keys (`enter`, `space`, `tab`, `b`, `a`, `[`, `]`, `\`) or combos (`ctrl+s`, `ctrl+b`, `alt+tab`). *(Guarded)* |
| `wait` | `ms` | Waits specified milliseconds (for render completion, animations, or playback) and returns fresh screenshot. *(Guarded)* |
| `screen_record` | `duration` | Records screen & system audio via FFmpeg for specified duration (seconds). Returns video path & end screenshot. *(Guarded)* |
| `drag` | `x1`, `y1`, `x2`, `y2`, `button?`, `modifiers?` | Smooth interpolated drag movement. Supports `"left"` (default), `"middle"` (Blender Orbit/Pan), and `"right"` (Blender Lasso) buttons, plus modifiers (e.g. `["shift"]`, `["ctrl"]`, `["alt"]`). *(Guarded)* |
| `scroll` | `direction`, `amount?`, `x?`, `y?` | Simulates vertical (`"up"`/`"down"`) or horizontal (`"left"`/`"right"`) wheel scrolling. When `x` and `y` are omitted, scrolls in-place at current cursor location. *(Guarded)* |
| 🔒 `end_session` | `summary?` | Concludes active CUA session, releases held keys/buttons, terminates helper process, and locks all desktop interaction tools. |

---

## 📐 Universal Coordinate Resolver

Designed to eliminate coordinate confusion across heterogeneous CUA vision models (Gemini, Claude 3.5/3.7, OpenAI Operator, Qwen-VL, UI-TARS), `pi-video-cua` accepts coordinates in **any** representation:

1. **Normalized `[0, 1000]` Scale** (Gemini / UI-TARS native):
   `{ x: 500, y: 500 }` represents screen center.
2. **Normalized Unit Float `[0.0, 1.0]` Scale**:
   `{ x: 0.5, y: 0.5 }` represents screen center.
3. **Explicit Raw Screen Pixels** (OpenAI / Claude Computer-Use):
   `{ pixel_x: 960, pixel_y: 540 }` directly targets exact screen pixels.
4. **Anthropic Coordinate Tuple**:
   `{ coordinate: [960, 540] }` or normalized `{ coordinate: [500, 500] }`.
5. **Automatic Raw Pixel Detection**:
   If an agent passes standard `{ x, y }` with values $> 1000$ (e.g. `{ x: 1440, y: 900 }` on a 1920x1080 display), the resolver detects raw pixel values and automatically normalizes them using the primary monitor's dimensions instead of throwing an out-of-bounds error.

$$\text{Pixel } X = x_{\text{norm}} \times (\text{Width} - 1)$$
$$\text{Pixel } Y = y_{\text{norm}} \times (\text{Height} - 1)$$

---

## 🎨 Blender 3D Operational Playbook

`pi-video-cua` provides native primitives for Blender 3D viewport navigation and modal workflows:

### 1. Viewport Orbit (Middle-Mouse Drag)
```typescript
// Click and drag with Middle Mouse Button to rotate 3D viewport
await drag({
  x1: 500,
  y1: 500,
  x2: 650,
  y2: 450,
  button: "middle"
});
```

### 2. Viewport Pan (Shift + Middle-Mouse Drag)
```typescript
// Hold Shift while dragging MMB to pan 3D viewport
await drag({
  x1: 500,
  y1: 500,
  x2: 400,
  y2: 500,
  button: "middle",
  modifiers: ["shift"]
});
```

### 3. Dolly Zoom & In-Place Scrolling
```typescript
// Zoom in/out without moving the mouse pointer away from the active region
await scroll({
  direction: "up",
  amount: 3
});

// Or smooth Dolly Zoom via Ctrl + MMB
await drag({
  x1: 500,
  y1: 500,
  x2: 500,
  y2: 400,
  button: "middle",
  modifiers: ["ctrl"]
});
```

### 4. Lasso Selection (Right-Mouse Drag)
```typescript
// Lasso select vertices, edges, faces, or objects with RMB drag
await drag({
  x1: 300,
  y1: 300,
  x2: 700,
  y2: 700,
  button: "right"
});
```

### 5. Modal Transformations (Grab / Rotate / Scale)
```typescript
// 1. Move to object and select
await move_mouse({ x: 500, y: 500 });
await click({ button: "left" });

// 2. Trigger Grab (G) and constrain to Z axis by 2 units
await press_key({ key: "g" });
await press_key({ key: "z" });
await type_text({ text: "2" });
await press_key({ key: "enter" });
```

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
// In-place scroll over timeline to zoom in
await scroll({
  direction: "up",
  amount: 4
});
```

---

## 📦 Installation & Setup

### Installing in Pi

```bash
pi install git:https://github.com/gamercanned-arch/pi-video-cua
```

or via npm:

```bash
npm install git+https://github.com/gamercanned-arch/pi-video-cua.git
```

### Building from Source

**Requirements:**
- Windows 10/11 x64
- Node.js 18+ & npm
- Rust toolchain (`cargo` / `rustc`)
- FFmpeg on system `PATH` (or `FFMPEG_PATH` environment variable)

```bash
# 1. Clone repository
git clone https://github.com/gamercanned-arch/pi-video-cua.git
cd pi-video-cua

# 2. Install dependencies & build native helper + TypeScript
npm install
npm run build

# 3. Run smoke test
npm test
```

---

### Using as an MCP Server (Antigravity, Claude Desktop, Cursor)

`pi-video-cua` provides a full **Model Context Protocol (MCP)** server interface running over standard I/O (stdio). All 11 CUA tools are accessible with multimodal image feedback.

#### Automatic Registration in Antigravity
Run the registration script:
```bash
npm run register:antigravity
```
This directly adds `pi-video-cua` to `~/.gemini/antigravity/mcp_config.json`.

#### Manual MCP Configuration (Claude Desktop / Antigravity / Cursor)
Add to your client's MCP configuration JSON:
```json
{
  "mcpServers": {
    "pi-video-cua": {
      "command": "node",
      "args": [
        "c:/Users/abhik/Documents/antigravity/calm-bose/dist/mcp-server.js"
      ]
    }
  }
}
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
