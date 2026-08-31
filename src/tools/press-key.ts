import { HelperClient } from "../helper-client.js";
import { PiTool, PressKeyArgs } from "../types.js";

export const pressKeyTool: PiTool<PressKeyArgs> = {
  name: "press_key",
  description:
    "Presses a single key (e.g. 'enter', 'space', 'tab', 'escape', 'backspace', 'delete', 'f1'-'f12', 'a'-'z') or a combination separated by '+' (e.g. 'ctrl+s', 'ctrl+shift+z', 'alt+tab'). Returns a screenshot.",
  parameters: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description:
          "Key name or '+' separated combination, e.g. 'enter', 'space', 'backspace', 'ctrl+s', 'ctrl+z', 'ctrl+shift+z', 'alt+tab', 'f9'.",
      },
    },
    required: ["key"],
  },
  execute: async (args: PressKeyArgs) => {
    const client = HelperClient.getInstance();

    if (!args || typeof args !== "object") {
      return client.formatErrorResponse(
        new Error("Invalid arguments: expected an object with 'key' property.")
      );
    }

    if (typeof args.key !== "string" || args.key.trim().length === 0) {
      return client.formatErrorResponse(
        new Error(
          `Invalid 'key' argument: must be a non-empty string. Received: ${JSON.stringify(
            args?.key
          )}`
        )
      );
    }

    try {
      const res = await client.pressKey(args);
      return client.formatScreenshotResponse(res, `Pressed key combination: ${args.key}`);
    } catch (err) {
      return client.formatErrorResponse(err);
    }
  },
};
