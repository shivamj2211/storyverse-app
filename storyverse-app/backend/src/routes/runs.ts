import { Router, Request, Response } from "express";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { query } from "../db";
import { z } from "zod";
import { creditCoinsIfEligible } from "../lib/coinEngine";

const router = Router();
const TOTAL_STEPS = 5;

// List all runs for the authenticated user
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  try {
    const runsRes = await query(
      `SELECT r.id, r.story_id,  r.is_completed, r.started_at, r.updated_at, s.title
       FROM story_runs r
       JOIN stories s ON r.story_id = s.id
       WHERE r.user_id=$1
       ORDER BY r.started_at DESC`,
      [user.id]
    );
    const runs = runsRes.rows.map((r) => ({
      id: r.id,
      storyId: r.story_id,
      storyTitle: r.title,
      isCompleted: r.is_completed,
      startedAt: r.started_at,
      updatedAt: r.updated_at,
    }));
    return res.json({ runs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Helper to build current node payload with choices and ratings
async function buildCurrentNode(runId: string, userId: string) {
  // fetch run and node details
  const runRes = await query(
    `SELECT r.id as run_id, r.current_node_id, r.is_completed, n.step_no, n.id as node_id, n.title, n.content, n.is_start
     FROM story_runs r
     JOIN story_nodes n ON r.current_node_id = n.id
     WHERE r.id=$1`,
    [runId]
  );
  if (!runRes.rows.length) {
    throw new Error("Run not found");
  }
  const run = runRes.rows[0];

  // Determine if rating already given for this node
  const ratingRes = await query(
    "SELECT rating FROM genre_ratings WHERE run_id=$1 AND node_id=$2",
    [runId, run.node_id]
  );
  const ratingSubmitted = ratingRes.rows.length > 0;

  // Find available choices for current node
  const choicesRes = await query(
    `SELECT nc.genre_key, nc.to_node_id
     FROM node_choices nc
     WHERE nc.from_node_id=$1
     ORDER BY nc.genre_key`,
    [run.current_node_id]
  );

  const choices = [] as any[];
  for (const choice of choicesRes.rows) {
    // compute average rating for the to_node
    const avgRes = await query(
      "SELECT AVG(rating) as avg FROM genre_ratings WHERE node_id=$1",
      [choice.to_node_id]
    );
    const avg = avgRes.rows[0].avg;
    choices.push({
      genreKey: choice.genre_key,
      toNodeId: choice.to_node_id,
      avgRating: avg ? parseFloat(avg).toFixed(2) : null,
    });
  }

  return {
    node: {
      id: run.node_id,
      title: run.title,
      content: run.content,
      stepNo: run.step_no,
      isStart: run.is_start,
    },
    ratingSubmitted,
    choices,
    isCompleted: run.is_completed,
  };
}

// GET /api/runs/:runId/current
// Returns current node, available choices with average ratings, and whether rating is submitted
router.get("/:runId/current", requireAuth, async (req: AuthRequest, res: Response) => {
  const runId = req.params.runId;
  try {
    const run = await buildCurrentNode(runId, req.user!.id);
    return res.json(run);
  } catch (err) {
    console.error(err);
    return res.status(404).json({ error: (err as any).message });
  }
});

// POST /api/runs/:runId/choose
// Choose a genre for the current step
router.post("/:runId/choose", requireAuth, async (req: AuthRequest, res: Response) => {
  const runId = req.params.runId;
  const { genreKey } = z.object({ genreKey: z.string() }).parse(req.body);
  const userId = req.user!.id;

  try {
    // verify run belongs to user and not completed
    const runRes = await query(
      "SELECT id, current_node_id, story_version_id, is_completed FROM story_runs WHERE id=$1 AND user_id=$2",
      [runId, userId]
    );
    if (!runRes.rows.length) {
      return res.status(404).json({ error: "Run not found" });
    }
    const run = runRes.rows[0];

    if (run.is_completed) {
      return res.status(400).json({ error: "Run is already completed" });
    }

    // get current node details
    const nodeRes = await query("SELECT step_no FROM story_nodes WHERE id=$1", [run.current_node_id]);
    const currentStep = nodeRes.rows[0].step_no;

    // ensure not already chosen this step
    const choiceExists = await query("SELECT id FROM run_choices WHERE run_id=$1 AND step_no=$2", [
      runId,
      currentStep,
    ]);
    if (choiceExists.rows.length) {
      return res.status(400).json({ error: "Choice already locked for this step" });
    }

    // find the target node for the chosen genre
    const choiceRes = await query(
      "SELECT to_node_id FROM node_choices WHERE from_node_id=$1 AND genre_key=$2",
      [run.current_node_id, genreKey]
    );
    if (!choiceRes.rows.length) {
      return res.status(400).json({ error: "Invalid genre choice" });
    }
    const toNodeId = choiceRes.rows[0].to_node_id;

    // insert into run_choices
    await query(
      "INSERT INTO run_choices (run_id, step_no, from_node_id, genre_key, to_node_id) VALUES ($1, $2, $3, $4, $5)",
      [runId, currentStep, run.current_node_id, genreKey, toNodeId]
    );

    // We DO NOT mark completed just by reaching step 5.
    // Completion should happen only after the user rates the final chapter and clicks Finish.
    await query("UPDATE story_runs SET current_node_id=$1, updated_at=NOW(), is_completed=FALSE WHERE id=$2", [
      toNodeId,
      runId,
    ]);

    // Return new node payload
    const payload = await buildCurrentNode(runId, userId);
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/runs/:runId/rate
// Submit a rating for the current node (genre)
router.post("/:runId/rate", requireAuth, async (req: AuthRequest, res: Response) => {
  const runId = req.params.runId;
  const { nodeId, rating } = z
    .object({ nodeId: z.string().uuid(), rating: z.number().int().min(1).max(5) })
    .parse(req.body);

  const userId = req.user!.id;

  try {
    // verify run belongs to user
    const runRes = await query("SELECT current_node_id FROM story_runs WHERE id=$1 AND user_id=$2", [runId, userId]);
    if (!runRes.rows.length) {
      return res.status(404).json({ error: "Run not found" });
    }

    // find the genre key for this node from run_choices
    const choiceRes = await query("SELECT genre_key FROM run_choices WHERE run_id=$1 AND to_node_id=$2", [runId, nodeId]);
    if (!choiceRes.rows.length) {
      return res.status(400).json({ error: "Cannot rate this node" });
    }
    const genreKey = choiceRes.rows[0].genre_key;

    // insert rating (one per run/node; upsert)
    await query(
      `INSERT INTO genre_ratings (user_id, run_id, node_id, genre_key, rating)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (run_id, node_id)
       DO UPDATE SET rating=EXCLUDED.rating`,
      [userId, runId, nodeId, genreKey, rating]
    );

    // ✅ AUTO COINS: reward for rating (admin-controlled via reward_rules: chapter_rate)
    // Duplicate-safe if you have unique constraint for same event in coin_transactions
    await creditCoinsIfEligible({
      userId,
      ruleKey: "chapter_rate",
      reason: "chapter_rate",
      meta: { runId, nodeId },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/runs/:runId/journey
// Returns progress info for the journey: current step and picked genres for past steps
router.get("/:runId/journey", requireAuth, async (req: AuthRequest, res: Response) => {
  const runId = req.params.runId;
  const userId = req.user!.id;

  try {
    // fetch current step from the run
    const runRes = await query(
      `SELECT r.id, n.step_no AS current_step
       FROM story_runs r
       JOIN story_nodes n ON n.id = r.current_node_id
       WHERE r.id=$1 AND r.user_id=$2`,
      [runId, userId]
    );
    if (!runRes.rows.length) {
      return res.status(404).json({ error: "Run not found" });
    }

    const currentStep: number = runRes.rows[0].current_step;

    // fetch picked genres for each completed step
    const pickedRes = await query(
      `SELECT step_no, genre_key
       FROM run_choices
       WHERE run_id=$1
       ORDER BY step_no ASC`,
      [runId]
    );
    const picked = pickedRes.rows.map((row) => ({
      stepNo: row.step_no,
      genreKey: row.genre_key,
    }));

    // also return isCompleted (helps frontend)
    const isCompletedRes = await query(`SELECT is_completed FROM story_runs WHERE id=$1 AND user_id=$2`, [runId, userId]);
    const isCompleted = !!isCompletedRes.rows?.[0]?.is_completed;

    return res.json({ totalSteps: 5, currentStep, picked, isCompleted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/runs/:runId/finish
// Marks run completed ONLY on step 5 AND only if final chapter was rated
router.post("/:runId/finish", requireAuth, async (req: AuthRequest, res: Response) => {
  const runId = req.params.runId;
  const userId = req.user!.id;

  try {
    const runRes = await query(
      `SELECT r.id, r.story_id, r.current_node_id, r.is_completed, n.step_no
       FROM story_runs r
       JOIN story_nodes n ON n.id = r.current_node_id
       WHERE r.id=$1 AND r.user_id=$2`,
      [runId, userId]
    );

    if (!runRes.rows.length) {
      return res.status(404).json({ error: "Run not found" });
    }

    const run = runRes.rows[0];

    if (run.is_completed) {
      return res.json({ ok: true }); // already completed (idempotent)
    }

    // Must be at final step
    if (Number(run.step_no) !== 5) {
      return res.status(400).json({ error: "You can only finish on step 5." });
    }

    // Must have rated final node
    const ratingRes = await query(
      `SELECT 1 FROM genre_ratings WHERE run_id=$1 AND node_id=$2 LIMIT 1`,
      [runId, run.current_node_id]
    );

    if (!ratingRes.rows.length) {
      return res.status(400).json({ error: "Please rate the final chapter before finishing." });
    }

    await query(`UPDATE story_runs SET is_completed=TRUE, updated_at=NOW() WHERE id=$1`, [runId]);

    // ✅ AUTO COINS: reward for completing the journey (admin-controlled via reward_rules: chapter_complete)
    await creditCoinsIfEligible({
      userId,
      ruleKey: "chapter_complete",
      reason: "chapter_complete",
      meta: { runId, storyId: run.story_id, nodeId: run.current_node_id, stepNo: 5 },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/runs/:runId/summary
// final journey rating = AVG of all chapter ratings for that run
router.get("/:runId/summary", requireAuth, async (req: AuthRequest, res: Response) => {
  const runId = req.params.runId;
  const userId = req.user!.id;

  try {
    const runRes = await query(`SELECT id, is_completed FROM story_runs WHERE id=$1 AND user_id=$2`, [runId, userId]);

    if (!runRes.rows.length) {
      return res.status(404).json({ error: "Run not found" });
    }

    const isCompleted = !!runRes.rows[0].is_completed;

    const avgRes = await query(`SELECT AVG(rating)::float AS avg_rating FROM genre_ratings WHERE run_id=$1`, [runId]);

    const avg = avgRes.rows?.[0]?.avg_rating;
    const finalJourneyRating = avg ? Number(avg.toFixed(2)) : null;

    return res.json({
      isCompleted,
      totalSteps: 5,
      finalJourneyRating,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
