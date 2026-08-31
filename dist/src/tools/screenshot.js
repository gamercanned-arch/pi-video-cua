import { HelperClient } from "../helper-client.js";
export const screenshotTool = {
    name: "screenshot",
    description: "Takes a screenshot of the entire primary display and returns it with normalized coordinate metadata (0.0 to 1.0) and resolution information.",
    parameters: {
        type: "object",
        properties: {},
    },
    execute: async (args) => {
        const client = HelperClient.getInstance();
        const safeArgs = args && typeof args === "object" ? args : {};
        try {
            const res = await client.screenshot(safeArgs);
            return client.formatScreenshotResponse(res, "Primary display captured successfully.");
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
