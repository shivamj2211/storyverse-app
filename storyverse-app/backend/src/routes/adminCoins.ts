import { Router, Response } from "express";
import { query } from "../db";
import { requireAuth, requireAdmin, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/admin/coins/summary
router.get("/summary", requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    // available = sum(users.coins)
    const avail = await query<{ available: number }>(
      `SELECT COALESCE(SUM(COALESCE(coins,0)),0)::int AS available FROM users`
    );

    // used = sum of redeem transactions (positive number of coins used)
    const used = await query<{ used: number }>(
      `SELECT COALESCE(SUM(ABS(coins)),0)::int AS used
       FROM coin_transactions
       WHERE type = 'redeem'`
    );

    // earned = sum of earn + adjust positive
    const earned = await query<{ earned: number }>(
      `SELECT COALESCE(SUM(coins),0)::int AS earned
       FROM coin_transactions
       WHERE type IN ('earn','adjust') AND coins > 0`
    );

    return res.json({
      available: avail.rows[0]?.available ?? 0,
      used: used.rows[0]?.used ?? 0,
      earned: earned.rows[0]?.earned ?? 0,
    });
  } catch (err) {
    console.error("GET /api/admin/coins/summary failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/coins/transactions?q=email&limit=50&offset=0
router.get("/transactions", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
    const offset = parseInt(String(req.query.offset || "0"), 10) || 0;

    let sql = `
      SELECT
        t.id, t.user_id, u.email,
        t.type, t.coins, COALESCE(t.reason,'') AS reason,
        t.meta, t.created_at
      FROM coin_transactions t
      JOIN users u ON u.id = t.user_id
    `;

    const params: any[] = [];
    if (q) {
      params.push(`%${q}%`);
      sql += ` WHERE u.email ILIKE $${params.length}`;
    }

    params.push(limit);
    params.push(offset);

    sql += `
      ORDER BY t.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const r = await query(sql, params);
    return res.json({ transactions: r.rows });
  } catch (err) {
    console.error("GET /api/admin/coins/transactions failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/coins/adjust { user_id, delta, reason? }
router.post("/adjust", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const user_id = String(req.body?.user_id || "").trim();
    const delta = Number(req.body?.delta);
    const reason = String(req.body?.reason || "admin_adjust").trim();

    if (!user_id) return res.status(400).json({ error: "user_id required" });
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: "delta must be non-zero number" });
    }

    // 1) update users.coins
    const u = await query(
      `UPDATE users
       SET coins = COALESCE(coins,0) + $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, COALESCE(coins,0)::int AS coins`,
      [user_id, delta]
    );
    if (!u.rows.length) return res.status(404).json({ error: "User not found" });

    // 2) ledger entry
    await query(
      `INSERT INTO coin_transactions (user_id, type, coins, reason, meta)
       VALUES ($1, 'adjust', $2, $3, $4::jsonb)`,
      [user_id, delta, reason, JSON.stringify({ by_admin: req.user?.id || null })]
    );

    return res.json({ ok: true, user: u.rows[0] });
  } catch (err) {
    console.error("POST /api/admin/coins/adjust failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ POST /api/admin/coins/refund { transaction_id }
router.post("/refund", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const transaction_id = String(req.body?.transaction_id || "").trim();
    if (!transaction_id) return res.status(400).json({ error: "transaction_id required" });

    // 1) load original transaction
    const txRes = await query<{
      id: string;
      user_id: string;
      coins: number;
      type: string;
      reason: string | null;
      meta: any;
    }>(
      `SELECT id, user_id, coins, type, reason, meta
       FROM coin_transactions
       WHERE id = $1`,
      [transaction_id]
    );

    if (!txRes.rows.length) return res.status(404).json({ error: "Transaction not found" });
    const tx = txRes.rows[0];

    // 2) prevent double refund (idempotent)
    const already = await query(
      `SELECT 1 FROM coin_transactions
       WHERE reason = 'refund'
         AND (meta->>'refunded_tx_id') = $1
       LIMIT 1`,
      [transaction_id]
    );
    if (already.rows.length) return res.status(400).json({ error: "Already refunded" });

    // 3) reverse amount
    // earn +10  -> refund -10
    // redeem -20 -> refund +20
    const delta = -Number(tx.coins);

    // 4) insert refund transaction
    await query(
      `INSERT INTO coin_transactions (user_id, type, coins, reason, meta)
       VALUES ($1, 'adjust', $2, 'refund', $3::jsonb)`,
      [
        tx.user_id,
        delta,
        JSON.stringify({
          refunded_tx_id: tx.id,
          original_type: tx.type,
          original_reason: tx.reason || "",
          by_admin: req.user?.id || null,
        }),
      ]
    );

    // 5) update user balance
    const u = await query(
      `UPDATE users
       SET coins = COALESCE(coins,0) + $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, COALESCE(coins,0)::int AS coins`,
      [tx.user_id, delta]
    );

    return res.json({ ok: true, delta, user: u.rows[0] });
  } catch (err) {
    console.error("POST /api/admin/coins/refund failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
