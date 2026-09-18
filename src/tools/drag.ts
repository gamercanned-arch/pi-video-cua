import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
import { DragArgs, PiTool, resolvePoint } from "../types.js";

export const dragTool: PiTool<DragArgs> = {
  name: "drag",
  description:
    "[Requires active CUA session started via 'start_session'] Performs a smooth mouse drag operation from start (x1, y1) to end (x2, y2). Supports: (1) button selection: 'left' (default), 'middle' (essential for Blender Viewport Orbit & Pan), or 'right' (Blender Lasso select); (2) optional modifier keys (e.g. ['shift'] for Blender Pan, ['alt'] for Resolve duplication); (3) universal coordinates: normalized [0, 1000] scale, unit [0.0, 1.0] scale, or raw screen pixels.",
  parameters: {
    type: "object",
    properties: {
      x1: {
        type: "number",
        description: "Starting X coordinate (normalized [0, 1000], unit [0.0, 1.0], or screen pixel).",
      },
      y1: {
        type: "number",
        description: "Starting Y coordinate (normalized [0, 1000], unit [0.0, 1.0], or screen pixel).",
      },
      x2: {
        type: "number",
        description: "Ending X coordinate (normalized [0, 1000], unit [0.0, 1.0], or screen pixel).",
      },
      y2: {
        type: "number",
        description: "Ending Y coordinate (normalized [0, 1000], unit [0.0, 1.0], or screen pixel).",
      },
      pixel_x1: {
        type: "number",
        description: "Optional explicit raw pixel start X (e.g. 0 to 1920).",
      },
      pixel_y1: {
        type: "number",
        description: "Optional explicit raw pixel start Y (e.g. 0 to 1080).",
      },
      pixel_x2: {
        type: "number",
        description: "Optional explicit raw pixel end X (e.g. 0 to 1920).",
      },
      pixel_y2: {
        type: "number",
        description: "Optional explicit raw pixel end Y (e.g. 0 to 1080).",
      },
      start_coordinate: {
        type: "array",
        items: { type: "number" },
        description: "Optional Anthropic-style start coordinate pair [x, y].",
      },
      end_coordinate: {
        type: "array",
        items: { type: "number" },
        description: "Optional Anthropic-style end coordinate pair [x, y].",
      },
      button: {
        type: "string",
        enum: ["left", "middle", "right"],
        description:
          "Mouse button to hold during drag: 'left' (default), 'middle' (Blender Orbit/Pan), or 'right' (Blender Lasso select).",
      },
      modifiers: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          "Optional keyboard modifier keys to hold during drag (e.g. ['shift'] for Pan, ['ctrl'] for Zoom, ['alt'] for duplicate).",
      },
      coordinate_type: {
        type: "string",
        enum: ["pixel", "normalized_1000", "unit"],
        description: "Optional explicit coordinate interpretation mode.",
      },
    },
    required: [],
  },
  execute: async (args: DragArgs) => {
    const client = HelperClient.getInstance();

    if (!SessionManager.getInstance().isActive()) {
      return client.formatErrorResponse(
        new Error(
          "CUA session is not active. For safety, desktop control tools are locked. Call 'start_session' first to begin a desktop session."
        )
      );
    }

    if (!args || typeof args !== "object") {
      return client.formatErrorResponse(
        new Error("Invalid arguments: expected an object with start and end coordinates.")
      );
    }

    const lastDims = client.getLastDimensions();
    const start = resolvePoint(
      {
        x: args.x1,
        y: args.y1,
        pixel_x: args.pixel_x1,
        pixel_y: args.pixel_y1,
        coordinate: args.start_coordinate,
        coordinate_type: args.coordinate_type,
      },
      {
        screenWidth: lastDims?.width,
        screenHeight: lastDims?.height,
      }
    );

    const end = resolvePoint(
      {
        x: args.x2,
        y: args.y2,
        pixel_x: args.pixel_x2,
        pixel_y: args.pixel_y2,
        coordinate: args.end_coordinate,
        coordinate_type: args.coordinate_type,
      },
      {
        screenWidth: lastDims?.width,
        screenHeight: lastDims?.height,
      }
    );

    if (!start || !end) {
      return client.formatErrorResponse(
        new Error(
          `Invalid drag coordinates: provide start (x1, y1) and end (x2, y2), or pixel coordinates, or start_coordinate/end_coordinate. Received: ${JSON.stringify(
            args
          )}`
        )
      );
    }

    const button = args.button || "left";
    if (!["left", "middle", "right"].includes(button)) {
      return client.formatErrorResponse(
        new Error(`Invalid 'button' parameter: expected 'left', 'middle', or 'right'. Received: '${button}'`)
      );
    }

    const { modifiers } = args;
    if (modifiers !== undefined) {
      if (
        !Array.isArray(modifiers) ||
        !modifiers.every((m) => typeof m === "string" && m.trim().length > 0)
      ) {
        return client.formatErrorResponse(
          new Error(
            "Invalid 'modifiers' argument: must be an array of non-empty strings (e.g. ['alt'], ['shift'])."
          )
        );
      }
    }

    try {
      const res = await client.drag({
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        button,
        modifiers,
      });
      const modStr = modifiers && modifiers.length > 0 ? ` with [${modifiers.join("+")}]` : "";
      return client.formatScreenshotResponse(
        res,
        `Dragged mouse (${button} button)${modStr} from (${start.x.toFixed(4)}, ${start.y.toFixed(4)}) to (${end.x.toFixed(
          4
        )}, ${end.y.toFixed(4)}).`
      );
    } catch (err) {
      return client.formatErrorResponse(err);
    }
  },
};
