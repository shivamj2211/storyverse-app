import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../middlewares/requireAdmin";
import * as controller from "../../controllers/admin/genres.controller";

const router = Router();

// Middleware: require authentication and admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/genres
 * Get all genres
 */
router.get("/", controller.getAllGenres);

/**
 * POST /api/admin/genres
 * Create a new genre
 * Body: { name, description, icon, ... }
 */
router.post("/", controller.createGenre);

/**
 * PATCH /api/admin/genres/:id
 * Update a genre
 * Body: { name?, description?, icon?, ... }
 */
router.patch("/:id", controller.updateGenre);

/**
 * DELETE /api/admin/genres/:id
 * Delete a genre
 */
router.delete("/:id", controller.deleteGenre);

export default router;
