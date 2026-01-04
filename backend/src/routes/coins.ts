import { Router } from "express";
import { query } from "../db";
import { requireAuth } from "../middlewares/auth"; // ✅ use SAME auth middleware as other routes

const router = Router();

/**
 * GET /api/coins/summary
 * -> { available, used }
 */
router.get("/summary", requireAuth, async (req, res) => {
  const userId = req.user!.id;

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
 * GET /api/coins/history?type=earn|redeem|all
 * - earn => shows earned-like entries
 * - redeem => shows redemptions
 * - all => everything
 */
router.get("/history", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const type = String(req.query.type || "all").toLowerCase();

  // ✅ what counts as "earned" in your product
  // If your coinEngine uses types like 'signup', 'chapter_rate', 'chapter_complete', 'adjust'
  // they should still appear under Earned tab.
  const earnTypes = ["earn", "signup", "chapter_rate", "chapter_complete", "adjust", "reward", "credit"];

  let whereSql = `WHERE user_id=$1`;
  const params: any[] = [userId];

  if (type === "redeem") {
    whereSql += ` AND type='redeem'`;
  } else if (type === "earn") {
    // include multiple earned-like types + positive coins safeguard
    whereSql += ` AND (type = ANY($2) OR coins > 0)`;
    params.push(earnTypes);
  } else if (type !== "all") {
    // if some specific type passed, filter it directly
    whereSql += ` AND type=$2`;
    params.push(type);
  }

  const q = await query<any>(
    `SELECT id, type, coins, created_at, meta
     FROM coin_transactions
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT 200`,
    params
  );

  res.json({
    history: q.rows.map((r: any) => ({
      id: r.id,
      type: r.type,
      coins: Number(r.coins),
      created_at: r.created_at,
      // support both old + new meta keys
      story_id: r.meta?.story_id ?? null,
      story_title: r.meta?.story_title ?? null,
      chapter_number: r.meta?.chapter_number ?? null,
      reason: r.meta?.reason ?? null,
    })),
  });
});

export default router;
