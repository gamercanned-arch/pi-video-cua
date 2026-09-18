import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
import { resolvePoint } from "../types.js";
export const moveMouseTool = {
    name: "move_mouse",
    description: "[Requires active CUA session started via 'start_session'] Moves the mouse cursor to (x, y) coordinates on the screen and returns a screenshot showing the cursor's position for visual verification. Universally supports: (1) normalized [0, 1000] integer scale (e.g. 500 is center), (2) unit [0.0, 1.0] scale (e.g. 0.5 is center), (3) raw screen pixel coordinates (e.g. pixel_x: 960, pixel_y: 540 or auto-detected x > 1000), or (4) Anthropic-style coordinate: [x, y].",
    parameters: {
        type: "object",
        properties: {
            x: {
                type: "number",
                description: "X coordinate. Accepts normalized [0, 1000] scale, unit [0.0, 1.0] scale, or raw screen pixels [0, screen_width].",
            },
            y: {
                type: "number",
                description: "Y coordinate. Accepts normalized [0, 1000] scale, unit [0.0, 1.0] scale, or raw screen pixels [0, screen_height].",
            },
            pixel_x: {
                type: "number",
                description: "Optional explicit raw screen pixel X coordinate (e.g. 0 to 1920).",
            },
            pixel_y: {
                type: "number",
                description: "Optional explicit raw screen pixel Y coordinate (e.g. 0 to 1080).",
            },
            coordinate: {
                type: "array",
                items: { type: "number" },
                description: "Optional Anthropic-style [x, y] coordinate pair (pixels or normalized).",
            },
            coordinate_type: {
                type: "string",
                enum: ["pixel", "normalized_1000", "unit"],
                description: "Optional explicit coordinate interpretation mode.",
            },
        },
        required: [],
    },
    execute: async (args) => {
        const client = HelperClient.getInstance();
        if (!SessionManager.getInstance().isActive()) {
            return client.formatErrorResponse(new Error("CUA session is not active. For safety, desktop control tools are locked. Call 'start_session' first to begin a desktop session."));
        }
        if (!args || typeof args !== "object") {
            return client.formatErrorResponse(new Error("Invalid arguments: expected an object with coordinates (e.g. { x, y } or { pixel_x, pixel_y })."));
        }
        const lastDims = client.getLastDimensions();
        const pt = resolvePoint(args, {
            screenWidth: lastDims?.width,
            screenHeight: lastDims?.height,
        });
        if (!pt) {
            return client.formatErrorResponse(new Error(`Invalid coordinates: provide 'x' and 'y' (0-1000, 0-1, or raw pixels), or 'pixel_x'/'pixel_y', or 'coordinate: [x, y]'. Received: ${JSON.stringify(args)}`));
        }
        try {
            const res = await client.moveMouse(pt);
            const px = Math.round(pt.x * (res.dimensions.width - 1));
            const py = Math.round(pt.y * (res.dimensions.height - 1));
            return client.formatScreenshotResponse(res, `Cursor moved to normalized (${pt.x.toFixed(4)}, ${pt.y.toFixed(4)}) [Screen pixel: ${px}, ${py}].`);
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
