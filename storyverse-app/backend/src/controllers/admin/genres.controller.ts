import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/requireAuth";
import { query } from "../../db";

/**
 * Genres Admin Controller
 * Handles CRUD operations for genres management
 */

// Get all genres
export async function getAllGenres(req: AuthRequest, res: Response) {
  try {
    const genresRes = await query(
      `SELECT key, label, icon FROM genres ORDER BY label ASC`
    );

    const genres = genresRes.rows.map(g => ({
      key: g.key,
      label: g.label,
      icon: g.icon,
    }));

    res.json({ genres });
  } catch (err) {
    console.error("Get all genres failed:", err);
    res.status(500).json({ error: "Unable to fetch genres" });
  }
}

// Create a new genre
export async function createGenre(req: AuthRequest, res: Response) {
  try {
    const { key, label, icon } = req.body;

    if (!key || !label) {
      return res.status(400).json({ error: "key and label are required" });
    }

    const result = await query(
      `INSERT INTO genres (key, label, icon) VALUES ($1, $2, $3)
       RETURNING key, label, icon`,
      [key, label, icon || ""]
    );

    const genre = result.rows[0];
    res.json({ key: genre.key, label: genre.label, icon: genre.icon });
  } catch (err: any) {
    if (err?.message?.includes("duplicate key")) {
      return res.status(400).json({ error: "Genre key already exists" });
    }
    console.error("Create genre failed:", err);
    res.status(500).json({ error: "Unable to create genre" });
  }
}

// Update a genre
export async function updateGenre(req: AuthRequest, res: Response) {
  try {
    const key = (req.params as any).key || (req.params as any).id;
    const { label, icon } = req.body;

    const result = await query(
      `UPDATE genres 
       SET label = COALESCE($1, label),
           icon = COALESCE($2, icon)
       WHERE key = $3
       RETURNING key, label, icon`,
      [label, icon, key]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Genre not found" });
    }

    const genre = result.rows[0];
    res.json({ key: genre.key, label: genre.label, icon: genre.icon });
  } catch (err) {
    console.error("Update genre failed:", err);
    res.status(500).json({ error: "Unable to update genre" });
  }
}

// Delete a genre
export async function deleteGenre(req: AuthRequest, res: Response) {
  try {
    const key = (req.params as any).key || (req.params as any).id;

    const result = await query(
      `DELETE FROM genres WHERE key = $1 RETURNING key`,
      [key]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Genre not found" });
    }

    res.json({ success: true, key });
  } catch (err) {
    console.error("Delete genre failed:", err);
    res.status(500).json({ error: "Unable to delete genre" });
  }
}
