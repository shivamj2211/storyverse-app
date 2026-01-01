"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const admin_1 = require("../middlewares/admin");
const storyImport_1 = require("../utils/storyImport");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Admin route to import a story package from JSON
router.post('/story-import', auth_1.requireAuth, admin_1.requireAdmin, async (req, res) => {
    try {
        // Accept JSON body
        const pkg = req.body;
        const versionId = await (0, storyImport_1.importStory)(pkg);
        return res.json({ ok: true, versionId });
    }
    catch (err) {
        console.error(err);
        return res.status(400).json({ error: err.message || 'Import failed' });
    }
});
// Publish a version
router.post('/versions/:versionId/publish', auth_1.requireAuth, admin_1.requireAdmin, async (req, res) => {
    const versionId = req.params.versionId;
    try {
        // Find version and its story
        const vRes = await (0, db_1.query)('SELECT story_id FROM story_versions WHERE id=$1', [versionId]);
        if (!vRes.rows.length) {
            return res.status(404).json({ error: 'Version not found' });
        }
        const storyId = vRes.rows[0].story_id;
        // Unpublish other versions of the story
        await (0, db_1.query)('UPDATE story_versions SET is_published=false WHERE story_id=$1', [storyId]);
        // Publish this version
        await (0, db_1.query)('UPDATE story_versions SET is_published=true, published_at=NOW() WHERE id=$1', [versionId]);
        return res.json({ ok: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Unpublish a version (only if safe)
router.post('/versions/:versionId/unpublish', auth_1.requireAuth, admin_1.requireAdmin, async (req, res) => {
    const versionId = req.params.versionId;
    try {
        // Ensure no runs referencing this version
        const runsRes = await (0, db_1.query)('SELECT 1 FROM story_runs WHERE story_version_id=$1 LIMIT 1', [versionId]);
        if (runsRes.rows.length) {
            return res.status(400).json({ error: 'Cannot unpublish version with existing runs' });
        }
        await (0, db_1.query)('UPDATE story_versions SET is_published=false, published_at=NULL WHERE id=$1', [versionId]);
        return res.json({ ok: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete a version (only drafts, no runs)
router.delete('/versions/:versionId', auth_1.requireAuth, admin_1.requireAdmin, async (req, res) => {
    const versionId = req.params.versionId;
    try {
        const versionRes = await (0, db_1.query)('SELECT is_published FROM story_versions WHERE id=$1', [versionId]);
        if (!versionRes.rows.length) {
            return res.status(404).json({ error: 'Version not found' });
        }
        if (versionRes.rows[0].is_published) {
            return res.status(400).json({ error: 'Cannot delete published version' });
        }
        const runsRes = await (0, db_1.query)('SELECT 1 FROM story_runs WHERE story_version_id=$1 LIMIT 1', [versionId]);
        if (runsRes.rows.length) {
            return res.status(400).json({ error: 'Cannot delete version with existing runs' });
        }
        await (0, db_1.query)('DELETE FROM story_versions WHERE id=$1', [versionId]);
        return res.json({ ok: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// List stories and their versions (admin view)
router.get('/stories', auth_1.requireAuth, admin_1.requireAdmin, async (_req, res) => {
    try {
        const resStories = await (0, db_1.query)('SELECT id, slug, title, summary FROM stories');
        const stories = [];
        for (const story of resStories.rows) {
            const versionsRes = await (0, db_1.query)('SELECT id, version_name, is_published, published_at, notes FROM story_versions WHERE story_id=$1 ORDER BY created_at DESC', [story.id]);
            stories.push({
                id: story.id,
                slug: story.slug,
                title: story.title,
                summary: story.summary,
                versions: versionsRes.rows.map((v) => ({ id: v.id, versionName: v.version_name, isPublished: v.is_published, publishedAt: v.published_at, notes: v.notes }))
            });
        }
        return res.json({ stories });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Get a single story with its versions
router.get('/stories/:id', auth_1.requireAuth, admin_1.requireAdmin, async (req, res) => {
    const storyId = req.params.id;
    try {
        const storyRes = await (0, db_1.query)('SELECT id, slug, title, summary FROM stories WHERE id=$1', [storyId]);
        if (!storyRes.rows.length) {
            return res.status(404).json({ error: 'Story not found' });
        }
        const versionsRes = await (0, db_1.query)('SELECT id, version_name, is_published, published_at, notes FROM story_versions WHERE story_id=$1 ORDER BY created_at DESC', [storyId]);
        return res.json({
            id: storyRes.rows[0].id,
            slug: storyRes.rows[0].slug,
            title: storyRes.rows[0].title,
            summary: storyRes.rows[0].summary,
            versions: versionsRes.rows.map((v) => ({ id: v.id, versionName: v.version_name, isPublished: v.is_published, publishedAt: v.published_at, notes: v.notes }))
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
