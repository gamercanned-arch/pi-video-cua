import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
export const screenshotTool = {
    name: "screenshot",
    description: "[Requires active CUA session started via 'start_session'] Takes a screenshot of the entire primary display and returns it with normalized coordinate metadata (0.0 to 1.0) and resolution information.",
    parameters: {
        type: "object",
        properties: {},
    },
    execute: async (args) => {
        const client = HelperClient.getInstance();
        if (!SessionManager.getInstance().isActive()) {
            return client.formatErrorResponse(new Error("CUA session is not active. For safety, desktop control tools are locked. Call 'start_session' first to begin a desktop session."));
        }
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
