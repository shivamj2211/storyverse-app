"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../../middlewares/requireAuth");
const requireAdmin_1 = require("../../middlewares/requireAdmin");
const storiesController = __importStar(require("../../controllers/admin/stories.controller"));
const chaptersController = __importStar(require("../../controllers/admin/chapters.controller"));
const genresController = __importStar(require("../../controllers/admin/genres.controller"));
const usersController = __importStar(require("../../controllers/admin/users.controller"));
const rewardsController = __importStar(require("../../controllers/admin/rewards.controller"));
const coinsController = __importStar(require("../../controllers/admin/coins.controller"));
const transactionsController = __importStar(require("../../controllers/admin/transactions.controller"));
const router = (0, express_1.Router)();
// Middleware: require authentication and admin role for all routes
router.use(requireAuth_1.requireAuth, requireAdmin_1.requireAdmin);
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
exports.default = router;
