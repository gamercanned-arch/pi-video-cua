import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
export const typeTextTool = {
    name: "type_text",
    description: "[Requires active CUA session started via 'start_session'] Types text character-by-character at the current OS input focus point using native OS Unicode text injection. Returns a screenshot of the resulting screen state.",
    parameters: {
        type: "object",
        properties: {
            text: {
                type: "string",
                description: "Text string to type at the active focused input field.",
            },
        },
        required: ["text"],
    },
    execute: async (args) => {
        const client = HelperClient.getInstance();
        if (!SessionManager.getInstance().isActive()) {
            return client.formatErrorResponse(new Error("CUA session is not active. For safety, desktop control tools are locked. Call 'start_session' first to begin a desktop session."));
        }
        if (!args || typeof args !== "object") {
            return client.formatErrorResponse(new Error("Invalid arguments: expected an object with 'text' property."));
        }
        if (typeof args.text !== "string") {
            return client.formatErrorResponse(new Error(`Invalid 'text' argument: must be a string. Received: ${typeof args.text}`));
        }
        try {
            const res = await client.typeText(args);
            return client.formatScreenshotResponse(res, `Typed text (${args.text.length} characters) at active focus.`);
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
