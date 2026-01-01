import { Router, Response } from "express";
import { query } from "../db";
import { requireAuth, requireAdmin, AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/admin/reward-rules
router.get("/", requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const r = await query(
      `SELECT key, label, coins, enabled, daily_cap, meta, updated_at
       FROM reward_rules
       ORDER BY key ASC`
    );
    return res.json({ rules: r.rows });
  } catch (err) {
    console.error("GET /api/admin/reward-rules failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/reward-rules/:key
// Body can include: { coins?, enabled?, label?, daily_cap? }
router.patch("/:key", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.params.key || "").trim();
    if (!key) return res.status(400).json({ error: "key required" });

    const coins = req.body?.coins;
    const enabled = req.body?.enabled;
    const label = req.body?.label;
    const daily_cap_raw = req.body?.daily_cap;

    const fields: string[] = [];
    const params: any[] = [key];

    const add = (col: string, val: any) => {
      params.push(val);
      fields.push(`${col} = $${params.length}`);
    };

    if (label !== undefined) {
      add("label", String(label));
    }

    if (coins !== undefined) {
      const c = Number(coins);
      if (!Number.isFinite(c)) {
        return res.status(400).json({ error: "coins must be a number" });
      }
      add("coins", c);
    }

    if (enabled !== undefined) {
      add("enabled", Boolean(enabled));
    }

    if (daily_cap_raw !== undefined) {
      if (daily_cap_raw === null) {
        // remove cap
        add("daily_cap", null);
      } else {
        const cap = Number(daily_cap_raw);
        if (!Number.isFinite(cap) || cap < 0) {
          return res.status(400).json({
            error: "daily_cap must be null or a non-negative number",
          });
        }
        add("daily_cap", cap);
      }
    }

    if (!fields.length) {
      return res.status(400).json({ error: "no fields to update" });
    }

    const r = await query(
      `UPDATE reward_rules
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE key = $1
       RETURNING key, label, coins, enabled, daily_cap, meta, updated_at`,
      params
    );

    if (!r.rows.length) {
      return res.status(404).json({ error: "Rule not found" });
    }

    return res.json({ rule: r.rows[0] });
  } catch (err) {
    console.error("PATCH /api/admin/reward-rules/:key failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
