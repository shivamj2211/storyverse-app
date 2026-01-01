import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../middlewares/requireAdmin";
import * as controller from "../../controllers/admin/coins.controller";

const router = Router();

// Middleware: require authentication and admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/coins/summary
 * Get coin statistics and summary
 */
router.get("/summary", controller.getCoinSummary);

/**
 * GET /api/admin/coins/history
 * Get coin transaction history
 * Query: { user_id?, type?, start_date?, end_date?, page?, limit? }
 */
router.get("/history", controller.getCoinHistory);

/**
 * PATCH /api/admin/coins/:userId
 * Adjust user's coin balance
 * Body: { amount, reason }
 */
router.patch("/:userId", controller.adjustUserCoins);

/**
 * POST /api/admin/coins/:userId/reset
 * Reset user's coin balance to zero
 */
router.post("/:userId/reset", controller.resetUserCoins);

/**
 * GET /api/admin/coins/expiry
 * Get coin expiry details for all users
 * Query: { user_id? }
 */
router.get("/expiry", controller.getCoinExpiry);

export default router;
