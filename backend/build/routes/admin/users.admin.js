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
const controller = __importStar(require("../../controllers/admin/users.controller"));
const router = (0, express_1.Router)();
// Middleware: require authentication and admin role
router.use(requireAuth_1.requireAuth, requireAdmin_1.requireAdmin);
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
exports.default = router;
