import { HelperClient } from "../helper-client.js";
export const clickTool = {
    name: "click",
    description: "Clicks at the current mouse cursor position without moving it. Defaults to left-click; optionally set to 'right' or 'middle'. Returns a screenshot of the resulting screen state.",
    parameters: {
        type: "object",
        properties: {
            button: {
                type: "string",
                enum: ["left", "right", "middle"],
                default: "left",
                description: "Mouse button to click ('left', 'right', or 'middle'). Default is 'left'.",
            },
        },
    },
    execute: async (args) => {
        const client = HelperClient.getInstance();
        if (args !== undefined && (typeof args !== "object" || args === null)) {
            return client.formatErrorResponse(new Error("Invalid arguments: 'args' must be an object."));
        }
        const btn = args?.button ?? "left";
        if (btn !== "left" && btn !== "right" && btn !== "middle") {
            return client.formatErrorResponse(new Error(`Invalid 'button' argument: '${btn}'. Must be 'left', 'right', or 'middle'.`));
        }
        try {
            const res = await client.click(args ?? {});
            return client.formatScreenshotResponse(res, `Clicked ${btn} mouse button at current cursor location.`);
        }
        catch (err) {
            return client.formatErrorResponse(err);
        }
    },
};
