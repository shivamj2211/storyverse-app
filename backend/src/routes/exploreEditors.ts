import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../db";

const router = Router();

router.get("/explore/editors-picks", async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10), 1), 50);
    const offset = Math.max(parseInt(String(req.query.offset || "0"), 10), 0);

    const rows = await query(
      `
      SELECT id, type, language, title, content,
             is_editors_pick AS "isEditorsPick",
             COALESCE(published_at, created_at) AS "publishedAt"
      FROM writings
      WHERE status = 'approved' AND is_editors_pick = true
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT $1 OFFSET $2;
      `,
      [limit, offset]
    );

    return res.json({ items: rows.rows, limit, offset, hasMore: rows.rows.length === limit });
  } catch (err: any) {
    console.error("GET /api/explore/editors-picks failed:", err?.message || err);
    if (err?.stack) console.error(err.stack);
    return res.status(500).json({ error: "Failed to load editor picks" });
  }
});


export default router;
