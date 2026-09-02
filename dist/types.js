/**
 * Normalizes a coordinate to [0.0, 1.0].
 * Gracefully supports both:
 * - Standard [0, 1000] CUA scale (e.g. 500 -> 0.5)
 * - [0.0, 1.0] unit scale (e.g. 0.5 -> 0.5)
 */
export function normalizeCoordinate(val) {
    if (typeof val === "number" && isFinite(val) && val > 1.0 && val <= 1000.0) {
        return val / 1000.0;
    }
    return val;
}
//# sourceMappingURL=types.js.map