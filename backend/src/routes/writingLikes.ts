import { Router, Response } from "express";
import { z } from "zod";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { writingLikeLimiter } from "../middlewares/rateLimit";

const router = Router();

// allow 20 like toggles / minute per user
router.post("/writings/:id/like", requireAuth, writingLikeLimiter, async (req: AuthRequest, res: Response) => {
    try {
      const params = z.object({ id: z.string().uuid() }).parse(req.params);
      const userId = req.user!.id;

      // Check writing + author (only approved)
      const w = await query(
        `SELECT id, author_user_id FROM writings WHERE id = $1 AND status = 'approved' LIMIT 1;`,
        [params.id]
      );
      if (!w.rows.length) return res.status(404).json({ error: "Not found" });

      const authorId: string | null = w.rows[0].author_user_id;

      const exists = await query(
        `SELECT 1 FROM writing_likes WHERE writing_id = $1 AND user_id = $2 LIMIT 1;`,
        [params.id, userId]
      );

      if (exists.rows.length) {
        // UNLIKE
        await query(`DELETE FROM writing_likes WHERE writing_id = $1 AND user_id = $2;`, [
          params.id,
          userId,
        ]);

        await query(
          `UPDATE writings SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1;`,
          [params.id]
        );

        return res.json({ liked: false });
      }

      // LIKE
      await query(
        `
        INSERT INTO writing_likes (writing_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
        `,
        [params.id, userId]
      );

      await query(`UPDATE writings SET likes_count = likes_count + 1 WHERE id = $1;`, [params.id]);

      // Reward author: +1 coin per unique liker (not if author likes own post)
      if (authorId && authorId !== userId) {
        const r = await query(
          `
          INSERT INTO writing_like_rewards (writing_id, liker_user_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          RETURNING writing_id;
          `,
          [params.id, userId]
        );

        if (r.rows.length) {
          await query(`UPDATE users SET coins = COALESCE(coins,0) + 1 WHERE id = $1;`, [authorId]);
        }
      }

      return res.json({ liked: true });
    } catch (err: any) {
      console.error("POST /api/writings/:id/like failed:", err?.message || err);
      return res.status(500).json({ error: "Unable to toggle like" });
    }
  }
);

export default router;
