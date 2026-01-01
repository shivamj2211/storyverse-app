"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChaptersByStory = getChaptersByStory;
exports.createChapter = createChapter;
exports.updateChapter = updateChapter;
exports.deleteChapter = deleteChapter;
const db_1 = require("../../db");
/**
 * Chapters Admin Controller
 * Handles CRUD operations for chapters management
 */
// Get all chapters for a story
async function getChaptersByStory(req, res) {
    try {
        const { storyId } = req.params;
        const chaptersRes = await (0, db_1.query)(`SELECT sv.id, sv.version_name, sv.is_published, COUNT(sn.id) as node_count
       FROM story_versions sv
       LEFT JOIN story_nodes sn ON sn.story_version_id = sv.id
       WHERE sv.story_id = $1
       GROUP BY sv.id
       ORDER BY sv.created_at DESC`, [storyId]);
        const chapters = chaptersRes.rows.map(c => ({
            id: c.id,
            versionName: c.version_name,
            isPublished: c.is_published,
            nodeCount: parseInt(c.node_count) || 0,
        }));
        res.json({ chapters });
    }
    catch (err) {
        console.error("Get chapters failed:", err);
        res.status(500).json({ error: "Unable to fetch chapters" });
    }
}
// Create a new chapter
async function createChapter(req, res) {
    try {
        const { storyId, versionName, notes } = req.body;
        if (!storyId || !versionName) {
            return res.status(400).json({ error: "storyId and versionName are required" });
        }
        const result = await (0, db_1.query)(`INSERT INTO story_versions (story_id, version_name, notes)
       VALUES ($1, $2, $3)
       RETURNING id, version_name, is_published`, [storyId, versionName, notes || ""]);
        const chapter = result.rows[0];
        res.json({
            id: chapter.id,
            versionName: chapter.version_name,
            isPublished: chapter.is_published,
        });
    }
    catch (err) {
        if (err?.message?.includes("duplicate key")) {
            return res.status(400).json({ error: "Version name already exists for this story" });
        }
        console.error("Create chapter failed:", err);
        res.status(500).json({ error: "Unable to create chapter" });
    }
}
// Update a chapter
async function updateChapter(req, res) {
    try {
        const { chapterId } = req.params;
        const { versionName, notes, isPublished } = req.body;
        const result = await (0, db_1.query)(`UPDATE story_versions 
       SET version_name = COALESCE($1, version_name),
           notes = COALESCE($2, notes),
           is_published = COALESCE($3, is_published)
       WHERE id = $4
       RETURNING id, version_name, is_published`, [versionName, notes, isPublished !== undefined ? isPublished : null, chapterId]);
        if (!result.rows.length) {
            return res.status(404).json({ error: "Chapter not found" });
        }
        const chapter = result.rows[0];
        res.json({
            id: chapter.id,
            versionName: chapter.version_name,
            isPublished: chapter.is_published,
        });
    }
    catch (err) {
        console.error("Update chapter failed:", err);
        res.status(500).json({ error: "Unable to update chapter" });
    }
}
// Delete a chapter
async function deleteChapter(req, res) {
    try {
        const { chapterId } = req.params;
        const result = await (0, db_1.query)(`DELETE FROM story_versions WHERE id = $1 RETURNING id`, [chapterId]);
        if (!result.rows.length) {
            return res.status(404).json({ error: "Chapter not found" });
        }
        res.json({ success: true, chapterId });
    }
    catch (err) {
        console.error("Delete chapter failed:", err);
        res.status(500).json({ error: "Unable to delete chapter" });
    }
}
