import { screenshotTool } from "./tools/screenshot.js";
import { moveMouseTool } from "./tools/move-mouse.js";
import { clickTool } from "./tools/click.js";
import { typeTextTool } from "./tools/type-text.js";
import { pressKeyTool } from "./tools/press-key.js";
import { waitTool } from "./tools/wait.js";
import { screenRecordTool } from "./tools/screen-record.js";
import { dragTool } from "./tools/drag.js";
import { scrollTool } from "./tools/scroll.js";
import { HelperClient, HelperError } from "./helper-client.js";
import { CUA_SYSTEM_PROMPT } from "./prompt.js";
export * from "./types.js";
export { HelperClient, HelperError, CUA_SYSTEM_PROMPT };
export { screenshotTool, moveMouseTool, clickTool, typeTextTool, pressKeyTool, waitTool, screenRecordTool, dragTool, scrollTool, };
/**
 * Array of all 9 computer-use agent tools provided by pi-video-cua.
 */
export const tools = [
    screenshotTool,
    moveMouseTool,
    clickTool,
    typeTextTool,
    pressKeyTool,
    waitTool,
    screenRecordTool,
    dragTool,
    scrollTool,
];
/**
 * Extension initialization / registration for pi.dev.
 * Registers all 9 tools and the CUA system prompt with the Pi extension context.
 */
export default function register(piContext) {
    if (piContext && typeof piContext.registerTool === "function") {
        for (const tool of tools) {
            piContext.registerTool({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
                handler: tool.execute,
            });
        }
    }
    // Register system prompt hook if supported by the host agent environment
    if (piContext && typeof piContext.registerSystemPrompt === "function") {
        piContext.registerSystemPrompt(CUA_SYSTEM_PROMPT);
    }
    else if (piContext && typeof piContext.appendSystemPrompt === "function") {
        piContext.appendSystemPrompt(CUA_SYSTEM_PROMPT);
    }
    return {
        name: "pi-video-cua",
        version: "0.1.0",
        description: "Windows 11 Computer-Use Agent extension for DaVinci Resolve & desktop applications",
        tools,
        systemPrompt: CUA_SYSTEM_PROMPT,
    };
}
//# sourceMappingURL=index.js.map