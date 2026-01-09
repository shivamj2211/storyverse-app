import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../db";

const router = Router();

type WritingType = "shayari" | "poem" | "kids" | "micro" | "thought";
type WritingLang = "en" | "hi" | "hinglish";

const rails: Array<{ key: WritingType; title: string }> = [
  { key: "shayari", title: "❤️ Shayari Corner" },
  { key: "poem", title: "📝 Poems" },
  { key: "kids", title: "🧒 Kids Tales" },
  { key: "micro", title: "⚡ Micro Stories" },
  // later if needed:
  // { key: "thought", title: "💭 Thoughts" },
];

function parseLang(req: Request): WritingLang | null {
  const schema = z
    .object({
      lang: z.enum(["en", "hi", "hinglish"]).optional(),
    })
    .safeParse(req.query);

  if (!schema.success) return null;
  return schema.data.lang ?? null;
}

router.get("/explore", async (req: Request, res: Response) => {
  try {
    const lang = parseLang(req);

    const editorsLimit = 8;
    const railLimit = 10;

    // -------------------------
    // Editors Picks
    // -------------------------
    const editorsParams: any[] = [];
    let editorsWhere = `status = 'approved' AND is_editors_pick = true`;

    if (lang) {
      editorsParams.push(lang);
      editorsWhere += ` AND language = $${editorsParams.length}`;
    }

    const editorsSql = `
      SELECT
        id,
        type,
        language,
        title,
        content,
        is_editors_pick AS "isEditorsPick",
        likes_count AS "likesCount",
        views_count AS "viewsCount"
      FROM writings
      WHERE ${editorsWhere}
      ORDER BY published_at DESC NULLS LAST, created_at DESC
      LIMIT ${editorsLimit};
    `;

    const editorsPicks = (await query(editorsSql, editorsParams)).rows;

    // -------------------------
    // Rails (Trending + Fresh)
    // -------------------------
    const sections = [];

    for (const rail of rails) {
      const params: any[] = [rail.key];
      let where = `status = 'approved' AND type = $1`;

      if (lang) {
        params.push(lang);
        where += ` AND language = $${params.length}`;
      }

      // Mix: engagement + recency
      // You can tune weights later.
      const railSql = `
        SELECT
          id,
          type,
          language,
          title,
          content,
          is_editors_pick AS "isEditorsPick",
          likes_count AS "likesCount",
          views_count AS "viewsCount"
        FROM writings
        WHERE ${where}
        ORDER BY
          (likes_count * 3 + views_count) DESC,
          published_at DESC NULLS LAST,
          created_at DESC
        LIMIT ${railLimit};
      `;

      const items = (await query(railSql, params)).rows;

      sections.push({
        key: rail.key,
        title: rail.title,
        items,
      });
    }

    return res.json({ editorsPicks, sections });
  } catch (err: any) {
    console.error("GET /api/explore failed:", err?.message || err);
    if (err?.stack) console.error(err.stack);
    return res.status(500).json({ error: "Failed to load explore feed" });
  }
});

export default router;
