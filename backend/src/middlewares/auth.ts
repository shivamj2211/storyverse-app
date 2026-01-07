import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { query } from "../db";

dotenv.config();

/** Structure of the JWT payload */
export interface AuthPayload {
  id: string;
  email?: string;
  plan?: "free" | "premium" | "creator";
  is_admin: boolean;
  is_premium: boolean;
  is_email_verified?: boolean;
}

/** Express Request + user payload */
export type AuthRequest = Request & { user?: AuthPayload };

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
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

    // ✅ Pull latest flags from DB (source of truth)
    const dbRes = await query(
      `SELECT id, email, plan, is_admin, is_premium, is_email_verified
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (!dbRes.rows.length) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const u = dbRes.rows[0];

    req.user = {
      id: u.id,
      email: u.email,
      plan: u.plan ?? decoded.plan,
      is_admin: !!u.is_admin,
      is_premium: !!u.is_premium,
      is_email_verified: !!u.is_email_verified,
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function generateToken(payload: AuthPayload) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}
