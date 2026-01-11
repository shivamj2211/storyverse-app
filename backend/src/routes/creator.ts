import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { requireCreator, requireEmailVerified } from "../middlewares/requirePlan";

const router = Router();

/**
 * GET /api/creator/me
 * Quick endpoint to validate creator access from frontend
 */
router.get("/me", requireAuth, requireEmailVerified, requireCreator, async (req: AuthRequest, res: Response) => {
  return res.json({ ok: true, user: req.user });
});

/**
 * Example protected action
 * POST /api/creator/stories
 */
router.post("/stories", requireAuth, requireEmailVerified, requireCreator, async (_req: AuthRequest, res: Response) => {
  return res.json({ ok: true, message: "Creator story action allowed" });
});

export default router;
