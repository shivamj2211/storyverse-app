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
const controller = __importStar(require("../../controllers/admin/stories.controller"));
const router = (0, express_1.Router)();
// Middleware: require authentication and admin role
router.use(requireAuth_1.requireAuth, requireAdmin_1.requireAdmin);
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
exports.default = router;
