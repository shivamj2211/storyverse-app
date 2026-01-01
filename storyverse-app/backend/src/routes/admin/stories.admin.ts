import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../middlewares/requireAdmin";
import * as controller from "../../controllers/admin/stories.controller";

const router = Router();

// Middleware: require authentication and admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/stories
 * Get all stories with pagination and filtering
 */
router.get("/", controller.getAllStories);

/**
 * POST /api/admin/stories
 * Create a new story
 * Body: { title, description, genre_id, author_id, ... }
 */
router.post("/", controller.createStory);

/**
 * PATCH /api/admin/stories/:id
 * Update a story
 * Body: { title?, description?, genre_id?, ... }
 */
router.patch("/:id", controller.updateStory);

/**
 * DELETE /api/admin/stories/:id
 * Delete a story
 */
router.delete("/:id", controller.deleteStory);

export default router;
