#!/usr/bin/env node
/**
 * Model Context Protocol (MCP) Server for pi-video-cua.
 * Provides all 11 Computer-Use Agent (CUA) tools over stdio
 * for Antigravity, Claude Desktop, Cursor, and any MCP-compliant client.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./index.js";
import { HelperClient } from "./helper-client.js";
import { SessionManager } from "./session-manager.js";
async function main() {
    const server = new Server({
        name: "pi-video-cua",
        version: "0.1.0",
    }, {
        capabilities: {
            tools: {},
        },
    });
    // List available CUA tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.parameters ?? {
                    type: "object",
                    properties: {},
                },
            })),
        };
    });
    // Call tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const tool = tools.find((t) => t.name === name);
        if (!tool) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Tool '${name}' not found. Available tools: ${tools.map((t) => t.name).join(", ")}`,
                    },
                ],
                isError: true,
            };
        }
        try {
            const result = await tool.execute(args ?? {});
            const content = [];
            if (result && Array.isArray(result.content)) {
                for (const item of result.content) {
                    if (item.type === "text" && typeof item.text === "string") {
                        content.push({
                            type: "text",
                            text: item.text,
                        });
                    }
                    else if (item.type === "image" && typeof item.data === "string") {
                        content.push({
                            type: "image",
                            data: item.data,
                            mimeType: item.mimeType || "image/png",
                        });
                    }
                }
            }
            if (content.length === 0) {
                content.push({
                    type: "text",
                    text: result?.isError ? "Operation failed." : "Operation completed.",
                });
            }
            return {
                content,
                isError: !!result?.isError,
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error executing tool '${name}': ${err?.message || String(err)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // Cleanup on shutdown
    const cleanup = () => {
        try {
            SessionManager.getInstance().end();
            HelperClient.getInstance().dispose();
        }
        catch {
            // Ignore during exit
        }
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("exit", cleanup);
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error("Failed to start pi-video-cua MCP server:", err);
    process.exit(1);
});
//# sourceMappingURL=mcp-server.js.map