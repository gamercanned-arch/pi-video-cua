/**
 * Session Manager for guarding Computer-Use Agent (CUA) tools.
 * Ensures desktop interaction tools (mouse, keyboard, recording) cannot be
 * executed unless an explicit CUA session has been opened via 'start_session'.
 */
export declare class SessionManager {
    private static instance;
    private active;
    private sessionId;
    private startedAt;
    private purpose;
    private constructor();
    static getInstance(): SessionManager;
    /**
     * Returns whether a CUA desktop session is currently active.
     */
    isActive(): boolean;
    /**
     * Returns current session metadata if active.
     */
    getSessionInfo(): {
        sessionId: string;
        startedAt: number;
        durationSeconds: number;
        purpose?: string;
    } | null;
    /**
     * Starts a new CUA desktop interaction session.
     */
    start(purpose?: string): {
        sessionId: string;
        isNew: boolean;
    };
    /**
     * Closes the active CUA desktop interaction session and locks tools.
     */
    end(summary?: string): {
        wasActive: boolean;
        durationSeconds: number;
        summary?: string;
    };
}
//# sourceMappingURL=session-manager.d.ts.map