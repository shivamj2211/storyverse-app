import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { query } from '../db';
import { z } from 'zod';

const router = Router();

// Rate a story
router.post('/story/:storyId/rate', requireAuth, async (req: AuthRequest, res: Response) => {
  const storyId = req.params.storyId;
  const { rating } = z.object({ rating: z.number().int().min(1).max(5) }).parse(req.body);
  const userId = req.user!.id;
  try {
    // verify story exists
    const storyRes = await query('SELECT id FROM stories WHERE id=$1', [storyId]);
    if (!storyRes.rows.length) {
      return res.status(404).json({ error: 'Story not found' });
    }
    await query(
      'INSERT INTO story_ratings (user_id, story_id, rating) VALUES ($1, $2, $3) ON CONFLICT (user_id, story_id) DO UPDATE SET rating = EXCLUDED.rating',
      [userId, storyId, rating]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top rated stories
router.get('/stories/top', async (req: Request, res: Response) => {
  try {
    const topRes = await query(
      `SELECT s.id, s.slug, s.title, COALESCE(avg(sr.rating), 0) as avg_rating
       FROM stories s
       LEFT JOIN story_ratings sr ON sr.story_id = s.id
       JOIN story_versions v ON v.story_id = s.id AND v.is_published = true
       GROUP BY s.id
       HAVING COUNT(sr.id) > 0
       ORDER BY avg_rating DESC
       LIMIT 10`
    );
    const top = topRes.rows.map((r) => ({ id: r.id, slug: r.slug, title: r.title, avgRating: parseFloat(r.avg_rating) || 0 }));
    return res.json({ top });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



export default router;