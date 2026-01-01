"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Middleware: Require valid JWT authentication
 *
 * Verifies JWT token from Authorization header (Bearer token format)
 * If valid, attaches decoded payload to req.user
 * If invalid or missing, returns 401 Unauthorized
 *
 * Usage: app.use(requireAuth) or router.use(requireAuth)
 */
function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers?.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized. Missing or invalid token." });
        }
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");
            return res.status(500).json({ error: "Server configuration error" });
        }
        const token = authHeader.slice("Bearer ".length);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            return next();
        }
        catch (jwtError) {
            console.error("JWT verification failed:", jwtError);
            return res.status(401).json({ error: "Invalid or expired token" });
        }
    }
    catch (err) {
        console.error("Auth middleware error:", err);
        return res.status(500).json({ error: "Authentication error" });
    }
}
/**
 * Generate JWT token from auth payload
 *
 * @param payload - User data to encode in token
 * @returns JWT token string
 * @throws Error if JWT_SECRET is not set
 */
function generateToken(payload) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is required to generate tokens");
    }
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "7d",
        algorithm: "HS256"
    });
}
/**
 * Verify and decode JWT token
 *
 * @param token - JWT token string
 * @returns Decoded AuthPayload
 * @throws Error if token is invalid or expired
 */
function verifyToken(token) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is required to verify tokens");
    }
    return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
}
