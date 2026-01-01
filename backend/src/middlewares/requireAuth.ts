import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/**
 * Auth payload structure from JWT
 */
export interface AuthPayload {
  id: string;
  email?: string;
  is_admin: boolean;
  is_premium: boolean;
}

/**
 * Extended Express Request with optional user payload
 */
export type AuthRequest = Request & { user?: AuthPayload };

/**
 * Middleware: Require valid JWT authentication
 * 
 * Verifies JWT token from Authorization header (Bearer token format)
 * If valid, attaches decoded payload to req.user
 * If invalid or missing, returns 401 Unauthorized
 * 
 * Usage: app.use(requireAuth) or router.use(requireAuth)
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as AuthPayload;
      req.user = decoded;
      return next();
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (err) {
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
export function generateToken(payload: AuthPayload): string {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required to generate tokens");
  }

  return jwt.sign(payload, process.env.JWT_SECRET, { 
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
export function verifyToken(token: string): AuthPayload {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required to verify tokens");
  }

  return jwt.verify(token, process.env.JWT_SECRET) as AuthPayload;
}
