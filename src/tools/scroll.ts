import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
import { PiTool, ScrollArgs, resolvePoint } from "../types.js";

export const scrollTool: PiTool<ScrollArgs> = {
  name: "scroll",
  description:
    "[Requires active CUA session started via 'start_session'] Scrolls the mouse wheel in the specified direction ('up', 'down', 'left', or 'right') by the specified amount (default: 3). Coordinates (x, y) are optional: if omitted, scrolls in-place at the current cursor position (essential for zooming timelines or adjusting modal brush sizes in Blender). If coordinates are provided, supports normalized [0, 1000] scale, unit [0.0, 1.0] scale, or raw screen pixels.",
  parameters: {
    type: "object",
    properties: {
      direction: {
        type: "string",
        enum: ["up", "down", "left", "right"],
        description: "Scroll direction: 'up', 'down', 'left', or 'right'.",
      },
      amount: {
        type: "number",
        description: "Number of scroll notches/steps (default: 3).",
        default: 3,
        minimum: 1,
      },
      x: {
        type: "number",
        description: "Optional X coordinate to move cursor before scrolling (normalized [0, 1000], [0.0, 1.0], or raw pixel).",
      },
      y: {
        type: "number",
        description: "Optional Y coordinate to move cursor before scrolling (normalized [0, 1000], [0.0, 1.0], or raw pixel).",
      },
      pixel_x: {
        type: "number",
        description: "Optional raw screen pixel X coordinate.",
      },
      pixel_y: {
        type: "number",
        description: "Optional raw screen pixel Y coordinate.",
      },
      coordinate: {
        type: "array",
        items: { type: "number" },
        description: "Optional Anthropic-style [x, y] coordinate pair.",
      },
      coordinate_type: {
        type: "string",
        enum: ["pixel", "normalized_1000", "unit"],
        description: "Optional explicit coordinate interpretation mode.",
      },
    },
    required: ["direction"],
  },
  execute: async (args: ScrollArgs) => {
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
        new Error("Invalid arguments: expected an object with 'direction' (e.g. { direction: 'up' }).")
      );
    }

    const { direction, amount } = args;

    const validDirections = ["up", "down", "left", "right"];
    if (typeof direction !== "string" || !validDirections.includes(direction.toLowerCase())) {
      return client.formatErrorResponse(
        new Error(
          `Invalid 'direction' argument: '${direction}'. Must be one of: ${validDirections.join(", ")}`
        )
      );
    }

    if (amount !== undefined) {
      if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount) || amount < 1) {
        return client.formatErrorResponse(
          new Error(`Invalid 'amount' argument: must be a positive number >= 1. Received: ${amount}`)
        );
      }
    }

    let targetPoint: { x: number; y: number } | undefined = undefined;
    const hasCoordinates =
      args.x !== undefined ||
      args.y !== undefined ||
      args.pixel_x !== undefined ||
      args.pixel_y !== undefined ||
      args.coordinate !== undefined;

    if (hasCoordinates) {
      const lastDims = client.getLastDimensions();
      const pt = resolvePoint(
        {
          x: args.x,
          y: args.y,
          pixel_x: args.pixel_x,
          pixel_y: args.pixel_y,
          coordinate: args.coordinate,
          coordinate_type: args.coordinate_type,
        },
        {
          screenWidth: lastDims?.width,
          screenHeight: lastDims?.height,
        }
      );

      if (!pt) {
        return client.formatErrorResponse(
          new Error(
            `Invalid scroll coordinates: expected valid x and y or pixel coordinates. Received: ${JSON.stringify(
              args
            )}`
          )
        );
      }
      targetPoint = pt;
    }

    const scrollAmount = amount ?? 3;
    const normalizedDir = direction.toLowerCase() as "up" | "down" | "left" | "right";

    try {
      const res = await client.scroll({
        x: targetPoint?.x,
        y: targetPoint?.y,
        direction: normalizedDir,
        amount: scrollAmount,
      });

      const locStr = targetPoint
        ? ` at (${targetPoint.x.toFixed(4)}, ${targetPoint.y.toFixed(4)})`
        : " in-place at current position";

      return client.formatScreenshotResponse(
        res,
        `Scrolled ${normalizedDir} by ${scrollAmount} steps${locStr}.`
      );
    } catch (err) {
      return client.formatErrorResponse(err);
    }
  },
};
