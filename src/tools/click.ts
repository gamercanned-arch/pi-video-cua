import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
import { ClickArgs, PiTool } from "../types.js";

export const clickTool: PiTool<ClickArgs> = {
  name: "click",
  description:
    "[Requires active CUA session started via 'start_session'] Clicks at current mouse cursor position without moving it. Supports single, double, and triple click ('left', 'right', 'middle') with configurable UI settling delay before capturing the verification screenshot.",
  parameters: {
    type: "object",
    properties: {
      button: {
        type: "string",
        enum: ["left", "right", "middle"],
        default: "left",
        description: "Mouse button to click ('left', 'right', or 'middle'). Default is 'left'.",
      },
      click_type: {
        type: "string",
        enum: ["single", "double", "triple"],
        default: "single",
        description: "Click action type: 'single', 'double', or 'triple'. Default is 'single'.",
      },
      double_click: {
        type: "boolean",
        description: "Shorthand flag for double-clicking. Set to true to perform a double click.",
      },
      count: {
        type: "number",
        minimum: 1,
        maximum: 5,
        description: "Explicit number of clicks (1 to 5). Default is 1.",
      },
      delay_ms: {
        type: "number",
        minimum: 0,
        maximum: 5000,
        default: 100,
        description: "Milliseconds to wait after clicking before capturing the verification screenshot (default: 100ms).",
      },
    },
  },
  execute: async (args: ClickArgs) => {
    const client = HelperClient.getInstance();

    if (!SessionManager.getInstance().isActive()) {
      return client.formatErrorResponse(
        new Error(
          "CUA session is not active. For safety, desktop control tools are locked. Call 'start_session' first to begin a desktop session."
        )
      );
    }

    if (args !== undefined && (typeof args !== "object" || args === null)) {
      return client.formatErrorResponse(new Error("Invalid arguments: 'args' must be an object."));
    }
    const btn = args?.button ?? "left";
    if (btn !== "left" && btn !== "right" && btn !== "middle") {
      return client.formatErrorResponse(
        new Error(`Invalid 'button' argument: '${btn}'. Must be 'left', 'right', or 'middle'.`)
      );
    }

    if (
      args?.click_type !== undefined &&
      args.click_type !== "single" &&
      args.click_type !== "double" &&
      args.click_type !== "triple"
    ) {
      return client.formatErrorResponse(
        new Error(`Invalid 'click_type' argument: '${args.click_type}'. Must be 'single', 'double', or 'triple'.`)
      );
    }

    if (args?.count !== undefined) {
      if (typeof args.count !== "number" || isNaN(args.count) || !isFinite(args.count) || args.count < 1 || args.count > 5) {
        return client.formatErrorResponse(
          new Error(`Invalid 'count' argument: must be an integer between 1 and 5. Received: ${args.count}`)
        );
      }
    }

    if (args?.delay_ms !== undefined) {
      if (typeof args.delay_ms !== "number" || isNaN(args.delay_ms) || !isFinite(args.delay_ms) || args.delay_ms < 0) {
        return client.formatErrorResponse(
          new Error(`Invalid 'delay_ms' argument: must be a non-negative number. Received: ${args.delay_ms}`)
        );
      }
    }

    let clickLabel = "Clicked";
    if (args?.count && args.count > 1) {
      clickLabel = `${args.count}x-clicked`;
    } else if (args?.double_click || args?.click_type === "double") {
      clickLabel = "Double-clicked";
    } else if (args?.click_type === "triple") {
      clickLabel = "Triple-clicked";
    }

    try {
      const res = await client.click(args ?? {});
      return client.formatScreenshotResponse(
        res,
        `${clickLabel} ${btn} mouse button at current cursor location (settle: ${Math.max(args?.delay_ms ?? 100, 100)}ms).`
      );
    } catch (err) {
      return client.formatErrorResponse(err);
    }
  },
};
