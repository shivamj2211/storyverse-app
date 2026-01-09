import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../db";

const router = Router();

router.get("/explore/editors-picks", async (req: Request, res: Response) => {
  try {
    const q = z
      .object({
        lang: z.enum(["en", "hi", "hinglish"]).optional(),
        limit: z.coerce.number().int().min(1).max(50).optional(),
        offset: z.coerce.number().int().min(0).optional(),
      })
      .parse(req.query);

    const limit = q.limit ?? 30;
    const offset = q.offset ?? 0;
    const lang = q.lang ?? null;

    const params: any[] = [limit, offset];
    let where = `status = 'approved' AND is_editors_pick = true`;

    if (lang) {
      params.unshift(lang);
      where += ` AND language = $1`;
      // limit becomes $2 offset $3
      const rows = await query(
        `
        SELECT id, type, language, title, content,
               is_editors_pick AS "isEditorsPick",
               likes_count AS "likesCount",
               views_count AS "viewsCount",
               published_at AS "publishedAt"
        FROM writings
        WHERE ${where}
        ORDER BY published_at DESC NULLS LAST, created_at DESC
        LIMIT $2 OFFSET $3;
        `,
        params
      );
      return res.json({ items: rows.rows, limit, offset, hasMore: rows.rows.length === limit });
    }

    const rows = await query(
      `
      SELECT id, type, language, title, content,
             is_editors_pick AS "isEditorsPick",
             likes_count AS "likesCount",
             views_count AS "viewsCount",
             published_at AS "publishedAt"
      FROM writings
      WHERE ${where}
      ORDER BY published_at DESC NULLS LAST, created_at DESC
      LIMIT $1 OFFSET $2;
      `,
      params
    );

    return res.json({ items: rows.rows, limit, offset, hasMore: rows.rows.length === limit });
  } catch (err: any) {
    console.error("GET /api/explore/editors-picks failed:", err?.message || err);
    return res.status(500).json({ error: "Failed to load editor picks" });
  }
});

export default router;
