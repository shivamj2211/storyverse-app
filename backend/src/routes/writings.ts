import { Router, Response } from "express";
import { z } from "zod";
import { query } from "../db";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();

router.post("/writings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const body = z
      .object({
        type: z.enum(["shayari", "poem", "kids", "micro", "thought"]),
        language: z.enum(["en", "hi", "hinglish"]),
        title: z.string().max(120).nullable().optional(),
        content: z.string().min(10).max(5000),
        // optional tags later: tags: z.array(z.string()).max(10).optional()
      })
      .parse(req.body);

    const userId = req.user!.id;

    // users -> pending by default
    const insertRes = await query(
      `
      INSERT INTO writings
        (author_user_id, is_admin, status, is_editors_pick, type, language, title, content)
      VALUES
        ($1, FALSE, 'pending', FALSE, $2, $3, $4, $5)
      RETURNING
        id, type, language, title, content, status, created_at;
      `,
      [userId, body.type, body.language, body.title ?? null, body.content.trim()]
    );

    return res.json({
      ok: true,
      message: "Submitted for review",
      writing: insertRes.rows[0],
    });
  } catch (err: any) {
    console.error("POST /api/writings failed:", err?.message || err);
    if (err?.stack) console.error(err.stack);
    return res.status(500).json({ error: "Unable to submit writing" });
  }
});

export default router;
