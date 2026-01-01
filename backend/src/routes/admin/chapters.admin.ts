import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../middlewares/requireAdmin";
import * as controller from "../../controllers/admin/chapters.controller";

const router = Router();

// Middleware: require authentication and admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/chapters
 * Get all chapters for a story
 * Query: { story_id }
 */
router.get("/", controller.getChaptersByStory);

/**
 * POST /api/admin/chapters
 * Create a new chapter
 * Body: { story_id, chapter_number, title, content, ... }
 */
router.post("/", controller.createChapter);

/**
 * PATCH /api/admin/chapters/:id
 * Update a chapter
 * Body: { chapter_number?, title?, content?, ... }
 */
router.patch("/:id", controller.updateChapter);

/**
 * DELETE /api/admin/chapters/:id
 * Delete a chapter
 */
router.delete("/:id", controller.deleteChapter);

export default router;
