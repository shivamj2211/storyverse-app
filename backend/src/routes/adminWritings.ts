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

router.patch(
  "/admin/writings/:id/approve",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      requireAdmin(req);

      const params = z.object({ id: z.string().uuid() }).parse(req.params);

      const updated = await query(
        `
        UPDATE writings
        SET status = 'approved',
            published_at = COALESCE(published_at, NOW())
        WHERE id = $1
        RETURNING id, status, published_at;
        `,
        [params.id]
      );

      if (!updated.rows.length) return res.status(404).json({ error: "Not found" });

      return res.json({ ok: true, writing: updated.rows[0] });
    } catch (err: any) {
      const status = err?.status || 500;
      console.error("PATCH /api/admin/writings/:id/approve failed:", err?.message || err);
      if (err?.stack) console.error(err.stack);
      return res.status(status).json({ error: err?.message || "Unable to approve" });
    }
  }
);

router.patch(
  "/admin/writings/:id/reject",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      requireAdmin(req);

      const params = z.object({ id: z.string().uuid() }).parse(req.params);

      const updated = await query(
        `
        UPDATE writings
        SET status = 'rejected'
        WHERE id = $1
        RETURNING id, status;
        `,
        [params.id]
      );

      if (!updated.rows.length) return res.status(404).json({ error: "Not found" });

      return res.json({ ok: true, writing: updated.rows[0] });
    } catch (err: any) {
      const status = err?.status || 500;
      console.error("PATCH /api/admin/writings/:id/reject failed:", err?.message || err);
      if (err?.stack) console.error(err.stack);
      return res.status(status).json({ error: err?.message || "Unable to reject" });
    }
  }
);

router.patch(
  "/admin/writings/:id/editors-pick",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      requireAdmin(req);

      const params = z.object({ id: z.string().uuid() }).parse(req.params);
      const body = z.object({ isEditorsPick: z.boolean() }).parse(req.body);

      const updated = await query(
        `
        UPDATE writings
        SET is_editors_pick = $2
        WHERE id = $1
        RETURNING id, is_editors_pick AS "isEditorsPick";
        `,
        [params.id, body.isEditorsPick]
      );

      if (!updated.rows.length) return res.status(404).json({ error: "Not found" });

      return res.json({ ok: true, writing: updated.rows[0] });
    } catch (err: any) {
      const status = err?.status || 500;
      console.error("PATCH /api/admin/writings/:id/editors-pick failed:", err?.message || err);
      if (err?.stack) console.error(err.stack);
      return res.status(status).json({ error: err?.message || "Unable to update editors pick" });
    }
  }
);

export default router;
