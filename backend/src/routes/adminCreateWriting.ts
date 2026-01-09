import { Router, Response } from "express";
import { z } from "zod";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

function requireAdmin(req: AuthRequest) {
  if (!req.user?.is_admin) {
    const err: any = new Error("Admin only");
    err.status = 403;
    throw err;
  }
}

router.post("/admin/writings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    requireAdmin(req);

    const body = z
      .object({
        type: z.enum(["shayari", "poem", "kids", "micro", "thought"]),
        language: z.enum(["en", "hi", "hinglish"]),
        title: z.string().max(120).nullable().optional(),
        content: z.string().min(5).max(8000),
        isEditorsPick: z.boolean().optional(),
      })
      .parse(req.body);

    const ins = await query(
      `
      INSERT INTO writings
        (author_user_id, is_admin, status, is_editors_pick, type, language, title, content, published_at)
      VALUES
        ($1, TRUE, 'approved', $2, $3, $4, $5, $6, NOW())
      RETURNING id, type, language, title, status, is_editors_pick AS "isEditorsPick", published_at;
      `,
      [
        req.user!.id,
        !!body.isEditorsPick,
        body.type,
        body.language,
        body.title ?? null,
        body.content.trim(),
      ]
    );

    return res.json({ ok: true, writing: ins.rows[0] });
  } catch (err: any) {
    const status = err?.status || 500;
    console.error("POST /api/admin/writings failed:", err?.message || err);
    return res.status(status).json({ error: err?.message || "Unable to create writing" });
  }
});

export default router;
