/**
 * Normalizes a coordinate to [0.0, 1.0].
 * Gracefully supports:
 * - Standard [0, 1000] CUA scale (e.g. 500 -> 0.5)
 * - [0.0, 1.0] unit scale (e.g. 0.5 -> 0.5)
 * - Raw screen pixel scale (> 1000 or with explicit screen dimension)
 */
export function normalizeCoordinate(val, screenDimension) {
    if (typeof val === "number" && isFinite(val)) {
        if (val > 1000.0 && screenDimension && screenDimension > 0) {
            return Math.max(0.0, Math.min(1.0, val / screenDimension));
        }
        if (val > 1.0 && val <= 1000.0) {
            return Math.max(0.0, Math.min(1.0, val / 1000.0));
        }
        return Math.max(0.0, Math.min(1.0, val));
    }
    return val;
}
/**
 * Universal Coordinate Resolver for CUA models.
 * Accepts:
 * - Normalized [0, 1000] integer coordinates (Gemini / UI-TARS)
 * - Unit [0.0, 1.0] float coordinates
 * - Raw screen pixel coordinates (Claude 3.5/3.7, OpenAI Operator, OSWorld)
 * - Anthropic-style coordinate pair [x, y]
 */
export function resolvePoint(args, options = {}) {
    const screenWidth = options.screenWidth || 1920;
    const screenHeight = options.screenHeight || 1080;
    let rawX = args.pixel_x;
    let rawY = args.pixel_y;
    const isExplicitPixel = rawX !== undefined && rawY !== undefined;
    if (rawX === undefined && rawY === undefined) {
        if (Array.isArray(args.coordinate) && args.coordinate.length >= 2) {
            rawX = args.coordinate[0];
            rawY = args.coordinate[1];
        }
        else {
            rawX = args.x;
            rawY = args.y;
        }
    }
    if (typeof rawX !== "number" ||
        typeof rawY !== "number" ||
        isNaN(rawX) ||
        isNaN(rawY) ||
        !isFinite(rawX) ||
        !isFinite(rawY)) {
        return null;
    }
    // Raw pixel mode (explicit pixel parameter, coordinate_type="pixel", or auto-detected > 1000)
    if (isExplicitPixel || args.coordinate_type === "pixel" || rawX > 1000.0 || rawY > 1000.0) {
        const normX = Math.max(0.0, Math.min(1.0, rawX / screenWidth));
        const normY = Math.max(0.0, Math.min(1.0, rawY / screenHeight));
        return { x: normX, y: normY };
    }
    // Unit scale [0.0, 1.0]
    if (args.coordinate_type === "unit" || (rawX <= 1.0 && rawY <= 1.0 && args.coordinate_type !== "normalized_1000")) {
        const normX = Math.max(0.0, Math.min(1.0, rawX));
        const normY = Math.max(0.0, Math.min(1.0, rawY));
        return { x: normX, y: normY };
    }
    // Default normalized [0, 1000] scale
    const normX = Math.max(0.0, Math.min(1.0, rawX / 1000.0));
    const normY = Math.max(0.0, Math.min(1.0, rawY / 1000.0));
    return { x: normX, y: normY };
}
//# sourceMappingURL=types.js.map