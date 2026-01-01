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
const controller = __importStar(require("../../controllers/admin/coins.controller"));
const router = (0, express_1.Router)();
// Middleware: require authentication and admin role
router.use(requireAuth_1.requireAuth, requireAdmin_1.requireAdmin);
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
exports.default = router;
