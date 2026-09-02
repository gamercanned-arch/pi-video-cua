import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
export const dragTool = {
    name: "drag",
    description: "[Requires active CUA session started via 'start_session'] Performs a smooth mouse drag operation from (x1, y1) to (x2, y2) using normalized coordinates (0.0 to 1.0) with optional modifier keys (e.g. ['alt'], ['shift']). Presses the modifiers and left button at start, interpolates smooth movement, releases at end, and returns a screenshot. Ideal for dragging timeline clips, Alt-drag duplicating clips, trimming edit points, and moving effects in DaVinci Resolve.",
    parameters: {
        type: "object",
        properties: {
            x1: {
                type: "number",
                description: "Starting normalized X coordinate (0.0 to 1.0)",
                minimum: 0.0,
                maximum: 1.0,
            },
            y1: {
                type: "number",
                description: "Starting normalized Y coordinate (0.0 to 1.0)",
                minimum: 0.0,
                maximum: 1.0,
            },
            x2: {
                type: "number",
                description: "Ending normalized X coordinate (0.0 to 1.0)",
                minimum: 0.0,
                maximum: 1.0,
            },
            y2: {
                type: "number",
                description: "Ending normalized Y coordinate (0.0 to 1.0)",
                minimum: 0.0,
                maximum: 1.0,
            },
            modifiers: {
                type: "array",
                items: {
                    type: "string",
                },
                description: "Optional keyboard modifier keys to hold down during the drag (e.g. ['alt'], ['shift'], ['ctrl']). Useful for Alt-drag duplicating clips or constraint dragging.",
            },
        },
        required: ["x1", "y1", "x2", "y2"],
    },
    execute: async (args) => {
        const client = HelperClient.getInstance();
        if (!SessionManager.getInstance().isActive()) {
            return client.formatErrorResponse(new Error("CUA session is not active. For safety, desktop control tools are locked. Call 'start_session' first to begin a desktop session."));
        }
        if (!args || typeof args !== "object") {
            return client.formatErrorResponse(new Error("Invalid arguments: expected an object with x1, y1, x2, y2 coordinates."));
        }
        const { x1, y1, x2, y2, modifiers } = args;
        for (const [name, val] of [
            ["x1", x1],
            ["y1", y1],
            ["x2", x2],
            ["y2", y2],
        ]) {
            if (typeof val !== "number" || isNaN(val) || !isFinite(val) || val < 0.0 || val > 1.0) {
                return client.formatErrorResponse(new Error(`Invalid '${name}' coordinate: must be a finite number between 0.0 and 1.0. Received: ${val}`));
            }
        }
        if (modifiers !== undefined) {
            if (!Array.isArray(modifiers) ||
                !modifiers.every((m) => typeof m === "string" && m.trim().length > 0)) {
                return client.formatErrorResponse(new Error("Invalid 'modifiers' argument: must be an array of non-empty strings (e.g. ['alt'], ['shift'])."));
            }
        }
        try {
            const res = await client.drag(args);
            const modStr = modifiers && modifiers.length > 0 ? ` with [${modifiers.join("+")}]` : "";
            return client.formatScreenshotResponse(res, `Dragged mouse${modStr} from (${x1.toFixed(4)}, ${y1.toFixed(4)}) to (${x2.toFixed(4)}, ${y2.toFixed(4)}).`);
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
//# sourceMappingURL=drag.js.map