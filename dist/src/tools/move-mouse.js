import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
export const moveMouseTool = {
    name: "move_mouse",
    description: "[Requires active CUA session started via 'start_session'] Moves the mouse cursor to normalized (x, y) coordinates (0.0 to 1.0) on the screen and returns a screenshot showing the cursor's new position for visual verification.",
    parameters: {
        type: "object",
        properties: {
            x: {
                type: "number",
                description: "Normalized X coordinate from 0.0 (left edge) to 1.0 (right edge)",
                minimum: 0.0,
                maximum: 1.0,
            },
            y: {
                type: "number",
                description: "Normalized Y coordinate from 0.0 (top edge) to 1.0 (bottom edge)",
                minimum: 0.0,
                maximum: 1.0,
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
        if (typeof x !== "number" || isNaN(x) || !isFinite(x) || x < 0.0 || x > 1.0) {
            return client.formatErrorResponse(new Error(`Invalid 'x' coordinate: must be a finite number between 0.0 and 1.0. Received: ${x}`));
        }
        if (typeof y !== "number" || isNaN(y) || !isFinite(y) || y < 0.0 || y > 1.0) {
            return client.formatErrorResponse(new Error(`Invalid 'y' coordinate: must be a finite number between 0.0 and 1.0. Received: ${y}`));
        }
        try {
            const res = await client.moveMouse(args);
            return client.formatScreenshotResponse(res, `Cursor moved to normalized position (${x.toFixed(4)}, ${y.toFixed(4)}).`);
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
