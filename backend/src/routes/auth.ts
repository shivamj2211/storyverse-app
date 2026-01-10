import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { creditCoinsIfEligible } from "../lib/coinEngine";

import { makeEmailVerifyToken, sha256Hex } from "../lib/emailVerify";
import { sendVerifyEmail, sendTempPasswordEmail, sendPasswordChangedEmail } from "../lib/mailer";

const router = Router();

type Plan = "free" | "premium" | "creator";

/** ✅ Strong password validation (server-side) */
function validateStrongPassword(pw: string) {
  if (!pw || pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter.";
  if (!/\d/.test(pw)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include a symbol.";
  if (/(password|123456|qwerty|admin|letmein|111111)/i.test(pw)) return "Password is too common.";
  return null;
}

function normalizePlan(plan: any, isPremium: any): Plan {
  const p = String(plan || "").toLowerCase();
  if (p === "premium" || p === "creator" || p === "free") return p as Plan;
  return isPremium ? "premium" : "free";
}

function mustJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required.");
  return secret;
}

/**
 * ✅ Include token_version in JWT (tv) so we can invalidate all sessions after password change.
 * Your requireAuth middleware must check token.tv === users.token_version
 */
function signToken(user: {
  id: string;
  email: string;
  plan: Plan;
  is_admin: boolean;
  is_premium: boolean;
  is_email_verified: boolean;
  token_version: number;
}) {
  const secret = mustJwtSecret();
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      plan: user.plan,
      is_admin: user.is_admin,
      is_premium: user.is_premium,
      is_email_verified: user.is_email_verified,
      tv: user.token_version,
    },
    secret,
    { expiresIn: "7d" }
  );
}

function frontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:3000";
}

/**
 * Send verification email + store token hash/expiry in DB
 */
async function issueEmailVerification(userId: string, email: string) {
  const { raw, hash, expiresAt } = makeEmailVerifyToken();

  await query(
    `UPDATE users
     SET is_email_verified = FALSE,
         email_verified_at = NULL,
         email_verify_token_hash = $1,
         email_verify_expires_at = $2
     WHERE id = $3`,
    [hash, expiresAt.toISOString(), userId]
  );

  const verifyUrl = `${frontendUrl()}/verify-email?token=${encodeURIComponent(raw)}`;
  await sendVerifyEmail(email, verifyUrl);
}

// ✅ SIGNUP
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const body = z
      .object({
        first_name: z.string().min(1).max(50),
        last_name: z.string().min(1).max(50),
        age: z.number().int().min(10).max(120).nullable().optional(),
        phone: z.string().min(6).max(20).nullable().optional(),
        email: z.string().email(),
        password: z.string().min(5).max(100),
      })
      .parse(req.body);

    const fullName = `${body.first_name.trim()} ${body.last_name.trim()}`.trim();

    const emailNorm = body.email.trim().toLowerCase();
    const exists = await query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [emailNorm]);

    if (exists.rows.length) {
      return res.status(400).json({
        error: "EMAIL_ALREADY_REGISTERED",
        message: "Email already registered. Please log in.",
      });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const insertRes = await query(
      `INSERT INTO users (email, phone, password_hash, full_name, age, is_email_verified)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING id, email, phone, full_name, age, coins, plan, is_admin, is_premium,
                 is_email_verified, email_verified_at, token_version`,
      [emailNorm, body.phone?.trim() || null, passwordHash, fullName, body.age ?? null]
    );

    const user = insertRes.rows[0];

    // ✅ signup bonus (non-blocking)
    try {
      await creditCoinsIfEligible({
        userId: user.id,
        ruleKey: "signup",
        reason: "signup",
        meta: {},
      });
    } catch (e) {
      console.error("Signup bonus failed (non-blocking):", e);
    }

    // ✅ email verify (non-blocking)
    try {
      await issueEmailVerification(user.id, user.email);
    } catch (e) {
      console.error("Email verification failed (non-blocking):", e);
    }

    // Re-fetch (coins + latest values)
    const refreshed = await query(
      `SELECT id, email, phone, full_name, age, coins, plan, is_admin, is_premium,
              is_email_verified, email_verified_at, token_version
       FROM users
       WHERE id=$1`,
      [user.id]
    );

    const u = refreshed.rows[0];
    const plan = normalizePlan(u.plan, u.is_premium);

    const token = signToken({
      id: u.id,
      email: u.email,
      plan,
      is_admin: u.is_admin,
      is_premium: u.is_premium,
      is_email_verified: !!u.is_email_verified,
      token_version: Number(u.token_version || 0),
    });

    return res.json({
      token,
      user: {
        id: u.id,
        email: u.email,
        phone: u.phone,
        full_name: u.full_name,
        age: u.age,
        coins: u.coins ?? 0,
        plan,
        is_admin: u.is_admin,
        is_premium: u.is_premium,
        is_email_verified: !!u.is_email_verified,
        email_verified_at: u.email_verified_at,
      },
      message: "Signup successful. Please verify your email.",
    });
  } catch (err: any) {
    console.error("Signup failed:", err?.message || err);
    if (err?.stack) console.error(err.stack);

    return res.status(500).json({
      error: "Signup failed",
      detail: err?.message || String(err),
    });
  }
});

// ✅ LOGIN
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const emailNorm = email.trim().toLowerCase();

    const result = await query(
      `SELECT id, email, password_hash, is_admin, is_premium, full_name, age, phone, coins, plan,
              is_email_verified, email_verified_at, token_version
       FROM users
       WHERE email = $1`,
      [emailNorm]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const plan = normalizePlan(user.plan, user.is_premium);

    const token = signToken({
      id: user.id,
      email: user.email,
      plan,
      is_admin: user.is_admin,
      is_premium: user.is_premium,
      is_email_verified: !!user.is_email_verified,
      token_version: Number(user.token_version || 0),
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        age: user.age,
        coins: user.coins ?? 0,
        plan,
        is_admin: user.is_admin,
        is_premium: user.is_premium,
        is_email_verified: !!user.is_email_verified,
        email_verified_at: user.email_verified_at,
      },
    });
  } catch (err) {
    console.error("Login failed:", err);
    return res.status(500).json({ error: "Login failed." });
  }
});

function makeTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  if (!/[A-Z]/.test(out)) out = "A" + out.slice(1);
  if (!/\d/.test(out)) out = out.slice(0, 9) + "7";
  return out;
}

router.post("/forgot-password", async (req: Request, res: Response) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const userRes = await query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    // ✅ Always return ok (no email enumeration)
    if (!userRes.rows.length) return res.json({ ok: true });

    const u = userRes.rows[0];

    const tempPassword = makeTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    await query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = TRUE,
           temp_password_expires_at = NOW() + interval '30 minutes',
           token_version = token_version + 1
       WHERE id = $2`,
      [hash, u.id]
    );

    await sendTempPasswordEmail(u.email, tempPassword);
    return res.json({ ok: true });
  } catch (e) {
    console.error("forgot-password failed:", e);
    return res.json({ ok: true });
  }
});

// ✅ VERIFY EMAIL (token from URL)
router.get("/verify-email", async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token || "");
    if (!token) return res.status(400).json({ error: "Missing token" });

    const tokenHash = sha256Hex(token);

    const dbRes = await query(
      `SELECT id, is_email_verified, email_verify_expires_at
       FROM users
       WHERE email_verify_token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    if (!dbRes.rows.length) return res.status(400).json({ error: "Invalid token" });

    const u = dbRes.rows[0];

    if (u.is_email_verified) {
      return res.json({ ok: true, status: "already_verified" });
    }

    if (!u.email_verify_expires_at || new Date(u.email_verify_expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "Token expired" });
    }

    await query(
      `UPDATE users
       SET is_email_verified = TRUE,
           email_verified_at = NOW(),
           email_verify_token_hash = NULL,
           email_verify_expires_at = NULL
       WHERE id = $1`,
      [u.id]
    );

    return res.json({ ok: true, status: "verified" });
  } catch (err: any) {
    console.error("Verify email failed:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ✅ RESEND VERIFICATION (logged-in)
router.post("/resend-verification", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const dbRes = await query(
      `SELECT id, email, is_email_verified
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (!dbRes.rows.length) return res.status(404).json({ error: "User not found" });

    const u = dbRes.rows[0];
    if (u.is_email_verified) return res.json({ status: "already_verified" });

    try {
      await issueEmailVerification(u.id, u.email);
      return res.json({ status: "sent" });
    } catch (e) {
      console.error("Resend verification failed (non-blocking):", e);
      return res.json({ status: "not_sent" });
    }
  } catch (err) {
    console.error("resend-verification failed:", err);
    return res.status(500).json({ error: "Unable to resend verification" });
  }
});

// ✅ ME
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const dbRes = await query(
      `SELECT id, email, phone, full_name, age, coins, plan, is_admin, is_premium,
              is_email_verified, email_verified_at, token_version
       FROM users
       WHERE id=$1`,
      [userId]
    );

    if (!dbRes.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const u = dbRes.rows[0];
    const plan = normalizePlan(u.plan, u.is_premium);

    const token = signToken({
      id: u.id,
      email: u.email,
      plan,
      is_admin: u.is_admin,
      is_premium: u.is_premium,
      is_email_verified: !!u.is_email_verified,
      token_version: Number(u.token_version || 0),
    });

    return res.json({
      token,
      user: {
        id: u.id,
        email: u.email,
        phone: u.phone,
        full_name: u.full_name,
        age: u.age,
        coins: u.coins ?? 0,
        plan,
        is_admin: u.is_admin,
        is_premium: u.is_premium,
        is_email_verified: !!u.is_email_verified,
        email_verified_at: u.email_verified_at,
      },
    });
  } catch (err) {
    console.error("Me failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ UPDATE PROFILE (full name, phone)
router.patch("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = z
      .object({
        full_name: z.string().min(1).max(100).optional(),
        phone: z.string().min(6).max(20).nullable().optional(),
      })
      .parse(req.body);

    const userId = req.user!.id;

    const updateRes = await query(
      `UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone)
       WHERE id = $3
       RETURNING id, email, phone, full_name, age, coins, plan, is_admin, is_premium,
                 is_email_verified, email_verified_at, token_version`,
      [body.full_name ?? null, body.phone ?? null, userId]
    );

    const u = updateRes.rows[0];
    const plan = normalizePlan(u.plan, u.is_premium);

    return res.json({
      user: {
        id: u.id,
        email: u.email,
        phone: u.phone,
        full_name: u.full_name,
        age: u.age,
        coins: u.coins ?? 0,
        plan,
        is_admin: u.is_admin,
        is_premium: u.is_premium,
        is_email_verified: !!u.is_email_verified,
        email_verified_at: u.email_verified_at,
      },
    });
  } catch (err) {
    console.error("Update profile failed:", err);
    return res.status(500).json({ error: "Unable to update profile" });
  }
});

// ✅ CHANGE EMAIL (kept as-is, but also refresh token_version in payload)
router.patch("/me/email", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(5) })
      .parse(req.body);

    const userId = req.user!.id;

    const dbRes = await query(
      `SELECT id, email, password_hash, is_admin, is_premium, full_name, age, phone, coins, plan,
              is_email_verified, email_verified_at, token_version
       FROM users WHERE id = $1`,
      [userId]
    );
    if (!dbRes.rows.length) return res.status(404).json({ error: "User not found" });

    const user = dbRes.rows[0];
    const ok = await bcrypt.compare(body.password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    const emailNorm = body.email.trim().toLowerCase();
    const exists = await query(
      `SELECT id FROM users WHERE email = $1 AND id <> $2`,
      [emailNorm, userId]
    );
    if (exists.rows.length) return res.status(400).json({ error: "Email already in use" });

    const updateRes = await query(
      `UPDATE users SET email = $1 WHERE id = $2
       RETURNING id, email, phone, full_name, age, coins, plan, is_admin, is_premium,
                 is_email_verified, email_verified_at, token_version`,
      [emailNorm, userId]
    );

    const u = updateRes.rows[0];

    // require verification again
    try {
      await issueEmailVerification(user.id, emailNorm);
    } catch (e) {
      console.error("Email verification send failed (non-blocking):", e);
    }

    const plan = normalizePlan(u.plan, u.is_premium);

    const token = signToken({
      id: u.id,
      email: u.email,
      plan,
      is_admin: u.is_admin,
      is_premium: u.is_premium,
      is_email_verified: false,
      token_version: Number(u.token_version || 0),
    });

    return res.json({
      token,
      user: {
        id: u.id,
        email: u.email,
        phone: u.phone,
        full_name: u.full_name,
        age: u.age,
        coins: u.coins ?? 0,
        plan,
        is_admin: u.is_admin,
        is_premium: u.is_premium,
        is_email_verified: false,
        email_verified_at: null,
      },
      message: "Email updated. Please verify your new email.",
    });
  } catch (err) {
    console.error("Change email failed:", err);
    return res.status(500).json({ error: "Unable to change email" });
  }
});

// ✅ CHANGE PASSWORD (requires current password) + strong rules + invalidate tokens + send email alert
router.patch("/me/password", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = z
      .object({
        current_password: z.string().min(1),
        new_password: z.string().min(5).max(100),
      })
      .parse(req.body);

    const userId = req.user!.id;

    const dbRes = await query(
      `SELECT id, email, password_hash, token_version
       FROM users
       WHERE id = $1`,
      [userId]
    );
    if (!dbRes.rows.length) return res.status(404).json({ error: "User not found" });

    const user = dbRes.rows[0];

    const ok = await bcrypt.compare(body.current_password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid current password" });

    // ✅ Strong password enforcement (FIXED)
    const ruleError = validateStrongPassword(body.new_password);
    if (ruleError) return res.status(400).json({ error: ruleError });

    const newHash = await bcrypt.hash(body.new_password, 10);

    // ✅ Update password + invalidate all old tokens
    await query(
      `UPDATE users
       SET password_hash = $1,
           must_change_password = FALSE,
           temp_password_expires_at = NULL,
           token_version = token_version + 1
       WHERE id = $2`,
      [newHash, userId]
    );

    // ✅ Security email alert (non-blocking)
    try {
      const ip =
        (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        undefined;

      const userAgent = String(req.headers["user-agent"] || "");

      await sendPasswordChangedEmail(user.email, {
        ip,
        userAgent,
        atISO: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Password changed email failed (non-blocking):", e);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Change password failed:", err);
    return res.status(500).json({ error: "Unable to change password" });
  }
});

export default router;
