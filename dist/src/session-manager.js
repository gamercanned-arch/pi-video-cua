/**
 * Session Manager for guarding Computer-Use Agent (CUA) tools.
 * Ensures desktop interaction tools (mouse, keyboard, recording) cannot be
 * executed unless an explicit CUA session has been opened via 'start_session'.
 */
export class SessionManager {
    static instance;
    active = false;
    sessionId = null;
    startedAt = null;
    purpose = null;
    constructor() { }
    static getInstance() {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }
    /**
     * Returns whether a CUA desktop session is currently active.
     */
    isActive() {
        return this.active;
    }
    /**
     * Returns current session metadata if active.
     */
    getSessionInfo() {
        if (!this.active || !this.sessionId || !this.startedAt) {
            return null;
        }
        const durationSeconds = (Date.now() - this.startedAt) / 1000;
        return {
            sessionId: this.sessionId,
            startedAt: this.startedAt,
            durationSeconds,
            purpose: this.purpose || undefined,
        };
    }
    /**
     * Starts a new CUA desktop interaction session.
     */
    start(purpose) {
        if (this.active && this.sessionId) {
            return { sessionId: this.sessionId, isNew: false };
        }
        this.active = true;
        this.sessionId = "cua_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
        this.startedAt = Date.now();
        this.purpose = purpose || null;
        return { sessionId: this.sessionId, isNew: true };
    }
    /**
     * Closes the active CUA desktop interaction session and locks tools.
     */
    end(summary) {
        if (!this.active) {
            return { wasActive: false, durationSeconds: 0 };
        }
        const durationSeconds = this.startedAt ? (Date.now() - this.startedAt) / 1000 : 0;
        this.active = false;
        this.sessionId = null;
        this.startedAt = null;
        this.purpose = null;
        return {
            wasActive: true,
            durationSeconds,
            summary: summary || undefined,
        };
    }
}
