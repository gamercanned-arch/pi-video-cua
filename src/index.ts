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

export * from "./types.js";
export { HelperClient, HelperError };

export {
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
 * Registers all 9 tools with the Pi extension context.
 */
export default function register(piContext?: any) {
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

  return {
    name: "pi-video-cua",
    version: "0.1.0",
    description: "Windows 11 Computer-Use Agent extension for DaVinci Resolve & desktop applications",
    tools,
  };
}
