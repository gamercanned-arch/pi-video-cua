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
 * Gracefully supports:
 * - Standard [0, 1000] CUA scale (e.g. 500 -> 0.5)
 * - [0.0, 1.0] unit scale (e.g. 0.5 -> 0.5)
 * - Raw screen pixel scale (> 1000 or with explicit screen dimension)
 */
export function normalizeCoordinate(val: number, screenDimension?: number): number {
  if (typeof val === "number" && isFinite(val)) {
    if (val > 1000.0 && screenDimension && screenDimension > 0) {
      return Math.max(0.0, Math.min(1.0, val / screenDimension));
    }
    if (val > 1.0 && val <= 1000.0) {
      return Math.max(0.0, Math.min(1.0, val / 1000.0));
    }
    return Math.max(0.0, Math.min(1.0, val));
  }
  return val;
}

export interface CoordinateResolutionOptions {
  screenWidth?: number;
  screenHeight?: number;
}

/**
 * Universal Coordinate Resolver for CUA models.
 * Accepts:
 * - Normalized [0, 1000] integer coordinates (Gemini / UI-TARS)
 * - Unit [0.0, 1.0] float coordinates
 * - Raw screen pixel coordinates (Claude 3.5/3.7, OpenAI Operator, OSWorld)
 * - Anthropic-style coordinate pair [x, y]
 */
export function resolvePoint(
  args: {
    x?: number;
    y?: number;
    pixel_x?: number;
    pixel_y?: number;
    coordinate?: [number, number];
    coordinate_type?: "pixel" | "normalized_1000" | "unit";
  },
  options: CoordinateResolutionOptions = {}
): { x: number; y: number } | null {
  const screenWidth = options.screenWidth || 1920;
  const screenHeight = options.screenHeight || 1080;

  let rawX: number | undefined = args.pixel_x;
  let rawY: number | undefined = args.pixel_y;
  const isExplicitPixel = rawX !== undefined && rawY !== undefined;

  if (rawX === undefined && rawY === undefined) {
    if (Array.isArray(args.coordinate) && args.coordinate.length >= 2) {
      rawX = args.coordinate[0];
      rawY = args.coordinate[1];
    } else {
      rawX = args.x;
      rawY = args.y;
    }
  }

  if (
    typeof rawX !== "number" ||
    typeof rawY !== "number" ||
    isNaN(rawX) ||
    isNaN(rawY) ||
    !isFinite(rawX) ||
    !isFinite(rawY)
  ) {
    return null;
  }

  // Raw pixel mode (explicit pixel parameter, coordinate_type="pixel", or auto-detected > 1000)
  if (isExplicitPixel || args.coordinate_type === "pixel" || rawX > 1000.0 || rawY > 1000.0) {
    const normX = Math.max(0.0, Math.min(1.0, rawX / screenWidth));
    const normY = Math.max(0.0, Math.min(1.0, rawY / screenHeight));
    return { x: normX, y: normY };
  }

  // Unit scale [0.0, 1.0]
  if (args.coordinate_type === "unit" || (rawX <= 1.0 && rawY <= 1.0 && args.coordinate_type !== "normalized_1000")) {
    const normX = Math.max(0.0, Math.min(1.0, rawX));
    const normY = Math.max(0.0, Math.min(1.0, rawY));
    return { x: normX, y: normY };
  }

  // Default normalized [0, 1000] scale
  const normX = Math.max(0.0, Math.min(1.0, rawX / 1000.0));
  const normY = Math.max(0.0, Math.min(1.0, rawY / 1000.0));
  return { x: normX, y: normY };
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
  /** Normalized X coordinate: [0, 1000] standard scale or [0.0, 1.0] unit scale */
  x?: number;
  /** Normalized Y coordinate: [0, 1000] standard scale or [0.0, 1.0] unit scale */
  y?: number;
  /** Optional raw screen pixel X coordinate (e.g. 0 to 1920) */
  pixel_x?: number;
  /** Optional raw screen pixel Y coordinate (e.g. 0 to 1080) */
  pixel_y?: number;
  /** Anthropic-style coordinate pair: [x, y] */
  coordinate?: [number, number];
  /** Explicit coordinate type: 'pixel' | 'normalized_1000' | 'unit' */
  coordinate_type?: "pixel" | "normalized_1000" | "unit";
}

export interface ClickArgs {
  /** Mouse button to click: 'left', 'right', or 'middle'. Default: 'left' */
  button?: "left" | "right" | "middle";
  /** Click action type: 'single', 'double', or 'triple'. Default: 'single' */
  click_type?: "single" | "double" | "triple";
  /** Shorthand flag for double-clicking. If true, performs a double-click */
  double_click?: boolean;
  /** Explicit number of clicks (1 to 5). Default: 1 */
  count?: number;
  /** Milliseconds to wait after clicking before capturing the verification screenshot (default: 100ms) */
  delay_ms?: number;
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
  /** Starting normalized X coordinate (0 to 1000 or 0.0 to 1.0) */
  x1?: number;
  /** Starting normalized Y coordinate (0 to 1000 or 0.0 to 1.0) */
  y1?: number;
  /** Ending normalized X coordinate (0 to 1000 or 0.0 to 1.0) */
  x2?: number;
  /** Ending normalized Y coordinate (0 to 1000 or 0.0 to 1.0) */
  y2?: number;
  /** Optional raw pixel start X */
  pixel_x1?: number;
  /** Optional raw pixel start Y */
  pixel_y1?: number;
  /** Optional raw pixel end X */
  pixel_x2?: number;
  /** Optional raw pixel end Y */
  pixel_y2?: number;
  /** Anthropic-style start coordinate [x, y] */
  start_coordinate?: [number, number];
  /** Anthropic-style end coordinate [x, y] */
  end_coordinate?: [number, number];
  /** Mouse button to drag with: 'left' (default), 'middle' (Blender Orbit/Pan), 'right' (Blender Lasso) */
  button?: "left" | "middle" | "right";
  /** Optional keyboard modifiers to hold during drag (e.g. ['alt'], ['shift'], ['ctrl']) */
  modifiers?: string[];
  /** Explicit coordinate type: 'pixel' | 'normalized_1000' | 'unit' */
  coordinate_type?: "pixel" | "normalized_1000" | "unit";
}

export interface ScrollArgs {
  /** Optional X coordinate to scroll at. If omitted, scrolls at current cursor position */
  x?: number;
  /** Optional Y coordinate to scroll at. If omitted, scrolls at current cursor position */
  y?: number;
  /** Optional raw screen pixel X */
  pixel_x?: number;
  /** Optional raw screen pixel Y */
  pixel_y?: number;
  /** Anthropic-style coordinate pair: [x, y] */
  coordinate?: [number, number];
  /** Scroll direction: 'up', 'down', 'left', or 'right' */
  direction: "up" | "down" | "left" | "right";
  /** Number of scroll steps (default: 3) */
  amount?: number;
  /** Explicit coordinate type: 'pixel' | 'normalized_1000' | 'unit' */
  coordinate_type?: "pixel" | "normalized_1000" | "unit";
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
