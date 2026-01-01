import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { query } from '../db';

const router = Router();

// GET /api/saved
// Returns the list of saved stories for the current user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const savedRes = await query(
      `SELECT s.id, s.slug, s.title, s.summary, s.cover_image_url,
              COALESCE(avg(sr.rating), 0) AS avg_rating
       FROM saved_stories ss
       JOIN stories s ON ss.story_id = s.id
       LEFT JOIN story_ratings sr ON sr.story_id = s.id
       WHERE ss.user_id=$1
       GROUP BY s.id`,
      [userId]
    );
    const saved = savedRes.rows.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      summary: s.summary,
      coverImageUrl: s.cover_image_url,
      avgRating: parseFloat(s.avg_rating) || 0
    }));
    return res.json({ saved });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/stories/:id/save
// Save a story for later
router.post('/:storyId/save', requireAuth, async (req: AuthRequest, res: Response) => {
  const storyId = req.params.storyId;
  const user = req.user!;
  try {
    // Check if already saved
    const existing = await query('SELECT id FROM saved_stories WHERE user_id=$1 AND story_id=$2', [user.id, storyId]);
    if (existing.rows.length) {
      return res.status(200).json({ ok: true });
    }
    // Count saved stories to enforce limit
    const countRes = await query('SELECT COUNT(*) FROM saved_stories WHERE user_id=$1', [user.id]);
    const count = parseInt(countRes.rows[0].count);
    const limit = user.is_premium ? 50 : 10;
    if (count >= limit) {
      return res.status(400).json({ error: `Saved limit reached (${limit}). Remove a story to save another.` });
    }
    await query('INSERT INTO saved_stories (user_id, story_id) VALUES ($1, $2)', [user.id, storyId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/stories/:id/save
// Remove a saved story
router.delete('/:storyId/save', requireAuth, async (req: AuthRequest, res: Response) => {
  const storyId = req.params.storyId;
  try {
    await query('DELETE FROM saved_stories WHERE user_id=$1 AND story_id=$2', [req.user!.id, storyId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;