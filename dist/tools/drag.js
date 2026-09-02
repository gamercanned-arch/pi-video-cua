import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
import { normalizeCoordinate } from "../types.js";
export const dragTool = {
    name: "drag",
    description: "[Requires active CUA session started via 'start_session'] Performs a smooth mouse drag operation from (x1, y1) to (x2, y2) with optional modifier keys (e.g. ['alt'], ['shift']). Supports standard [0, 1000] integer scale or [0.0, 1.0] unit scale. Presses modifiers and left button at start, interpolates smooth movement, releases at end, and returns a screenshot.",
    parameters: {
        type: "object",
        properties: {
            x1: {
                type: "number",
                description: "Starting X coordinate (0 to 1000 standard scale or 0.0 to 1.0 unit scale)",
                minimum: 0.0,
                maximum: 1000.0,
            },
            y1: {
                type: "number",
                description: "Starting Y coordinate (0 to 1000 standard scale or 0.0 to 1.0 unit scale)",
                minimum: 0.0,
                maximum: 1000.0,
            },
            x2: {
                type: "number",
                description: "Ending X coordinate (0 to 1000 standard scale or 0.0 to 1.0 unit scale)",
                minimum: 0.0,
                maximum: 1000.0,
            },
            y2: {
                type: "number",
                description: "Ending Y coordinate (0 to 1000 standard scale or 0.0 to 1.0 unit scale)",
                minimum: 0.0,
                maximum: 1000.0,
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
            if (typeof val !== "number" || isNaN(val) || !isFinite(val) || val < 0.0 || val > 1000.0) {
                return client.formatErrorResponse(new Error(`Invalid '${name}' coordinate: must be a finite number between 0 and 1000 (or 0.0 and 1.0). Received: ${val}`));
            }
        }
        if (modifiers !== undefined) {
            if (!Array.isArray(modifiers) ||
                !modifiers.every((m) => typeof m === "string" && m.trim().length > 0)) {
                return client.formatErrorResponse(new Error("Invalid 'modifiers' argument: must be an array of non-empty strings (e.g. ['alt'], ['shift'])."));
            }
        }
        const normX1 = normalizeCoordinate(x1);
        const normY1 = normalizeCoordinate(y1);
        const normX2 = normalizeCoordinate(x2);
        const normY2 = normalizeCoordinate(y2);
        try {
            const res = await client.drag({
                x1: normX1,
                y1: normY1,
                x2: normX2,
                y2: normY2,
                modifiers,
            });
            const modStr = modifiers && modifiers.length > 0 ? ` with [${modifiers.join("+")}]` : "";
            return client.formatScreenshotResponse(res, `Dragged mouse${modStr} from (${normX1.toFixed(4)}, ${normY1.toFixed(4)}) to (${normX2.toFixed(4)}, ${normY2.toFixed(4)}).`);
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
//# sourceMappingURL=drag.js.map