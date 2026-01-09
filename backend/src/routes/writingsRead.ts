import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

/**
 * GET /api/writings/:id
 * Public read for approved writings.
 * If logged in, also returns `likedByMe`.
 */
router.get("/writings/:id", async (req: Request, res: Response) => {
  try {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);

    const wRes = await query(
      `
      SELECT
        id,
        type,
        language,
        title,
        content,
        is_editors_pick AS "isEditorsPick",
        likes_count AS "likesCount",
        views_count AS "viewsCount",
        published_at AS "publishedAt",
        created_at AS "createdAt"
      FROM writings
      WHERE id = $1 AND status = 'approved'
      LIMIT 1;
      `,
      [params.id]
    );

    if (!wRes.rows.length) return res.status(404).json({ error: "Not found" });

    return res.json({ writing: wRes.rows[0] });
  } catch (err: any) {
    console.error("GET /api/writings/:id failed:", err?.message || err);
    return res.status(500).json({ error: "Unable to load writing" });
  }
});

/**
 * GET /api/writings/:id/me
 * Same as above, but includes likedByMe (auth required).
 */
router.get("/writings/:id/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const userId = req.user!.id;

    const wRes = await query(
      `
      SELECT
        id,
        type,
        language,
        title,
        content,
        is_editors_pick AS "isEditorsPick",
        likes_count AS "likesCount",
        views_count AS "viewsCount",
        published_at AS "publishedAt",
        created_at AS "createdAt"
      FROM writings
      WHERE id = $1 AND status = 'approved'
      LIMIT 1;
      `,
      [params.id]
    );

    if (!wRes.rows.length) return res.status(404).json({ error: "Not found" });

    const liked = await query(
      `SELECT 1 FROM writing_likes WHERE writing_id = $1 AND user_id = $2 LIMIT 1;`,
      [params.id, userId]
    );

    return res.json({ writing: wRes.rows[0], likedByMe: !!liked.rows.length });
  } catch (err: any) {
    console.error("GET /api/writings/:id/me failed:", err?.message || err);
    return res.status(500).json({ error: "Unable to load writing" });
  }
});

export default router;
