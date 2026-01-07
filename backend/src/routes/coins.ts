import { Router } from "express";
import { query } from "../db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

/**
 * GET /api/coins/summary
 * Returns:
 *  - available: current wallet coins (from users.coins)
 *  - used: total redeemed coins (sum of ABS(redeem))
 */
router.get("/summary", requireAuth, async (req, res) => {
  const userId = req.user.id;

  const userQ = await query<{ coins: number }>(
    `SELECT coins FROM users WHERE id=$1`,
    [userId]
  );
  const available = Number(userQ.rows[0]?.coins ?? 0);

  const usedQ = await query<{ used: number }>(
    `SELECT COALESCE(SUM(ABS(coins)),0) AS used
     FROM coin_transactions
     WHERE user_id=$1 AND type='redeem'`,
    [userId]
  );
  const used = Number(usedQ.rows[0]?.used ?? 0);

  res.json({ available, used });
});

/**
 * GET /api/coins/history?type=earn|redeem|adjust
 * Returns both:
 *  - items: [...]   ✅ what your new frontend expects
 *  - history: [...] ✅ backward compatible (if any old UI uses it)
 */
router.get("/history", requireAuth, async (req, res) => {
  const userId = req.user.id;

  const type = String(req.query.type || "").trim(); // earn | redeem | adjust | empty
  const validTypes = new Set(["earn", "redeem", "adjust"]);

  const params: any[] = [userId];
  let typeSql = "";

  if (type && validTypes.has(type)) {
    params.push(type);
    typeSql = `AND type = $2`;
  }

  const q = await query<any>(
    `SELECT id, type, coins, created_at, meta
     FROM coin_transactions
     WHERE user_id=$1 ${typeSql}
     ORDER BY created_at DESC
     LIMIT 200`,
    params
  );

  const mapped = q.rows.map((r: any) => ({
    id: r.id,
    type: r.type,
    coins: Number(r.coins),
    created_at: r.created_at,

    // Support both key styles in meta (old/new)
    story_title: r.meta?.story_title ?? r.meta?.storyTitle ?? null,
    chapter_number: r.meta?.chapter_number ?? r.meta?.chapterNumber ?? null,
    note: r.meta?.note ?? null,
  }));

  // ✅ return BOTH keys so nothing breaks anywhere
  res.json({
    items: mapped,   // new
    history: mapped, // old compatibility
  });
});

export default router;
