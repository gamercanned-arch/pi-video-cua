import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
import { normalizeCoordinate } from "../types.js";
export const scrollTool = {
    name: "scroll",
    description: "[Requires active CUA session started via 'start_session'] Positions the mouse at coordinates (x, y) and scrolls in the specified direction ('up', 'down', 'left', or 'right') by the specified amount (default: 3). Supports standard [0, 1000] integer scale or [0.0, 1.0] unit scale. Returns a screenshot.",
    parameters: {
        type: "object",
        properties: {
            x: {
                type: "number",
                description: "X coordinate (0 to 1000 standard scale or 0.0 to 1.0 unit scale) to position cursor before scrolling",
                minimum: 0.0,
                maximum: 1000.0,
            },
            y: {
                type: "number",
                description: "Y coordinate (0 to 1000 standard scale or 0.0 to 1.0 unit scale) to position cursor before scrolling",
                minimum: 0.0,
                maximum: 1000.0,
            },
            direction: {
                type: "string",
                enum: ["up", "down", "left", "right"],
                description: "Scroll direction ('up', 'down', 'left', or 'right')",
            },
            amount: {
                type: "number",
                description: "Number of scroll notches/steps (default: 3)",
                default: 3,
                minimum: 1,
            },
        },
        required: ["x", "y", "direction"],
    },
    execute: async (args) => {
        const client = HelperClient.getInstance();
        if (!SessionManager.getInstance().isActive()) {
            return client.formatErrorResponse(new Error("CUA session is not active. For safety, desktop control tools are locked. Call 'start_session' first to begin a desktop session."));
        }
        if (!args || typeof args !== "object") {
            return client.formatErrorResponse(new Error("Invalid arguments: expected an object with x, y, and direction."));
        }
        const { x, y, direction, amount } = args;
        if (typeof x !== "number" || isNaN(x) || !isFinite(x) || x < 0.0 || x > 1000.0) {
            return client.formatErrorResponse(new Error(`Invalid 'x' coordinate: must be a finite number between 0 and 1000 (or 0.0 and 1.0). Received: ${x}`));
        }
        if (typeof y !== "number" || isNaN(y) || !isFinite(y) || y < 0.0 || y > 1000.0) {
            return client.formatErrorResponse(new Error(`Invalid 'y' coordinate: must be a finite number between 0 and 1000 (or 0.0 and 1.0). Received: ${y}`));
        }
        const validDirections = ["up", "down", "left", "right"];
        if (typeof direction !== "string" || !validDirections.includes(direction.toLowerCase())) {
            return client.formatErrorResponse(new Error(`Invalid 'direction' argument: '${direction}'. Must be one of: ${validDirections.join(", ")}`));
        }
        if (amount !== undefined) {
            if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount) || amount < 1) {
                return client.formatErrorResponse(new Error(`Invalid 'amount' argument: must be a positive number >= 1. Received: ${amount}`));
            }
        }
        const normX = normalizeCoordinate(x);
        const normY = normalizeCoordinate(y);
        const scrollAmount = amount ?? 3;
        const normalizedDir = direction.toLowerCase();
        try {
            const res = await client.scroll({
                x: normX,
                y: normY,
                direction: normalizedDir,
                amount: scrollAmount,
            });
            return client.formatScreenshotResponse(res, `Scrolled ${normalizedDir} by ${scrollAmount} steps at (${normX.toFixed(4)}, ${normY.toFixed(4)}).`);
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
