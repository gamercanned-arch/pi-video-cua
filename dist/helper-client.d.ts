import { ClickArgs, DragArgs, MoveMouseArgs, PiToolResponse, PressKeyArgs, RecordResult, ScreenRecordArgs, ScreenshotArgs, ScreenshotResult, ScrollArgs, TypeTextArgs, WaitArgs } from "./types.js";
export declare class HelperError extends Error {
    readonly code: number;
    readonly screenshot?: ScreenshotResult;
    constructor(code: number, message: string, screenshot?: ScreenshotResult);
}
export declare class HelperClient {
    private static instance;
    private process;
    private rl;
    private nextId;
    private pendingRequests;
    private isStarting;
    private startPromise;
    private boundExitHandler;
    private boundSigintHandler;
    private boundSigtermHandler;
    static getInstance(): HelperClient;
    private constructor();
    private findHelperBinary;
    ensureRunning(): Promise<void>;
    private handleIncomingLine;
    callMethod<T = any>(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<T>;
    screenshot(_args?: ScreenshotArgs): Promise<ScreenshotResult>;
    moveMouse(args: MoveMouseArgs): Promise<ScreenshotResult>;
    click(args?: ClickArgs): Promise<ScreenshotResult>;
    typeText(args: TypeTextArgs): Promise<ScreenshotResult>;
    pressKey(args: PressKeyArgs): Promise<ScreenshotResult>;
    wait(args: WaitArgs): Promise<ScreenshotResult>;
    screenRecord(args: ScreenRecordArgs): Promise<RecordResult>;
    drag(args: DragArgs): Promise<ScreenshotResult>;
    scroll(args: ScrollArgs): Promise<ScreenshotResult>;
    formatScreenshotResponse(result: ScreenshotResult, message?: string): PiToolResponse;
    formatRecordResponse(result: RecordResult, message?: string): PiToolResponse;
    formatErrorResponse(error: unknown): PiToolResponse;
    private cleanupProcess;
    dispose(): void;
}
//# sourceMappingURL=helper-client.d.ts.map