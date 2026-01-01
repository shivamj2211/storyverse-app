import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../middlewares/requireAdmin";
import * as controller from "../../controllers/admin/users.controller";

const router = Router();

// Middleware: require authentication and admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/users
 * Get all users with pagination and filtering
 * Query: { page?, limit?, search?, role? }
 */
router.get("/", controller.getAllUsers);

/**
 * GET /api/admin/users/:id
 * Get user by ID
 */
router.get("/:id", controller.getUserById);

/**
 * PATCH /api/admin/users/:id
 * Update user (email, phone, plan, role, etc.)
 * Body: { email?, phone?, plan?, is_premium?, ... }
 */
router.patch("/:id", controller.updateUser);

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
router.delete("/:id", controller.deleteUser);

/**
 * POST /api/admin/users/:id/toggle-ban
 * Ban or unban a user
 * Body: { banned: boolean }
 */
router.post("/:id/toggle-ban", controller.toggleUserBan);

export default router;
