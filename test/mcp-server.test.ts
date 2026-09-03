import { spawn } from "child_process";
import * as path from "path";

async function runMcpTest() {
  console.log("=== Testing pi-video-cua MCP Server over Stdio ===");
  const serverPath = path.resolve(process.cwd(), "dist", "mcp-server.js");

  const child = spawn(process.execPath, [serverPath], {
    stdio: ["pipe", "pipe", "inherit"],
    windowsHide: true,
  });

  let buffer = "";
  const pendingRequests = new Map<number, (res: any) => void>();

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf-8");
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined && pendingRequests.has(msg.id)) {
          const resolver = pendingRequests.get(msg.id)!;
          pendingRequests.delete(msg.id);
          resolver(msg);
        }
      } catch (err) {
        console.error("Failed to parse line from MCP server:", line, err);
      }
    }
  });

  let nextId = 1;
  function sendRequest(method: string, params: any = {}): Promise<any> {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error(`MCP request timeout for method '${method}' (id: ${id})`));
      }, 25000);

      pendingRequests.set(id, (res) => {
        clearTimeout(timeout);
        resolve(res);
      });

      const req = JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      }) + "\n";
      child.stdin.write(req);
    });
  }

  try {
    // 1. Initialize
    console.log("1. Sending 'initialize' to MCP server...");
    const initRes = await sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-runner", version: "1.0.0" },
    });
    if (!initRes.result || !initRes.result.serverInfo) {
      throw new Error(`Invalid initialize response: ${JSON.stringify(initRes)}`);
    }
    console.log(" ✓ MCP Server initialized:", initRes.result.serverInfo);

    // Send initialized notification
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

    // 2. List tools
    console.log("\n2. Sending 'tools/list' request...");
    const listRes = await sendRequest("tools/list", {});
    const tools = listRes.result?.tools;
    if (!Array.isArray(tools) || tools.length !== 11) {
      throw new Error(`Expected 11 tools, got ${tools?.length}`);
    }
    console.log(` ✓ Successfully listed ${tools.length} tools:`, tools.map((t: any) => t.name).join(", "));

    // 3. Test safety guard via MCP
    console.log("\n3. Testing safety guard via MCP: calling 'move_mouse' before 'start_session'...");
    const guardRes = await sendRequest("tools/call", {
      name: "move_mouse",
      arguments: { x: 500, y: 500 },
    });
    if (!guardRes.result?.isError) {
      throw new Error(`Expected move_mouse to be rejected before start_session: ${JSON.stringify(guardRes)}`);
    }
    console.log(" ✓ MCP Tool Guard verified: move_mouse was correctly rejected!");

    // 4. Test start_session via MCP
    console.log("\n4. Calling 'start_session' via MCP...");
    const startRes = await sendRequest("tools/call", {
      name: "start_session",
      arguments: { purpose: "MCP integration test" },
    });
    if (startRes.result?.isError) {
      throw new Error(`start_session failed via MCP: ${JSON.stringify(startRes)}`);
    }
    const hasImage = startRes.result?.content?.some((c: any) => c.type === "image");
    const hasText = startRes.result?.content?.some((c: any) => c.type === "text");
    if (!hasImage || !hasText) {
      throw new Error(`Expected start_session to return both text and image blocks`);
    }
    console.log(" ✓ 'start_session' returned operational text and image blocks!");

    // 5. Test double click via MCP
    console.log("\n5. Calling 'click' with double-click via MCP...");
    const clickRes = await sendRequest("tools/call", {
      name: "click",
      arguments: { click_type: "double", delay_ms: 120 },
    });
    if (clickRes.result?.isError) {
      throw new Error(`click failed via MCP: ${JSON.stringify(clickRes)}`);
    }
    console.log(" ✓ Double-click executed successfully via MCP!");

    // 6. Test end_session via MCP
    console.log("\n6. Calling 'end_session' via MCP...");
    const endRes = await sendRequest("tools/call", {
      name: "end_session",
      arguments: { summary: "MCP test finished" },
    });
    if (endRes.result?.isError) {
      throw new Error(`end_session failed via MCP: ${JSON.stringify(endRes)}`);
    }
    console.log(" ✓ 'end_session' successfully executed via MCP!");

    console.log("\n=== ALL MCP SERVER TESTS PASSED SUCCESSFULLY ===");
  } finally {
    child.kill();
  }
}

runMcpTest().catch((err) => {
  console.error("MCP Server Test FAILED:", err);
  process.exit(1);
});
