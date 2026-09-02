import { HelperClient } from "../helper-client.js";
import { SessionManager } from "../session-manager.js";
import { CUA_SYSTEM_PROMPT } from "../prompt.js";
export const startSessionTool = {
    name: "start_session",
    description: "Opens a Computer-Use Agent (CUA) desktop session. REQUIRED before using any desktop interaction tools (screenshot, mouse, keyboard, drag, record). Captures the initial desktop state, returns operational instructions on how to use all CUA tools and DaVinci Resolve shortcuts, and unlocks desktop control.",
    parameters: {
        type: "object",
        properties: {
            purpose: {
                type: "string",
                description: "Optional goal or task description for this desktop control session (e.g. 'Edit timeline in DaVinci Resolve')",
            },
        },
        required: [],
    },
    execute: async (args = {}) => {
        const client = HelperClient.getInstance();
        const sessionManager = SessionManager.getInstance();
        const { sessionId, isNew } = sessionManager.start(args?.purpose);
        try {
            // Capture initial desktop display to give the agent immediate visual context
            const screenshot = await client.screenshot();
            const instructions = `
================================================================================
  CUA DESKTOP SESSION OPENED (Session ID: ${sessionId})
================================================================================

${CUA_SYSTEM_PROMPT}

================================================================================
  INITIAL DESKTOP STATE CAPTURED BELOW:
  Screen Dimensions: ${screenshot.dimensions.width}x${screenshot.dimensions.height} (DPI Scale: ${screenshot.dimensions.dpi_scale})
  All 9 CUA desktop tools are now unlocked and ready.
================================================================================
`.trim();
            return {
                content: [
                    {
                        type: "text",
                        text: instructions,
                    },
                    {
                        type: "image",
                        data: screenshot.image_base64,
                        mimeType: "image/png",
                    },
                ],
                details: {
                    sessionId,
                    isNew,
                    purpose: args?.purpose,
                    dimensions: screenshot.dimensions,
                    imagePath: screenshot.image_path,
                },
            };
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
//# sourceMappingURL=start-session.js.map