import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { creditCoinsIfEligible } from "../lib/coinEngine";

const router = Router();

type Plan = "free" | "premium" | "creator";

function normalizePlan(plan: any, isPremium: any): Plan {
  const p = String(plan || "").toLowerCase();
  if (p === "premium" || p === "creator" || p === "free") return p as Plan;
  return isPremium ? "premium" : "free";
}

function signToken(user: {
  id: string;
  email: string;
  plan: Plan; // ✅ ADDED
  is_admin: boolean;
  is_premium: boolean;
}) {
  const secret = process.env.JWT_SECRET || "secret";
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      plan: user.plan, // ✅ ADDED
      is_admin: user.is_admin,
      is_premium: user.is_premium,
    },
    secret,
    { expiresIn: "7d" }
  );
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
    const passwordHash = await bcrypt.hash(body.password, 10);

    const insertRes = await query(
      `INSERT INTO users (email, phone, password_hash, full_name, age)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, phone, full_name, age, coins, plan, is_admin, is_premium`,
      [
        body.email.trim().toLowerCase(),
        body.phone?.trim() || null,
        passwordHash,
        fullName,
        body.age ?? null,
      ]
    );

    const user = insertRes.rows[0];

    // ✅ SIGNUP BONUS (ADMIN-CONTROLLED)
    await creditCoinsIfEligible({
      userId: user.id,
      ruleKey: "signup",
      reason: "signup",
      meta: {},
    });

    // Re-fetch coins after bonus (so UI gets updated coins)
    const refreshed = await query(
      `SELECT id, email, phone, full_name, age, coins, plan, is_admin, is_premium
       FROM users
       WHERE id=$1`,
      [user.id]
    );
    const u = refreshed.rows[0];

    const plan = normalizePlan(u.plan, u.is_premium);

    const token = signToken({
      id: u.id,
      email: u.email,
      plan, // ✅ ADDED
      is_admin: u.is_admin,
      is_premium: u.is_premium,
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
      },
    });
  } catch (err) {
    console.error("Signup failed:", err);
    return res.status(500).json({
      error:
        "Signup failed. Check DATABASE_URL, Postgres running, and schema_core.sql applied.",
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
      `SELECT id, email, password_hash, is_admin, is_premium, full_name, age, phone, coins, plan
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
      plan, // ✅ ADDED
      is_admin: user.is_admin,
      is_premium: user.is_premium,
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
      },
    });
  } catch (err) {
    console.error("Login failed:", err);
    return res.status(500).json({ error: "Login failed." });
  }
});

// ✅ ME
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const dbRes = await query(
      `SELECT id, email, phone, full_name, age, coins, plan, is_admin, is_premium
       FROM users
       WHERE id=$1`,
      [userId]
    );

    if (!dbRes.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const u = dbRes.rows[0];
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
       RETURNING id, email, phone, full_name, age, coins, plan, is_admin, is_premium`,
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
      },
    });
  } catch (err) {
    console.error("Update profile failed:", err);
    return res.status(500).json({ error: "Unable to update profile" });
  }
});

// ✅ CHANGE EMAIL (requires current password)
router.patch("/me/email", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string().min(5) }).parse(req.body);

    const userId = req.user!.id;

    const dbRes = await query(
      `SELECT id, email, password_hash, is_admin, is_premium, full_name, age, phone, coins, plan
       FROM users WHERE id = $1`,
      [userId]
    );
    if (!dbRes.rows.length) return res.status(404).json({ error: "User not found" });

    const user = dbRes.rows[0];
    const ok = await bcrypt.compare(body.password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    const emailNorm = body.email.trim().toLowerCase();
    // ensure unique
    const exists = await query(`SELECT id FROM users WHERE email = $1 AND id <> $2`, [emailNorm, userId]);
    if (exists.rows.length) return res.status(400).json({ error: "Email already in use" });

    const updateRes = await query(
      `UPDATE users SET email = $1 WHERE id = $2
       RETURNING id, email, phone, full_name, age, coins, plan, is_admin, is_premium`,
      [emailNorm, userId]
    );

    const u = updateRes.rows[0];
    const plan = normalizePlan(u.plan, u.is_premium);

    // Issue a new token (email changed)
    const token = signToken({
      id: u.id,
      email: u.email,
      plan, // ✅ ADDED
      is_admin: u.is_admin,
      is_premium: u.is_premium,
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
      },
    });
  } catch (err) {
    console.error("Change email failed:", err);
    return res.status(500).json({ error: "Unable to change email" });
  }
});

// ✅ CHANGE PASSWORD (requires current password)
router.patch("/me/password", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = z.object({ current_password: z.string().min(1), new_password: z.string().min(5).max(100) }).parse(req.body);

    const userId = req.user!.id;
    const dbRes = await query(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
    if (!dbRes.rows.length) return res.status(404).json({ error: "User not found" });

    const user = dbRes.rows[0];
    const ok = await bcrypt.compare(body.current_password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid current password" });

    const newHash = await bcrypt.hash(body.new_password, 10);
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);

    return res.json({ success: true });
  } catch (err) {
    console.error("Change password failed:", err);
    return res.status(500).json({ error: "Unable to change password" });
  }
});

export default router;
