import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/** Structure of the JWT payload */
export interface AuthPayload {
  id: string;
  email?: string;
  plan: "free" | "premium" | "creator";
  is_admin: boolean;
  is_premium: boolean;
}

/** Express Request + user payload */
export type AuthRequest = Request & { user?: AuthPayload };

/**
 * Require that a request has a valid JWT.
 * If valid, attaches payload on req.user, otherwise 401.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "JWT_SECRET is not set on server" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as AuthPayload;
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/** Generate a JWT for the given payload. */
export function generateToken(payload: AuthPayload) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
}

/**
 * Require that a request has a valid JWT with admin privileges.
 * Must be called after requireAuth middleware.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}
