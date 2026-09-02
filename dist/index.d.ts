import { startSessionTool } from "./tools/start-session.js";
import { endSessionTool } from "./tools/end-session.js";
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
import { SessionManager } from "./session-manager.js";
import { CUA_SYSTEM_PROMPT } from "./prompt.js";
export * from "./types.js";
export { HelperClient, HelperError, SessionManager, CUA_SYSTEM_PROMPT };
export { startSessionTool, endSessionTool, screenshotTool, moveMouseTool, clickTool, typeTextTool, pressKeyTool, waitTool, screenRecordTool, dragTool, scrollTool, };
/**
 * Array of all 11 computer-use agent tools provided by pi-video-cua.
 * All desktop interaction tools are guarded and require calling start_session first.
 */
export declare const tools: (import("./types.js").PiTool<import("./types.js").StartSessionArgs> | import("./types.js").PiTool<import("./types.js").EndSessionArgs> | import("./types.js").PiTool<import("./types.js").ClickArgs> | import("./types.js").PiTool<import("./types.js").TypeTextArgs> | import("./types.js").PiTool<import("./types.js").PressKeyArgs> | import("./types.js").PiTool<import("./types.js").WaitArgs> | import("./types.js").PiTool<import("./types.js").ScreenRecordArgs> | import("./types.js").PiTool<import("./types.js").DragArgs> | import("./types.js").PiTool<import("./types.js").ScrollArgs>)[];
/**
 * Extension initialization / registration for pi.dev.
 * Registers tools with the Pi extension context.
 * No system prompt is injected — the agent learns how to use the tools
 * safely through tool schemas and when calling 'start_session'.
 */
export default function register(piContext?: any): {
    name: string;
    version: string;
    description: string;
    tools: (import("./types.js").PiTool<import("./types.js").StartSessionArgs> | import("./types.js").PiTool<import("./types.js").EndSessionArgs> | import("./types.js").PiTool<import("./types.js").ClickArgs> | import("./types.js").PiTool<import("./types.js").TypeTextArgs> | import("./types.js").PiTool<import("./types.js").PressKeyArgs> | import("./types.js").PiTool<import("./types.js").WaitArgs> | import("./types.js").PiTool<import("./types.js").ScreenRecordArgs> | import("./types.js").PiTool<import("./types.js").DragArgs> | import("./types.js").PiTool<import("./types.js").ScrollArgs>)[];
};
//# sourceMappingURL=index.d.ts.map