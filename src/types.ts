/**
 * Screen resolution and DPI scaling metadata.
 */
export interface ScreenDimensions {
  width: number;
  height: number;
  physical_width: number;
  physical_height: number;
  dpi_scale: number;
}

/**
 * Result returned by screen capture operations.
 */
export interface ScreenshotResult {
  success: boolean;
  image_path: string;
  image_base64: string;
  dimensions: ScreenDimensions;
  error?: string;
}

/**
 * Result returned by screen/audio recording operations.
 */
export interface RecordResult {
  success: boolean;
  video_path: string;
  duration: number;
  screenshot?: ScreenshotResult;
  error?: string;
}

/**
 * Normalizes a coordinate to [0.0, 1.0].
 * Gracefully supports both:
 * - Standard [0, 1000] CUA scale (e.g. 500 -> 0.5)
 * - [0.0, 1.0] unit scale (e.g. 0.5 -> 0.5)
 */
export function normalizeCoordinate(val: number): number {
  if (typeof val === "number" && isFinite(val) && val > 1.0 && val <= 1000.0) {
    return val / 1000.0;
  }
  return val;
}

/**
 * Tool Arguments
 */
export interface StartSessionArgs {
  /** Optional description of the goal or workflow for this desktop control session */
  purpose?: string;
}

export interface EndSessionArgs {
  /** Optional summary of accomplishments before closing the session */
  summary?: string;
}

export interface ScreenshotArgs {}

export interface MoveMouseArgs {
  /** Normalized X coordinate between 0.0 (left) and 1.0 (right) */
  x: number;
  /** Normalized Y coordinate between 0.0 (top) and 1.0 (bottom) */
  y: number;
}

export interface ClickArgs {
  /** Mouse button to click: 'left', 'right', or 'middle'. Default: 'left' */
  button?: "left" | "right" | "middle";
}

export interface TypeTextArgs {
  /** Text string to type character-by-character at the current cursor focus */
  text: string;
}

export interface PressKeyArgs {
  /** Single key name (e.g. 'enter', 'tab', 'f1') or combination (e.g. 'ctrl+s', 'ctrl+shift+z', 'alt+tab') */
  key: string;
}

export interface WaitArgs {
  /** Duration to wait in milliseconds */
  ms: number;
}

export interface ScreenRecordArgs {
  /** Duration in seconds to record screen and system audio */
  duration: number;
}

export interface DragArgs {
  /** Starting normalized X coordinate (0.0 to 1.0) */
  x1: number;
  /** Starting normalized Y coordinate (0.0 to 1.0) */
  y1: number;
  /** Ending normalized X coordinate (0.0 to 1.0) */
  x2: number;
  /** Ending normalized Y coordinate (0.0 to 1.0) */
  y2: number;
  /** Optional keyboard modifiers to hold during drag (e.g. ['alt'], ['shift'], ['ctrl']) */
  modifiers?: string[];
}

export interface ScrollArgs {
  /** Normalized X coordinate to scroll at (0.0 to 1.0) */
  x: number;
  /** Normalized Y coordinate to scroll at (0.0 to 1.0) */
  y: number;
  /** Scroll direction: 'up', 'down', 'left', or 'right' */
  direction: "up" | "down" | "left" | "right";
  /** Number of scroll steps (default: 3) */
  amount?: number;
}

/**
 * Formatted multimodal response object for Pi agents.
 */
export interface PiToolResponse {
  content: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  >;
  details?: Record<string, unknown>;
  isError?: boolean;
}

/**
 * Pi Tool Definition interface
 */
export interface PiTool<TArgs = any> {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: TArgs) => Promise<PiToolResponse>;
}
