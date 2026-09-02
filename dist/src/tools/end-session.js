import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
export const endSessionTool = {
    name: "end_session",
    description: "Concludes an active Computer-Use Agent (CUA) desktop session. Releases held resources, safely locks all desktop interaction tools, and terminates the background helper process.",
    parameters: {
        type: "object",
        properties: {
            summary: {
                type: "string",
                description: "Optional summary of what actions or goals were accomplished during the session.",
            },
        },
        required: [],
    },
    execute: async (args = {}) => {
        const client = HelperClient.getInstance();
        const sessionManager = SessionManager.getInstance();
        if (!sessionManager.isActive()) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No active CUA desktop session was open. All desktop interaction tools remain locked.",
                    },
                ],
                details: { wasActive: false },
            };
        }
        const { durationSeconds, summary } = sessionManager.end(args?.summary);
        // Clean up helper process
        client.dispose();
        const message = `
================================================================================
  CUA DESKTOP SESSION CLOSED
================================================================================
Session duration: ${durationSeconds.toFixed(1)} seconds.
${summary ? `Summary: ${summary}\n` : ""}All desktop interaction tools (mouse, keyboard, recording) are now safely locked.
To interact with the desktop again in the future, call 'start_session'.
================================================================================
`.trim();
        return {
            content: [
                {
                    type: "text",
                    text: message,
                },
            ],
            details: {
                wasActive: true,
                durationSeconds,
                summary,
            },
        };
    },
};
