import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../middlewares/requireAdmin";
import * as storiesController from "../../controllers/admin/stories.controller";
import * as chaptersController from "../../controllers/admin/chapters.controller";
import * as genresController from "../../controllers/admin/genres.controller";
import * as usersController from "../../controllers/admin/users.controller";
import * as rewardsController from "../../controllers/admin/rewards.controller";
import * as coinsController from "../../controllers/admin/coins.controller";
import * as transactionsController from "../../controllers/admin/transactions.controller";

const router = Router();

// Middleware: require authentication and admin role for all routes
router.use(requireAuth, requireAdmin);

// ===== STORIES ROUTES =====
router.get("/stories", storiesController.getAllStories);
router.post("/stories", storiesController.createStory);
router.patch("/stories/:id", storiesController.updateStory);
router.delete("/stories/:id", storiesController.deleteStory);

// ===== CHAPTERS ROUTES =====
router.get("/chapters", chaptersController.getChaptersByStory);
router.post("/chapters", chaptersController.createChapter);
router.patch("/chapters/:id", chaptersController.updateChapter);
router.delete("/chapters/:id", chaptersController.deleteChapter);

// ===== GENRES ROUTES =====
router.get("/genres", genresController.getAllGenres);
router.post("/genres", genresController.createGenre);
router.patch("/genres/:id", genresController.updateGenre);
router.delete("/genres/:id", genresController.deleteGenre);

// ===== USERS ROUTES =====
router.get("/users", usersController.getAllUsers);
router.get("/users/:id", usersController.getUserById);
router.patch("/users/:id", usersController.updateUser);
router.delete("/users/:id", usersController.deleteUser);
router.post("/users/:id/toggle-ban", usersController.toggleUserBan);

// ===== REWARDS ROUTES =====
router.get("/rewards", rewardsController.getAllRewards);
router.post("/rewards", rewardsController.createReward);
router.patch("/rewards/:id", rewardsController.updateReward);
router.delete("/rewards/:id", rewardsController.deleteReward);
router.post("/rewards/award-coins", rewardsController.awardCoinsToUser);

// ===== COINS ROUTES =====
router.get("/coins/summary", coinsController.getCoinSummary);
router.get("/coins/history", coinsController.getCoinHistory);
router.patch("/coins/:userId", coinsController.adjustUserCoins);
router.post("/coins/:userId/reset", coinsController.resetUserCoins);
router.get("/coins/expiry", coinsController.getCoinExpiry);

// ===== TRANSACTIONS ROUTES =====
router.get("/transactions/export", transactionsController.exportTransactions);
router.get("/transactions/user/:userId", transactionsController.getTransactionsByUser);
router.get("/transactions/date-range", transactionsController.getTransactionsByDateRange);
router.get("/transactions", transactionsController.getAllTransactions);
router.get("/transactions/stats", transactionsController.getTransactionStats);

export default router;
