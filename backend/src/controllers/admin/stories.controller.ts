import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/requireAuth";
import { query } from "../../db";

/**
 * Stories Admin Controller
 * Handles CRUD operations for stories management
 */

// Get all stories
export async function getAllStories(req: AuthRequest, res: Response) {
  try {
    const storiesRes = await query(
      `SELECT s.id, s.slug, s.title, s.summary, s.cover_image_url, 
              COUNT(sv.id) as version_count,
              SUM(CASE WHEN sv.is_published THEN 1 ELSE 0 END) as published_count
       FROM stories s
       LEFT JOIN story_versions sv ON sv.story_id = s.id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );
    
    const stories = storiesRes.rows.map(s => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      summary: s.summary,
      coverImageUrl: s.cover_image_url,
      versionCount: parseInt(s.version_count) || 0,
      publishedCount: parseInt(s.published_count) || 0,
    }));
    
    res.json({ stories });
  } catch (err) {
    console.error("Get all stories failed:", err);
    res.status(500).json({ error: "Unable to fetch stories" });
  }
}

// Create a new story
export async function createStory(req: AuthRequest, res: Response) {
  try {
    const { title, slug, summary, coverImageUrl } = req.body;
    
    if (!title || !slug) {
      return res.status(400).json({ error: "Title and slug are required" });
    }

    const result = await query(
      `INSERT INTO stories (title, slug, summary, cover_image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, slug, title, summary, cover_image_url`,
      [title, slug, summary || "", coverImageUrl || null]
    );

    const story = result.rows[0];
    res.json({
      id: story.id,
      slug: story.slug,
      title: story.title,
      summary: story.summary,
      coverImageUrl: story.cover_image_url,
    });
  } catch (err: any) {
    console.error("Create story failed:", err);
    if (err?.message?.includes("duplicate key")) {
      return res.status(400).json({ error: "Slug already exists" });
    }
    res.status(500).json({ error: "Unable to create story" });
  }
}

// Update a story
export async function updateStory(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { title, slug, summary, coverImageUrl } = req.body;

    const result = await query(
      `UPDATE stories 
       SET title = COALESCE($1, title),
           slug = COALESCE($2, slug),
           summary = COALESCE($3, summary),
           cover_image_url = COALESCE($4, cover_image_url)
       WHERE id = $5
       RETURNING id, slug, title, summary, cover_image_url`,
      [title, slug, summary, coverImageUrl, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Story not found" });
    }

    const story = result.rows[0];
    res.json({
      id: story.id,
      slug: story.slug,
      title: story.title,
      summary: story.summary,
      coverImageUrl: story.cover_image_url,
    });
  } catch (err) {
    console.error("Update story failed:", err);
    res.status(500).json({ error: "Unable to update story" });
  }
}

// Delete a story
export async function deleteStory(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM stories WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Story not found" });
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error("Delete story failed:", err);
    res.status(500).json({ error: "Unable to delete story" });
  }
}
