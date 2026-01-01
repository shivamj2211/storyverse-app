import { Router, Response } from "express";
import { query } from "../db";
import { requireAuth, requireAdmin, AuthRequest } from "../middlewares/auth"; // adjust path if different

const router = Router();

/**
 * GET /api/admin/users
 * Optional query params:
 *  - q: search by email/full_name/phone
 *  - limit, offset
 */
router.get("/", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
    const offset = parseInt(String(req.query.offset || "0"), 10) || 0;

    const params: any[] = [];
    let where = "";

    if (q) {
      params.push(`%${q}%`);
      where = `WHERE email ILIKE $${params.length}
               OR COALESCE(full_name,'') ILIKE $${params.length}
               OR COALESCE(phone,'') ILIKE $${params.length}`;
    }

    params.push(limit);
    params.push(offset);

    const sql = `
      SELECT id, email, COALESCE(full_name,'') AS full_name, COALESCE(phone,'') AS phone,
             COALESCE(coins,0) AS coins, COALESCE(is_admin,false) AS is_admin,
             COALESCE(is_premium,false) AS is_premium,
             created_at, updated_at
      FROM users
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const r = await query(sql, params);
    return res.json({ users: r.rows });
  } catch (err) {
    console.error("GET /api/admin/users failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Body: { full_name?, phone?, is_admin?, is_premium? }
 */
router.patch("/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "id required" });

    const full_name = req.body?.full_name;
    const phone = req.body?.phone;
    const is_admin = req.body?.is_admin;
    const is_premium = req.body?.is_premium;

    const fields: string[] = [];
    const params: any[] = [id];

    function addField(col: string, val: any) {
      params.push(val);
      fields.push(`${col} = $${params.length}`);
    }

    if (full_name !== undefined) addField("full_name", String(full_name));
    if (phone !== undefined) addField("phone", String(phone));
    if (is_admin !== undefined) addField("is_admin", Boolean(is_admin));
    if (is_premium !== undefined) addField("is_premium", Boolean(is_premium));

    if (fields.length === 0) return res.status(400).json({ error: "no fields to update" });

    const sql = `
      UPDATE users
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, COALESCE(full_name,'') AS full_name, COALESCE(phone,'') AS phone,
                COALESCE(coins,0) AS coins, COALESCE(is_admin,false) AS is_admin,
                COALESCE(is_premium,false) AS is_premium, created_at, updated_at
    `;

    const r = await query(sql, params);
    if (!r.rows.length) return res.status(404).json({ error: "User not found" });

    return res.json({ user: r.rows[0] });
  } catch (err) {
    console.error("PATCH /api/admin/users/:id failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/admin/users/:id/coins
 * Body: { delta: number, reason?: string }
 */
router.post("/:id/coins", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || "").trim();
    const delta = Number(req.body?.delta);

    if (!id) return res.status(400).json({ error: "id required" });
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: "delta must be a non-zero number" });
    }

    const r = await query(
      `UPDATE users
       SET coins = COALESCE(coins,0) + $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, COALESCE(coins,0) AS coins`,
      [id, delta]
    );

    if (!r.rows.length) return res.status(404).json({ error: "User not found" });
    return res.json({ user: r.rows[0] });
  } catch (err) {
    console.error("POST /api/admin/users/:id/coins failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/admin/users/:id
 * (optional — usually you disable accounts instead of deleting)
 */
router.delete("/:id", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "id required" });

    await query(`DELETE FROM users WHERE id = $1`, [id]);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/users/:id failed:", err);

    // FK violation
    if (err?.code === "23503") {
      return res.status(409).json({ error: "User has related records. Can't delete." });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
