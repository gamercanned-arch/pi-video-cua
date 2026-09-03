import { spawn } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class HelperError extends Error {
    code;
    screenshot;
    constructor(code, message, screenshot) {
        super(message);
        this.name = "HelperError";
        this.code = code;
        this.screenshot = screenshot;
        Object.setPrototypeOf(this, HelperError.prototype);
    }
}
export class HelperClient {
    static instance = null;
    process = null;
    rl = null;
    nextId = 1;
    pendingRequests = new Map();
    isStarting = false;
    startPromise = null;
    boundExitHandler = () => this.dispose();
    boundSigintHandler = () => this.dispose();
    boundSigtermHandler = () => this.dispose();
    static getInstance() {
        if (!HelperClient.instance) {
            HelperClient.instance = new HelperClient();
        }
        return HelperClient.instance;
    }
    constructor() {
        process.on("exit", this.boundExitHandler);
        process.on("SIGINT", this.boundSigintHandler);
        process.on("SIGTERM", this.boundSigtermHandler);
    }
    findHelperBinary() {
        if (process.env.PI_VIDEO_CUA_HELPER_PATH) {
            if (fs.existsSync(process.env.PI_VIDEO_CUA_HELPER_PATH)) {
                return process.env.PI_VIDEO_CUA_HELPER_PATH;
            }
            throw new Error(`Helper binary specified by PI_VIDEO_CUA_HELPER_PATH was not found: ${process.env.PI_VIDEO_CUA_HELPER_PATH}`);
        }
        const possiblePaths = [
            path.resolve(__dirname, "..", "bin", "pi-video-cua-helper.exe"),
            path.resolve(__dirname, "bin", "pi-video-cua-helper.exe"),
            path.resolve(__dirname, "..", "helper", "target", "release", "pi-video-cua-helper.exe"),
            path.resolve(process.cwd(), "bin", "pi-video-cua-helper.exe"),
            path.resolve(process.cwd(), "helper", "target", "release", "pi-video-cua-helper.exe"),
        ];
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }
        throw new Error(`Could not find native helper binary 'pi-video-cua-helper.exe'. Checked:\n${possiblePaths.join("\n")}\nPlease run 'npm run build:helper' or set PI_VIDEO_CUA_HELPER_PATH.`);
    }
    async ensureRunning() {
        if (this.process && !this.process.killed && this.process.exitCode === null) {
            return;
        }
        if (this.isStarting && this.startPromise) {
            return this.startPromise;
        }
        this.isStarting = true;
        this.startPromise = new Promise((resolve, reject) => {
            let isSettled = false;
            const safeReject = (err) => {
                if (!isSettled) {
                    isSettled = true;
                    this.cleanupProcess();
                    reject(err);
                }
            };
            const safeResolve = () => {
                if (!isSettled) {
                    isSettled = true;
                    this.isStarting = false;
                    this.startPromise = null;
                    resolve();
                }
            };
            try {
                const binPath = this.findHelperBinary();
                const proc = spawn(binPath, [], {
                    stdio: ["pipe", "pipe", "inherit"],
                    windowsHide: true,
                });
                this.process = proc;
                proc.once("error", (err) => {
                    safeReject(new Error(`Failed to spawn helper process: ${err.message}`));
                });
                proc.once("exit", (code, signal) => {
                    if (this.isStarting || !isSettled) {
                        safeReject(new Error(`Helper process exited immediately with code ${code}, signal ${signal}`));
                    }
                    else {
                        this.cleanupProcess();
                    }
                });
                if (!proc.stdout || !proc.stdin) {
                    safeReject(new Error("Helper process stdout or stdin is null"));
                    return;
                }
                this.rl = readline.createInterface({
                    input: proc.stdout,
                    crlfDelay: Infinity,
                });
                this.rl.on("line", (line) => {
                    this.handleIncomingLine(line);
                });
                safeResolve();
            }
            catch (err) {
                safeReject(err instanceof Error ? err : new Error(String(err)));
            }
        });
        return this.startPromise;
    }
    handleIncomingLine(line) {
        const trimmed = line.trim();
        if (!trimmed)
            return;
        try {
            const msg = JSON.parse(trimmed);
            if (msg.id !== undefined && msg.id !== null) {
                const pending = this.pendingRequests.get(msg.id);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pendingRequests.delete(msg.id);
                    if (msg.error) {
                        const code = typeof msg.error.code === "number" ? msg.error.code : -32000;
                        const message = typeof msg.error.message === "string" ? msg.error.message : "Unknown error";
                        let screenshot = undefined;
                        if (msg.error.data && typeof msg.error.data === "object") {
                            if ("image_base64" in msg.error.data && "dimensions" in msg.error.data) {
                                screenshot = msg.error.data;
                            }
                        }
                        pending.reject(new HelperError(code, message, screenshot));
                    }
                    else {
                        pending.resolve(msg.result);
                    }
                }
            }
        }
        catch (e) {
            console.error("Failed to parse helper JSON-RPC line:", line, e);
        }
    }
    async callMethod(method, params = {}, timeoutMs = 60000) {
        await this.ensureRunning();
        if (!this.process || !this.process.stdin) {
            throw new Error("Helper process is not connected");
        }
        const id = this.nextId++;
        const payload = JSON.stringify({
            id,
            method,
            params,
        });
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Helper RPC timeout for method '${method}' after ${timeoutMs}ms`));
            }, timeoutMs);
            this.pendingRequests.set(id, { resolve, reject, timeout });
            this.process.stdin.write(payload + "\n", (err) => {
                if (err) {
                    clearTimeout(timeout);
                    this.pendingRequests.delete(id);
                    reject(new Error(`Failed to send data to helper: ${err.message}`));
                }
            });
        });
    }
    async screenshot(_args = {}) {
        return this.callMethod("screenshot", {});
    }
    async moveMouse(args) {
        return this.callMethod("move_mouse", { x: args.x, y: args.y });
    }
    async click(args = {}) {
        let count = 1;
        if (args.count && args.count > 0) {
            count = args.count;
        }
        else if (args.double_click) {
            count = 2;
        }
        else if (args.click_type === "double") {
            count = 2;
        }
        else if (args.click_type === "triple") {
            count = 3;
        }
        const delayMs = typeof args.delay_ms === "number" && isFinite(args.delay_ms)
            ? Math.max(args.delay_ms, 100)
            : 100;
        return this.callMethod("click", {
            button: args.button ?? "left",
            count,
            delay_ms: delayMs,
        });
    }
    async typeText(args) {
        return this.callMethod("type_text", { text: args.text });
    }
    async pressKey(args) {
        return this.callMethod("press_key", { key: args.key });
    }
    async wait(args) {
        const timeout = Math.max(args.ms + 10000, 30000);
        return this.callMethod("wait", { ms: args.ms }, timeout);
    }
    async screenRecord(args) {
        const timeout = Math.max((args.duration + 15) * 1000, 45000);
        return this.callMethod("screen_record", { duration: args.duration }, timeout);
    }
    async drag(args) {
        return this.callMethod("drag", {
            x1: args.x1,
            y1: args.y1,
            x2: args.x2,
            y2: args.y2,
            modifiers: args.modifiers,
        });
    }
    async scroll(args) {
        return this.callMethod("scroll", {
            x: args.x,
            y: args.y,
            direction: args.direction,
            amount: args.amount ?? 3,
        });
    }
    formatScreenshotResponse(result, message) {
        const { width, height, physical_width, physical_height, dpi_scale } = result.dimensions;
        const textHeader = message ? `${message}\n` : "";
        const dpiStr = typeof dpi_scale === "number" && !isNaN(dpi_scale) && isFinite(dpi_scale)
            ? dpi_scale.toFixed(2)
            : "1.00";
        const infoText = `${textHeader}Screen: ${width}x${height} (Physical: ${physical_width}x${physical_height}, DPI Scale: ${dpiStr})\nScreenshot saved to: ${result.image_path}`;
        return {
            content: [
                {
                    type: "text",
                    text: infoText,
                },
                {
                    type: "image",
                    data: result.image_base64,
                    mimeType: "image/png",
                },
            ],
            details: {
                imagePath: result.image_path,
                dimensions: result.dimensions,
                success: result.success,
            },
        };
    }
    formatRecordResponse(result, message) {
        const textHeader = message ? `${message}\n` : "";
        const durStr = typeof result.duration === "number" && !isNaN(result.duration) && isFinite(result.duration)
            ? result.duration.toFixed(1)
            : "0.0";
        const infoText = `${textHeader}Screen recording completed (${durStr}s).\nVideo saved to: ${result.video_path}`;
        const content = [
            {
                type: "text",
                text: infoText,
            },
        ];
        if (result.screenshot) {
            content.push({
                type: "image",
                data: result.screenshot.image_base64,
                mimeType: "image/png",
            });
        }
        return {
            content,
            details: {
                videoPath: result.video_path,
                duration: result.duration,
                success: result.success,
            },
        };
    }
    formatErrorResponse(error) {
        let errMsg;
        let screenshot = undefined;
        if (error instanceof HelperError) {
            errMsg = `Helper Error (${error.code}): ${error.message}`;
            screenshot = error.screenshot;
        }
        else if (error instanceof Error) {
            errMsg = error.message;
        }
        else {
            errMsg = String(error);
        }
        const content = [
            {
                type: "text",
                text: `Action Error: ${errMsg}`,
            },
        ];
        if (screenshot?.image_base64) {
            content.push({
                type: "image",
                data: screenshot.image_base64,
                mimeType: "image/png",
            });
        }
        const details = {
            error: errMsg,
        };
        if (screenshot) {
            details.imagePath = screenshot.image_path;
            details.dimensions = screenshot.dimensions;
        }
        return {
            content,
            isError: true,
            details,
        };
    }
    cleanupProcess() {
        this.isStarting = false;
        this.startPromise = null;
        if (this.rl) {
            try {
                this.rl.close();
            }
            catch (_) { }
            this.rl = null;
        }
        for (const [id, req] of this.pendingRequests) {
            clearTimeout(req.timeout);
            req.reject(new Error("Helper process exited"));
        }
        this.pendingRequests.clear();
        if (this.process) {
            try {
                this.process.kill();
            }
            catch (_) { }
            this.process = null;
        }
    }
    dispose() {
        process.removeListener("exit", this.boundExitHandler);
        process.removeListener("SIGINT", this.boundSigintHandler);
        process.removeListener("SIGTERM", this.boundSigtermHandler);
        this.cleanupProcess();
        HelperClient.instance = null;
    }
}
//# sourceMappingURL=helper-client.js.map