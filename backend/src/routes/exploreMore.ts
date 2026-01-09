import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../db";

const router = Router();

type WritingType = "shayari" | "poem" | "kids" | "micro" | "thought";
type WritingLang = "en" | "hi" | "hinglish";

function parseType(req: Request): WritingType {
  const schema = z.object({
    type: z.enum(["shayari", "poem", "kids", "micro", "thought"]),
  });
  return schema.parse(req.params).type;
}

function parseQuery(req: Request) {
  const schema = z.object({
    lang: z.enum(["en", "hi", "hinglish"]).optional(),
    sort: z.enum(["trending", "latest"]).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    offset: z.coerce.number().int().min(0).max(5000).optional(),
  });
  const q = schema.parse(req.query);
  return {
    lang: (q.lang ?? null) as WritingLang | null,
    sort: (q.sort ?? "trending") as "trending" | "latest",
    limit: q.limit ?? 20,
    offset: q.offset ?? 0,
  };
}

router.get("/explore/:type", async (req: Request, res: Response) => {
  try {
    const type = parseType(req);
    const { lang, sort, limit, offset } = parseQuery(req);

    const params: any[] = [type];
    let where = `status = 'approved' AND type = $1`;

    if (lang) {
      params.push(lang);
      where += ` AND language = $${params.length}`;
    }

    const orderBy =
      sort === "latest"
        ? `published_at DESC NULLS LAST, created_at DESC`
        : `(likes_count * 3 + views_count) DESC, published_at DESC NULLS LAST, created_at DESC`;

    params.push(limit, offset);

    const sql = `
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
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1}
      OFFSET $${params.length};
    `;

    const rows = (await query(sql, params)).rows;

    return res.json({
      type,
      lang,
      sort,
      limit,
      offset,
      items: rows,
      hasMore: rows.length === limit,
    });
  } catch (err: any) {
    console.error("GET /api/explore/:type failed:", err?.message || err);
    if (err?.stack) console.error(err.stack);
    return res.status(500).json({ error: "Failed to load explore list" });
  }
});

export default router;
