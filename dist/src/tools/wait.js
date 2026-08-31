import { HelperClient } from "../helper-client.js";
export const waitTool = {
    name: "wait",
    description: "Waits for a specified duration in milliseconds (useful for waiting for render progress, playback, UI animations, or dialog loading) and then returns an updated screenshot.",
    parameters: {
        type: "object",
        properties: {
            ms: {
                type: "number",
                description: "Time to wait in milliseconds (e.g. 1000 for 1 second).",
                minimum: 0,
            },
        },
        required: ["ms"],
    },
    execute: async (args) => {
        const client = HelperClient.getInstance();
        if (!args || typeof args !== "object") {
            return client.formatErrorResponse(new Error("Invalid arguments: expected an object with 'ms' property."));
        }
        if (typeof args.ms !== "number" ||
            isNaN(args.ms) ||
            !isFinite(args.ms) ||
            args.ms < 0) {
            return client.formatErrorResponse(new Error(`Invalid 'ms' argument: must be a non-negative finite number. Received: ${args?.ms}`));
        }
        try {
            const res = await client.wait(args);
            return client.formatScreenshotResponse(res, `Waited for ${args.ms}ms.`);
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
