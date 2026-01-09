import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../db";
import { writingViewLimiter } from "../middlewares/rateLimit";

const router = Router();

// allow 30 view pings / minute per IP
router.post("/writings/:id/view", writingViewLimiter, async (req: Request, res: Response) =>  {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(req.params);

      // increment views and get updated count + author
      const up = await query(
        `
        UPDATE writings
        SET views_count = views_count + 1
        WHERE id = $1 AND status = 'approved'
        RETURNING views_count, author_user_id;
        `,
        [params.id]
      );

      if (!up.rows.length) return res.status(404).json({ error: "Not found" });

      const { views_count, author_user_id } = up.rows[0];

      // reward milestones (author earns coins)
      const milestones: Array<[number, number]> = [
        [100, 2],   // at 100 views => +2 coins
        [500, 5],   // at 500 views => +5 coins
        [1000, 10], // at 1000 views => +10 coins
      ];

      if (author_user_id) {
        for (const [m, coins] of milestones) {
          if (views_count >= m) {
            const ins = await query(
              `
              INSERT INTO writing_view_milestones (writing_id, milestone)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
              RETURNING writing_id;
              `,
              [params.id, m]
            );

            if (ins.rows.length) {
              await query(`UPDATE users SET coins = COALESCE(coins,0) + $1 WHERE id = $2;`, [
                coins,
                author_user_id,
              ]);
            }
          }
        }
      }

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("POST /api/writings/:id/view failed:", err?.message || err);
      return res.status(500).json({ error: "Unable to record view" });
    }
  }
);

export default router;
