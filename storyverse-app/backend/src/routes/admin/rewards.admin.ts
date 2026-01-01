import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../middlewares/requireAdmin";
import * as controller from "../../controllers/admin/rewards.controller";

const router = Router();

// Middleware: require authentication and admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/rewards
 * Get all rewards
 */
router.get("/", controller.getAllRewards);

/**
 * POST /api/admin/rewards
 * Create a new reward configuration
 * Body: { name, description, coin_amount, trigger_type, ... }
 */
router.post("/", controller.createReward);

/**
 * PATCH /api/admin/rewards/:id
 * Update a reward configuration
 * Body: { name?, description?, coin_amount?, ... }
 */
router.patch("/:id", controller.updateReward);

/**
 * DELETE /api/admin/rewards/:id
 * Delete a reward configuration
 */
router.delete("/:id", controller.deleteReward);

/**
 * POST /api/admin/rewards/award-coins
 * Manually award coins to a user
 * Body: { user_id, coins, reason }
 */
router.post("/award-coins", controller.awardCoinsToUser);

export default router;
