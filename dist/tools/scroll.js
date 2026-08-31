import { HelperClient } from "../helper-client.js";
export const scrollTool = {
    name: "scroll",
    description: "Positions the mouse at normalized coordinates (x, y) and scrolls in the specified direction ('up', 'down', 'left', or 'right') by the specified amount (default: 3). Returns a screenshot. Ideal for zooming the DaVinci Resolve timeline, navigating inspector panels, and scrolling media pools.",
    parameters: {
        type: "object",
        properties: {
            x: {
                type: "number",
                description: "Normalized X coordinate (0.0 to 1.0) to position cursor before scrolling",
                minimum: 0.0,
                maximum: 1.0,
            },
            y: {
                type: "number",
                description: "Normalized Y coordinate (0.0 to 1.0) to position cursor before scrolling",
                minimum: 0.0,
                maximum: 1.0,
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
        if (!args || typeof args !== "object") {
            return client.formatErrorResponse(new Error("Invalid arguments: expected an object with x, y, and direction."));
        }
        const { x, y, direction, amount } = args;
        if (typeof x !== "number" || isNaN(x) || !isFinite(x) || x < 0.0 || x > 1.0) {
            return client.formatErrorResponse(new Error(`Invalid 'x' coordinate: must be a finite number between 0.0 and 1.0. Received: ${x}`));
        }
        if (typeof y !== "number" || isNaN(y) || !isFinite(y) || y < 0.0 || y > 1.0) {
            return client.formatErrorResponse(new Error(`Invalid 'y' coordinate: must be a finite number between 0.0 and 1.0. Received: ${y}`));
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
        const scrollAmount = amount ?? 3;
        const normalizedDir = direction.toLowerCase();
        try {
            const res = await client.scroll({
                x,
                y,
                direction: normalizedDir,
                amount: scrollAmount,
            });
            return client.formatScreenshotResponse(res, `Scrolled ${normalizedDir} by ${scrollAmount} steps at (${x.toFixed(4)}, ${y.toFixed(4)}).`);
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
//# sourceMappingURL=scroll.js.map