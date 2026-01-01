import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../middlewares/requireAdmin";
import * as controller from "../../controllers/admin/transactions.controller";

const router = Router();

// Middleware: require authentication and admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/transactions
 * Get all transactions with pagination and filtering
 * Query: { page?, limit?, type?, status?, start_date?, end_date? }
 */
router.get("/", controller.getAllTransactions);

/**
 * GET /api/admin/transactions/user/:userId
 * Get transactions for a specific user
 * Query: { page?, limit? }
 */
router.get("/user/:userId", controller.getTransactionsByUser);

/**
 * GET /api/admin/transactions/date-range
 * Get transactions within a date range
 * Query: { start_date, end_date, page?, limit? }
 */
router.get("/date-range", controller.getTransactionsByDateRange);

/**
 * POST /api/admin/transactions/export
 * Export transactions to CSV or JSON
 * Body: { format, filters }
 */
router.post("/export", controller.exportTransactions);

/**
 * GET /api/admin/transactions/stats
 * Get transaction statistics and analytics
 * Query: { period?, type? }
 */
router.get("/stats", controller.getTransactionStats);

export default router;
