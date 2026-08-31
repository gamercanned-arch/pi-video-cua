import { HelperClient } from "../helper-client.js";
import { PiTool, ScreenRecordArgs } from "../types.js";

export const screenRecordTool: PiTool<ScreenRecordArgs> = {
  name: "screen_record",
  description:
    "Records the primary screen and system audio simultaneously for a specified duration in seconds using FFmpeg. Returns the resulting MP4 video file path and a screenshot. Useful for watching and listening to DaVinci Resolve timeline playback.",
  parameters: {
    type: "object",
    properties: {
      duration: {
        type: "number",
        description: "Recording duration in seconds (e.g. 5 for a 5-second playback check).",
        minimum: 0.5,
        maximum: 300,
      },
    },
    required: ["duration"],
  },
  execute: async (args: ScreenRecordArgs) => {
    const client = HelperClient.getInstance();

    if (!args || typeof args !== "object") {
      return client.formatErrorResponse(
        new Error("Invalid arguments: expected an object with 'duration' property.")
      );
    }

    if (
      typeof args.duration !== "number" ||
      isNaN(args.duration) ||
      !isFinite(args.duration) ||
      args.duration < 0.5 ||
      args.duration > 300
    ) {
      return client.formatErrorResponse(
        new Error(
          `Invalid 'duration' argument: must be a number between 0.5 and 300 seconds. Received: ${args?.duration}`
        )
      );
    }

    try {
      const res = await client.screenRecord(args);
      return client.formatRecordResponse(
        res,
        `Screen and audio recording completed successfully.`
      );
    } catch (err) {
      return client.formatErrorResponse(err);
    }
  },
};
