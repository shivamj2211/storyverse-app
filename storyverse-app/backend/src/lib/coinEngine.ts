import { query } from "../db";

/**
 * Credits coins using reward_rules.
 * - checks enabled
 * - checks daily cap (per rule, per user, per day)
 * - logs to coin_transactions
 * - updates users.coins
 * - duplicate-safe via unique index (user_id, type, reason, meta)
 */
export async function creditCoinsIfEligible(params: {
  userId: string;
  ruleKey: string; // e.g. 'chapter_complete' | 'chapter_rate' | 'signup'
  reason: string; // usually same as ruleKey
  meta: Record<string, any>; // e.g. { runId, nodeId }
}) {
  const { userId, ruleKey, reason, meta } = params;

  // 1) Load rule
  const ruleRes = await query<{ coins: number; enabled: boolean; daily_cap: number | null }>(
    `SELECT coins, enabled, daily_cap FROM reward_rules WHERE key = $1`,
    [ruleKey]
  );

  if (!ruleRes.rows.length) return;
  const rule = ruleRes.rows[0];
  if (!rule.enabled) return;

  const coins = Number(rule.coins || 0);
  if (coins <= 0) return;

  // 2) DAILY CAP enforcement (per ruleKey, per user, per day)
  // We count ONLY earned transactions for this reason on today's date.
  if (rule.daily_cap != null) {
    const cap = Number(rule.daily_cap);
    if (cap >= 0) {
      const todaySum = await query<{ sum: number }>(
        `
        SELECT COALESCE(SUM(coins), 0)::int AS sum
        FROM coin_transactions
        WHERE user_id = $1
          AND type = 'earn'
          AND reason = $2
          AND created_at >= date_trunc('day', NOW())
          AND created_at <  date_trunc('day', NOW()) + interval '1 day'
        `,
        [userId, reason]
      );

      const usedToday = Number(todaySum.rows?.[0]?.sum || 0);
      if (usedToday + coins > cap) {
        // cap reached → do nothing
        return;
      }
    }
  }

  // 3) Insert ledger entry (duplicate-safe)
  try {
    await query(
      `
      INSERT INTO coin_transactions (user_id, type, coins, reason, meta)
      VALUES ($1, 'earn', $2, $3, $4::jsonb)
      `,
      [userId, coins, reason, JSON.stringify(meta)]
    );
  } catch (err: any) {
    // duplicate reward → already credited
    if (err?.code === "23505") return;
    throw err;
  }

  // 4) Update user balance
  await query(
    `
    UPDATE users
    SET coins = COALESCE(coins, 0) + $2,
        updated_at = NOW()
    WHERE id = $1
    `,
    [userId, coins]
  );
}
