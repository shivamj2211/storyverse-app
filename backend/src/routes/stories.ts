import { Router, Request, Response, NextFunction } from "express";
import { requireAuth, AuthRequest, AuthPayload } from "../middlewares/auth";
import jwt from "jsonwebtoken";
import { query } from "../db";

const router = Router();

/** Optional auth middleware for GET /api/stories */
function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || "";
  const token =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "secret"
      ) as AuthPayload;
      (req as AuthRequest).user = decoded;
    } catch {
      // ignore invalid token
    }
  }
  next();
}

function toInt(v: any, fallback: number, min: number, max: number) {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/**
 * GET /api/stories?limit=12&offset=0&q=...&genre=romance
 * - pagination
 * - search (title/summary)
 * - optional genre filter (if you have story_genres/genres tables)
 * - avg rating + saved flag
 */
router.get("/", optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;

    const limit = toInt(req.query.limit, 24, 1, 100);
    const offset = toInt(req.query.offset, 0, 0, 1000000);
    const q = String(req.query.q || "").trim();
    const genre = String(req.query.genre || "").trim(); // optional

    // Saved ids
    let savedIds: Set<string> = new Set();
    if (user?.id) {
      const savedRes = await query(
        "SELECT story_id FROM saved_stories WHERE user_id=$1",
        [user.id]
      );
      savedIds = new Set(savedRes.rows.map((r) => r.story_id));
    }

    // IMPORTANT:
    // Genre join should run ONLY if you have story_genres table.
    // If you haven't created it yet, keep genre empty from frontend OR create the tables.
    const hasGenreFilter = !!genre;

    const params: any[] = [];
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

    const storiesRes = await query(sql, params);

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
  } catch (err: any) {
    console.error("❌ /api/stories error:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/stories/:id/start (unchanged from your version) */
/** POST /api/stories/:id/start  (RESUME by default, restart only when ?restart=1) */
router.post("/:id/start", requireAuth, async (req: Request, res: Response) => {
  const storyId = req.params.id;
  const user = (req as any).user!;
  const restart = String(req.query.restart || "") === "1"; // ✅ explicit restart

  try {
    const versionRes = await query(
      "SELECT id FROM story_versions WHERE story_id=$1 AND is_published=true ORDER BY published_at DESC LIMIT 1",
      [storyId]
    );
    if (!versionRes.rows.length) {
      return res.status(404).json({ error: "No published version for this story" });
    }
    const versionId = versionRes.rows[0].id;

    // ✅ ALWAYS try to resume latest run (premium + free)
     // ✅ Resume ONLY an active (not completed) run.
    // This prevents creating multiple "Continue Reading" entries for same story.
      if (!restart) {
        const existing = await query(
          `SELECT id
          FROM story_runs
          WHERE user_id=$1 AND story_id=$2 AND is_completed=false
          ORDER BY updated_at DESC
          LIMIT 1`,
          [user.id, storyId]
        );

        if (existing.rows.length) {
          return res.json({ runId: existing.rows[0].id, resumed: true });
        }
      }

    // Create fresh run only when restart=1 or no existing run
    const startNodeRes = await query(
      "SELECT id FROM story_nodes WHERE story_version_id=$1 AND is_start=true LIMIT 1",
      [versionId]
    );
    if (!startNodeRes.rows.length) {
      return res.status(500).json({ error: "No start node for version" });
    }
    const startNodeId = startNodeRes.rows[0].id;

    const runRes = await query(
      "INSERT INTO story_runs (user_id, story_version_id, story_id, current_node_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [user.id, versionId, storyId, startNodeId]
    );

    const newRunId = runRes.rows[0].id;

    // ✅ METHOD 1: Delete old runs’ reading_state for this story (keep only latest run)
    await query(
      `
      delete from reading_state rs
      using story_runs sr
      where rs.run_id = sr.id
        and rs.user_id = $1
        and sr.story_id = $2
        and rs.run_id <> $3
      `,
      [user.id, storyId, newRunId]
    );

    return res.json({ runId: newRunId, resumed: false });
  } catch (err: any) {
    console.error("❌ /api/stories/:id/start error:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/stories/genres  (for frontend compatibility) */
router.get("/genres", async (_req: Request, res: Response) => {
  try {
    const r = await query(
      `SELECT key, label
       FROM genres
       ORDER BY label ASC`
    );
    return res.json({ genres: r.rows });
  } catch (err: any) {
    console.error("❌ /api/stories/genres error:", err?.message || err);
    return res.status(500).json({ error: "Unable to load genres" });
  }
});

/** GET /api/stories/:id */
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const storyId = req.params.id;
  try {
    const storyRes = await query(
      `
      SELECT s.id, s.slug, s.title, s.summary, s.cover_image_url,
             COALESCE(AVG(sr.rating), 0) AS avg_rating
      FROM stories s
      JOIN story_versions v ON v.story_id = s.id AND v.is_published = true
      LEFT JOIN story_ratings sr ON sr.story_id = s.id
      WHERE s.id=$1
      GROUP BY s.id
      `,
      [storyId]
    );

    if (!storyRes.rows.length) {
      return res.status(404).json({ error: "Story not found or unpublished" });
    }

    const story = storyRes.rows[0];

    const savedRes = await query(
      "SELECT 1 FROM saved_stories WHERE user_id=$1 AND story_id=$2",
      [req.user!.id, storyId]
    );

    return res.json({
      id: story.id,
      slug: story.slug,
      title: story.title,
      summary: story.summary,
      coverImageUrl: story.cover_image_url,
      avgRating: parseFloat(story.avg_rating) || 0,
      saved: savedRes.rows.length > 0,
    });
  } catch (err: any) {
    console.error("❌ /api/stories/:id error:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


export default router;
