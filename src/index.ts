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

export {
  startSessionTool,
  endSessionTool,
  screenshotTool,
  moveMouseTool,
  clickTool,
  typeTextTool,
  pressKeyTool,
  waitTool,
  screenRecordTool,
  dragTool,
  scrollTool,
};

/**
 * Array of all 11 computer-use agent tools provided by pi-video-cua.
 * All desktop interaction tools are guarded and require calling start_session first.
 */
export const tools = [
  startSessionTool,
  screenshotTool,
  moveMouseTool,
  clickTool,
  typeTextTool,
  pressKeyTool,
  waitTool,
  screenRecordTool,
  dragTool,
  scrollTool,
  endSessionTool,
];

/**
 * Extension initialization / registration for pi.dev.
 * Registers tools with the Pi extension context.
 * No system prompt is injected — the agent learns how to use the tools
 * safely through tool schemas and when calling 'start_session'.
 */
export default function register(piContext?: any) {
  if (piContext && typeof piContext.registerTool === "function") {
    for (const tool of tools) {
      piContext.registerTool({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        execute: async (...callArgs: any[]) => {
          // Support Pi runtime signature: (toolCallId, params, signal, onUpdate, ctx)
          // as well as direct invocation: (args)
          let args: any = {};
          if (typeof callArgs[0] === "string") {
            args = callArgs[1] && typeof callArgs[1] === "object" ? callArgs[1] : {};
          } else if (callArgs[0] && typeof callArgs[0] === "object") {
            args = callArgs[0];
          }
          return tool.execute(args);
        },
      });
    }
  }

  return {
    name: "pi-video-cua",
    version: "0.1.0",
    description: "Windows 11 Computer-Use Agent extension with guarded desktop sessions for DaVinci Resolve & desktop applications",
    tools,
  };
}
