import { Router, Request, Response } from "express";
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

router.get(
  "/admin/writings",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      requireAdmin(req);

      const q = z
        .object({
          status: z.enum(["pending", "approved", "rejected"]).optional(),
          limit: z.coerce.number().int().min(1).max(50).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        })
        .parse(req.query);

      const status = q.status ?? "pending";
      const limit = q.limit ?? 20;
      const offset = q.offset ?? 0;

      const rows = await query(
        `
        SELECT
          w.id,
          w.type,
          w.language,
          w.title,
          w.content,
          w.status,
          w.created_at,
          u.id AS author_id,
          u.full_name AS author_name,
          u.email AS author_email
        FROM writings w
        LEFT JOIN users u ON u.id = w.author_user_id
        WHERE w.status = $1
        ORDER BY w.created_at DESC
        LIMIT $2 OFFSET $3;
        `,
        [status, limit, offset]
      );

      return res.json({
        status,
        limit,
        offset,
        items: rows.rows,
      });
    } catch (err: any) {
      const status = err?.status || 500;
      console.error("GET /api/admin/writings failed:", err?.message || err);
      return res.status(status).json({ error: err.message || "Failed to load writings" });
    }
  }
);

export default router;
