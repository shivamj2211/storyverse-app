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

  // ✅ token_version embedded into JWT
  tv?: number;
}

/** Express Request + user payload */
export type AuthRequest = Request & { user?: AuthPayload };

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "JWT_SECRET is not set on server" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, secret) as AuthPayload;

    // ✅ Pull latest flags + token_version from DB (source of truth)
    const dbRes = await query(
      `SELECT id, email, plan, is_admin, is_premium, is_email_verified, token_version
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (!dbRes.rows.length) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const u = dbRes.rows[0];

    // ✅ Token invalidation check (logout everywhere)
    // If token doesn't have tv (older tokens), treat as invalid after rollout.
    const tokenTv = typeof decoded.tv === "number" ? decoded.tv : -1;
    const dbTv = Number(u.token_version || 0);

    if (tokenTv !== dbTv) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    req.user = {
      id: u.id,
      email: u.email,
      plan: u.plan ?? decoded.plan,
      is_admin: !!u.is_admin,
      is_premium: !!u.is_premium,
      is_email_verified: !!u.is_email_verified,
      tv: dbTv,
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ⚠️ Prefer using signToken from auth.ts now (because it includes tv).
// Keeping this for backward compatibility only.
export function generateToken(payload: AuthPayload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");

  return jwt.sign(payload, secret, { expiresIn: "30d" });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}
