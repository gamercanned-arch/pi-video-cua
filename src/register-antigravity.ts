/**
 * Automatic configuration and registration script for Antigravity.
 * Registers pi-video-cua MCP server directly into ~/.gemini/antigravity/mcp_config.json.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export function registerWithAntigravity(): { success: boolean; configPath: string; message: string } {
  const homeDir = os.homedir();
  const configPath = path.join(homeDir, ".gemini", "antigravity", "mcp_config.json");
  const serverPath = path.resolve(process.cwd(), "dist", "mcp-server.js").replace(/\\/g, "/");

  let config: { mcpServers: Record<string, any> } = { mcpServers: {} };

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(raw);
      if (!config.mcpServers || typeof config.mcpServers !== "object") {
        config.mcpServers = {};
      }
    } catch (err: any) {
      return {
        success: false,
        configPath,
        message: `Failed to parse existing config: ${err.message}`,
      };
    }
  } else {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  }

  config.mcpServers["pi-video-cua"] = {
    command: "node",
    args: [serverPath],
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

  return {
    success: true,
    configPath,
    message: `Registered pi-video-cua in Antigravity MCP config (${configPath}) pointing to ${serverPath}`,
  };
}

const isDirectRun =
  !process.argv[1] ||
  (process.argv[1] &&
    (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` ||
      process.argv[1].includes("register-antigravity")));

if (isDirectRun) {
  const res = registerWithAntigravity();
  console.log(res.message);
}
