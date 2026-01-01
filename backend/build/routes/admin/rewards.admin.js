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
const controller = __importStar(require("../../controllers/admin/rewards.controller"));
const router = (0, express_1.Router)();
// Middleware: require authentication and admin role
router.use(requireAuth_1.requireAuth, requireAdmin_1.requireAdmin);
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
exports.default = router;
