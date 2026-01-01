"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const db_1 = require("../db");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
function signToken(user) {
    const secret = process.env.JWT_SECRET || "secret";
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
        is_premium: user.is_premium,
    }, secret, { expiresIn: "7d" });
}
// ✅ SIGNUP
router.post("/signup", async (req, res) => {
    try {
        const body = zod_1.z
            .object({
            first_name: zod_1.z.string().min(1).max(50),
            last_name: zod_1.z.string().min(1).max(50),
            age: zod_1.z.number().int().min(10).max(120).nullable().optional(),
            phone: zod_1.z.string().min(6).max(20).nullable().optional(),
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(5).max(100),
        })
            .parse(req.body);
        const fullName = `${body.first_name.trim()} ${body.last_name.trim()}`.trim();
        const passwordHash = await bcryptjs_1.default.hash(body.password, 10);
        const insertRes = await (0, db_1.query)(`INSERT INTO users (email, phone, password_hash, full_name, age)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, phone, full_name, age, coins, plan, is_admin, is_premium`, [
            body.email.trim().toLowerCase(),
            body.phone?.trim() || null,
            passwordHash,
            fullName,
            body.age ?? null,
        ]);
        const user = insertRes.rows[0];
        const token = signToken({
            id: user.id,
            email: user.email,
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
                plan: user.plan ?? (user.is_premium ? "premium" : "free"),
                is_admin: user.is_admin,
                is_premium: user.is_premium,
            },
        });
    }
    catch (err) {
        console.error("Signup failed:", err);
        return res.status(500).json({
            error: "Signup failed. Check DATABASE_URL, Postgres running, and schema_core.sql applied.",
        });
    }
});
// ✅ LOGIN
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }
    try {
        const emailNorm = email.trim().toLowerCase();
        const result = await (0, db_1.query)(`SELECT id, email, password_hash, is_admin, is_premium, full_name, age, phone, coins, plan
       FROM users
       WHERE email = $1`, [emailNorm]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials." });
        }
        const user = result.rows[0];
        const ok = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!ok) {
            return res.status(401).json({ error: "Invalid credentials." });
        }
        const token = signToken({
            id: user.id,
            email: user.email,
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
                plan: user.plan ?? (user.is_premium ? "premium" : "free"),
                is_admin: user.is_admin,
                is_premium: user.is_premium,
            },
        });
    }
    catch (err) {
        console.error("Login failed:", err);
        return res.status(500).json({ error: "Login failed." });
    }
});
// ✅ ME
router.get("/me", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbRes = await (0, db_1.query)(`SELECT id, email, phone, full_name, age, coins, plan, is_admin, is_premium
       FROM users
       WHERE id=$1`, [userId]);
        if (!dbRes.rows.length) {
            return res.status(404).json({ error: "User not found" });
        }
        const u = dbRes.rows[0];
        return res.json({
            user: {
                id: u.id,
                email: u.email,
                phone: u.phone,
                full_name: u.full_name,
                age: u.age,
                coins: u.coins ?? 0,
                plan: u.plan ?? (u.is_premium ? "premium" : "free"),
                is_admin: u.is_admin,
                is_premium: u.is_premium,
            },
        });
    }
    catch (err) {
        console.error("Me failed:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// ✅ UPDATE PROFILE (full name, phone)
router.patch("/me", auth_1.requireAuth, async (req, res) => {
    try {
        const body = zod_1.z
            .object({ full_name: zod_1.z.string().min(1).max(100).optional(), phone: zod_1.z.string().min(6).max(20).nullable().optional() })
            .parse(req.body);
        const userId = req.user.id;
        const updateRes = await (0, db_1.query)(`UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone)
       WHERE id = $3
       RETURNING id, email, phone, full_name, age, coins, plan, is_admin, is_premium`, [body.full_name ?? null, body.phone ?? null, userId]);
        const u = updateRes.rows[0];
        return res.json({
            user: {
                id: u.id,
                email: u.email,
                phone: u.phone,
                full_name: u.full_name,
                age: u.age,
                coins: u.coins ?? 0,
                plan: u.plan ?? (u.is_premium ? "premium" : "free"),
                is_admin: u.is_admin,
                is_premium: u.is_premium,
            },
        });
    }
    catch (err) {
        console.error("Update profile failed:", err);
        return res.status(500).json({ error: "Unable to update profile" });
    }
});
// ✅ CHANGE EMAIL (requires current password)
router.patch("/me/email", auth_1.requireAuth, async (req, res) => {
    try {
        const body = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(5) }).parse(req.body);
        const userId = req.user.id;
        const dbRes = await (0, db_1.query)(`SELECT id, email, password_hash, is_admin, is_premium, full_name, age, phone, coins, plan FROM users WHERE id = $1`, [userId]);
        if (!dbRes.rows.length)
            return res.status(404).json({ error: "User not found" });
        const user = dbRes.rows[0];
        const ok = await bcryptjs_1.default.compare(body.password, user.password_hash);
        if (!ok)
            return res.status(401).json({ error: "Invalid password" });
        const emailNorm = body.email.trim().toLowerCase();
        // ensure unique
        const exists = await (0, db_1.query)(`SELECT id FROM users WHERE email = $1 AND id <> $2`, [emailNorm, userId]);
        if (exists.rows.length)
            return res.status(400).json({ error: "Email already in use" });
        const updateRes = await (0, db_1.query)(`UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email, phone, full_name, age, coins, plan, is_admin, is_premium`, [emailNorm, userId]);
        const u = updateRes.rows[0];
        // Issue a new token (email changed)
        const token = signToken({ id: u.id, email: u.email, is_admin: u.is_admin, is_premium: u.is_premium });
        return res.json({ token, user: { id: u.id, email: u.email, phone: u.phone, full_name: u.full_name, age: u.age, coins: u.coins ?? 0, plan: u.plan ?? (u.is_premium ? "premium" : "free"), is_admin: u.is_admin, is_premium: u.is_premium } });
    }
    catch (err) {
        console.error("Change email failed:", err);
        return res.status(500).json({ error: "Unable to change email" });
    }
});
// ✅ CHANGE PASSWORD (requires current password)
router.patch("/me/password", auth_1.requireAuth, async (req, res) => {
    try {
        const body = zod_1.z.object({ current_password: zod_1.z.string().min(1), new_password: zod_1.z.string().min(5).max(100) }).parse(req.body);
        const userId = req.user.id;
        const dbRes = await (0, db_1.query)(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
        if (!dbRes.rows.length)
            return res.status(404).json({ error: "User not found" });
        const user = dbRes.rows[0];
        const ok = await bcryptjs_1.default.compare(body.current_password, user.password_hash);
        if (!ok)
            return res.status(401).json({ error: "Invalid current password" });
        const newHash = await bcryptjs_1.default.hash(body.new_password, 10);
        await (0, db_1.query)(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);
        return res.json({ success: true });
    }
    catch (err) {
        console.error("Change password failed:", err);
        return res.status(500).json({ error: "Unable to change password" });
    }
});
exports.default = router;
