"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
/** Optional auth middleware for GET /api/stories */
function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
            req.user = decoded;
        }
        catch {
            // ignore invalid token
        }
    }
    next();
}
function toInt(v, fallback, min, max) {
    const n = parseInt(String(v ?? ""), 10);
    if (!Number.isFinite(n))
        return fallback;
    return Math.max(min, Math.min(max, n));
}
/**
 * GET /api/stories?limit=12&offset=0&q=...&genre=romance
 * - pagination
 * - search (title/summary)
 * - optional genre filter (if you have story_genres/genres tables)
 * - avg rating + saved flag
 */
router.get("/", optionalAuth, async (req, res) => {
    try {
        const user = req.user;
        const limit = toInt(req.query.limit, 24, 1, 100);
        const offset = toInt(req.query.offset, 0, 0, 1000000);
        const q = String(req.query.q || "").trim();
        const genre = String(req.query.genre || "").trim(); // optional
        // Saved ids
        let savedIds = new Set();
        if (user?.id) {
            const savedRes = await (0, db_1.query)("SELECT story_id FROM saved_stories WHERE user_id=$1", [user.id]);
            savedIds = new Set(savedRes.rows.map((r) => r.story_id));
        }
        // IMPORTANT:
        // Genre join should run ONLY if you have story_genres table.
        // If you haven't created it yet, keep genre empty from frontend OR create the tables.
        const hasGenreFilter = !!genre;
        const params = [];
        let idx = 1;
        // Base query
        // Note: grouping by s.id is okay because s.id is PK (Postgres functional dependency).
        let sql = `
      SELECT s.id, s.slug, s.title, s.summary, s.cover_image_url,
             COALESCE(AVG(sr.rating), 0) AS avg_rating
      FROM stories s
      JOIN story_versions v ON v.story_id = s.id AND v.is_published = true
      LEFT JOIN story_ratings sr ON sr.story_id = s.id
    `;
        // Optional genre join
        if (hasGenreFilter) {
            sql += `
      JOIN story_genres sg ON sg.story_id = s.id
      JOIN genres g ON g.key = sg.genre_key
      `;
        }
        // WHERE
        sql += ` WHERE 1=1 `;
        // search
        if (q) {
            params.push(`%${q.toLowerCase()}%`);
            params.push(`%${q.toLowerCase()}%`);
            sql += ` AND (LOWER(s.title) LIKE $${idx} OR LOWER(s.summary) LIKE $${idx + 1}) `;
            idx += 2;
        }
        // genre filter
        if (hasGenreFilter) {
            params.push(genre);
            sql += ` AND g.key = $${idx} `;
            idx += 1;
        }
        // group + order + limit/offset
        params.push(limit);
        params.push(offset);
        sql += `
      GROUP BY s.id
      ORDER BY s.title ASC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
        const storiesRes = await (0, db_1.query)(sql, params);
        const stories = storiesRes.rows.map((s) => ({
            id: s.id,
            slug: s.slug,
            title: s.title,
            summary: s.summary,
            coverImageUrl: s.cover_image_url,
            avgRating: parseFloat(s.avg_rating) || 0,
            saved: savedIds.has(s.id),
        }));
        return res.json({ stories, limit, offset });
    }
    catch (err) {
        console.error("❌ /api/stories error:", err?.message || err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/** GET /api/stories/:id */
router.get("/:id", auth_1.requireAuth, async (req, res) => {
    const storyId = req.params.id;
    try {
        const storyRes = await (0, db_1.query)(`
      SELECT s.id, s.slug, s.title, s.summary, s.cover_image_url,
             COALESCE(AVG(sr.rating), 0) AS avg_rating
      FROM stories s
      JOIN story_versions v ON v.story_id = s.id AND v.is_published = true
      LEFT JOIN story_ratings sr ON sr.story_id = s.id
      WHERE s.id=$1
      GROUP BY s.id
      `, [storyId]);
        if (!storyRes.rows.length) {
            return res.status(404).json({ error: "Story not found or unpublished" });
        }
        const story = storyRes.rows[0];
        const savedRes = await (0, db_1.query)("SELECT 1 FROM saved_stories WHERE user_id=$1 AND story_id=$2", [req.user.id, storyId]);
        return res.json({
            id: story.id,
            slug: story.slug,
            title: story.title,
            summary: story.summary,
            coverImageUrl: story.cover_image_url,
            avgRating: parseFloat(story.avg_rating) || 0,
            saved: savedRes.rows.length > 0,
        });
    }
    catch (err) {
        console.error("❌ /api/stories/:id error:", err?.message || err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/** POST /api/stories/:id/start (unchanged from your version) */
router.post("/:id/start", auth_1.requireAuth, async (req, res) => {
    const storyId = req.params.id;
    const user = req.user;
    try {
        const versionRes = await (0, db_1.query)("SELECT id FROM story_versions WHERE story_id=$1 AND is_published=true ORDER BY published_at DESC LIMIT 1", [storyId]);
        if (!versionRes.rows.length) {
            return res.status(404).json({ error: "No published version for this story" });
        }
        const versionId = versionRes.rows[0].id;
        if (!user.is_premium) {
            const existing = await (0, db_1.query)("SELECT id FROM story_runs WHERE user_id=$1 AND story_id=$2 ORDER BY started_at DESC LIMIT 1", [user.id, storyId]);
            if (existing.rows.length) {
                return res.json({ runId: existing.rows[0].id });
            }
        }
        const startNodeRes = await (0, db_1.query)("SELECT id FROM story_nodes WHERE story_version_id=$1 AND is_start=true LIMIT 1", [versionId]);
        if (!startNodeRes.rows.length) {
            return res.status(500).json({ error: "No start node for version" });
        }
        const startNodeId = startNodeRes.rows[0].id;
        const runRes = await (0, db_1.query)("INSERT INTO story_runs (user_id, story_version_id, story_id, current_node_id) VALUES ($1, $2, $3, $4) RETURNING id", [user.id, versionId, storyId, startNodeId]);
        return res.json({ runId: runRes.rows[0].id });
    }
    catch (err) {
        console.error("❌ /api/stories/:id/start error:", err?.message || err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
