"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.generateToken = generateToken;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Require that a request has a valid JWT.
 * If valid, attaches payload on req.user, otherwise 401.
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ error: "JWT_SECRET is not set on server" });
    }
    const token = authHeader.slice("Bearer ".length);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
    }
    catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}
/** Generate a JWT for the given payload. */
function generateToken(payload) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is required");
    }
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
}
/**
 * Require that a request has a valid JWT with admin privileges.
 * Must be called after requireAuth middleware.
 */
function requireAdmin(req, res, next) {
    if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: "Admin access required" });
    }
    return next();
}
