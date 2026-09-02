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
export declare const tools: (import("./types.js").PiTool<import("./types.js").ClickArgs> | import("./types.js").PiTool<import("./types.js").TypeTextArgs> | import("./types.js").PiTool<import("./types.js").PressKeyArgs> | import("./types.js").PiTool<import("./types.js").WaitArgs> | import("./types.js").PiTool<import("./types.js").ScreenRecordArgs> | import("./types.js").PiTool<import("./types.js").DragArgs> | import("./types.js").PiTool<import("./types.js").ScrollArgs>)[];
/**
 * Extension initialization / registration for pi.dev.
 * Registers all 9 tools and the CUA system prompt with the Pi extension context.
 */
export default function register(piContext?: any): {
    name: string;
    version: string;
    description: string;
    tools: (import("./types.js").PiTool<import("./types.js").ClickArgs> | import("./types.js").PiTool<import("./types.js").TypeTextArgs> | import("./types.js").PiTool<import("./types.js").PressKeyArgs> | import("./types.js").PiTool<import("./types.js").WaitArgs> | import("./types.js").PiTool<import("./types.js").ScreenRecordArgs> | import("./types.js").PiTool<import("./types.js").DragArgs> | import("./types.js").PiTool<import("./types.js").ScrollArgs>)[];
    systemPrompt: string;
};
//# sourceMappingURL=index.d.ts.map