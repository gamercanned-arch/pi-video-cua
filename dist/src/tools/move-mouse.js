import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
import { normalizeCoordinate } from "../types.js";
export const moveMouseTool = {
    name: "move_mouse",
    description: "[Requires active CUA session started via 'start_session'] Moves the mouse cursor to normalized (x, y) coordinates on the screen and returns a screenshot showing the cursor's new position for visual verification. Supports standard [0, 1000] integer scale (e.g. 500 is center) or [0.0, 1.0] unit scale (e.g. 0.5 is center).",
    parameters: {
        type: "object",
        properties: {
            x: {
                type: "number",
                description: "Normalized X coordinate (0 to 1000 standard scale or 0.0 to 1.0 unit scale)",
                minimum: 0.0,
                maximum: 1000.0,
            },
            y: {
                type: "number",
                description: "Normalized Y coordinate (0 to 1000 standard scale or 0.0 to 1.0 unit scale)",
                minimum: 0.0,
                maximum: 1000.0,
            },
        },
        required: ["x", "y"],
    },
    execute: async (args) => {
        const client = HelperClient.getInstance();
        if (!SessionManager.getInstance().isActive()) {
            return client.formatErrorResponse(new Error("CUA session is not active. For safety, desktop control tools are locked. Call 'start_session' first to begin a desktop session."));
        }
        if (!args || typeof args !== "object") {
            return client.formatErrorResponse(new Error("Invalid arguments: expected an object with x and y coordinates."));
        }
        const { x, y } = args;
        if (typeof x !== "number" || isNaN(x) || !isFinite(x) || x < 0.0 || x > 1000.0) {
            return client.formatErrorResponse(new Error(`Invalid 'x' coordinate: must be a finite number between 0 and 1000 (or 0.0 and 1.0). Received: ${x}`));
        }
        if (typeof y !== "number" || isNaN(y) || !isFinite(y) || y < 0.0 || y > 1000.0) {
            return client.formatErrorResponse(new Error(`Invalid 'y' coordinate: must be a finite number between 0 and 1000 (or 0.0 and 1.0). Received: ${y}`));
        }
        const normX = normalizeCoordinate(x);
        const normY = normalizeCoordinate(y);
        try {
            const res = await client.moveMouse({ x: normX, y: normY });
            return client.formatScreenshotResponse(res, `Cursor moved to position (${normX.toFixed(4)}, ${normY.toFixed(4)}).`);
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
