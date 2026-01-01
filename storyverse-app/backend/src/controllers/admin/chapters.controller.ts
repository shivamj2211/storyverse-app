import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/requireAuth";
import { query } from "../../db";

/**
 * Chapters Admin Controller
 * Handles CRUD operations for chapters management
 */

// Get all chapters for a story
export async function getChaptersByStory(req: AuthRequest, res: Response) {
  try {
    const { storyId } = req.params;

    const chaptersRes = await query(
      `SELECT sv.id, sv.version_name, sv.is_published, COUNT(sn.id) as node_count
       FROM story_versions sv
       LEFT JOIN story_nodes sn ON sn.story_version_id = sv.id
       WHERE sv.story_id = $1
       GROUP BY sv.id
       ORDER BY sv.created_at DESC`,
      [storyId]
    );

    const chapters = chaptersRes.rows.map(c => ({
      id: c.id,
      versionName: c.version_name,
      isPublished: c.is_published,
      nodeCount: parseInt(c.node_count) || 0,
    }));

    res.json({ chapters });
  } catch (err) {
    console.error("Get chapters failed:", err);
    res.status(500).json({ error: "Unable to fetch chapters" });
  }
}

// Create a new chapter
export async function createChapter(req: AuthRequest, res: Response) {
  try {
    const { storyId, versionName, notes } = req.body;

    if (!storyId || !versionName) {
      return res.status(400).json({ error: "storyId and versionName are required" });
    }

    const result = await query(
      `INSERT INTO story_versions (story_id, version_name, notes)
       VALUES ($1, $2, $3)
       RETURNING id, version_name, is_published`,
      [storyId, versionName, notes || ""]
    );

    const chapter = result.rows[0];
    res.json({
      id: chapter.id,
      versionName: chapter.version_name,
      isPublished: chapter.is_published,
    });
  } catch (err: any) {
    if (err?.message?.includes("duplicate key")) {
      return res.status(400).json({ error: "Version name already exists for this story" });
    }
    console.error("Create chapter failed:", err);
    res.status(500).json({ error: "Unable to create chapter" });
  }
}

// Update a chapter
export async function updateChapter(req: AuthRequest, res: Response) {
  try {
    const { chapterId } = req.params;
    const { versionName, notes, isPublished } = req.body;

    const result = await query(
      `UPDATE story_versions 
       SET version_name = COALESCE($1, version_name),
           notes = COALESCE($2, notes),
           is_published = COALESCE($3, is_published)
       WHERE id = $4
       RETURNING id, version_name, is_published`,
      [versionName, notes, isPublished !== undefined ? isPublished : null, chapterId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    const chapter = result.rows[0];
    res.json({
      id: chapter.id,
      versionName: chapter.version_name,
      isPublished: chapter.is_published,
    });
  } catch (err) {
    console.error("Update chapter failed:", err);
    res.status(500).json({ error: "Unable to update chapter" });
  }
}

// Delete a chapter
export async function deleteChapter(req: AuthRequest, res: Response) {
  try {
    const { chapterId } = req.params;

    const result = await query(
      `DELETE FROM story_versions WHERE id = $1 RETURNING id`,
      [chapterId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    res.json({ success: true, chapterId });
  } catch (err) {
    console.error("Delete chapter failed:", err);
    res.status(500).json({ error: "Unable to delete chapter" });
  }
}
