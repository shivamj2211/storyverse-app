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
  `
  SELECT DISTINCT ON (r.story_id)
    r.id,
    r.story_id,
    r.is_completed,
    r.started_at,
    r.updated_at,
    s.title
  FROM story_runs r
  JOIN stories s ON r.story_id = s.id
  WHERE r.user_id=$1
  -- ✅ prefer in-progress run; else latest completed
  ORDER BY r.story_id, r.is_completed ASC, r.updated_at DESC
  `,
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
  `SELECT r.id as run_id, r.story_id, r.current_node_id, r.is_completed,
          n.step_no, n.id as node_id, n.title, n.content, n.is_start
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
    storyId: run.story_id,
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

//unlock
async function isChapterUnlocked(
  userId: string,
  storyId: string,
  chapterNumber: number
) {
  const q = await query(
    `SELECT 1 FROM chapter_unlocks
     WHERE user_id=$1 AND story_id=$2 AND chapter_number=$3`,
    [userId, storyId, chapterNumber]
  );
  return q.rows.length > 0;
}

function requiredCoinsForChapter(chapterNumber: number) {
  if (chapterNumber >= 3 && chapterNumber <= 5) return 100;
  return 0;
}

// GET /api/runs/:runId/current
// Returns current node, available choices with average ratings, and whether rating is submitted
router.get("/:runId/current", requireAuth, async (req: AuthRequest, res: Response) => {
  const runId = req.params.runId;

  try {
    const payload = await buildCurrentNode(runId, req.user!.id);

    // 🔒 ENFORCE CHAPTER LOCK FOR FREE USERS (step 3+)
    const plan = req.user!.plan; // "free" | "premium" | "creator"
    const stepNo = Number(payload.node.stepNo);

    if (plan === "free" && stepNo >= 3) {
      const unlocked = await isChapterUnlocked(req.user!.id, payload.storyId, stepNo);
      if (!unlocked) {
        const userQ = await query(`SELECT coins FROM users WHERE id=$1`, [req.user!.id]);
        const available = Number(userQ.rows?.[0]?.coins ?? 0);
        const requiredCoins = requiredCoinsForChapter(stepNo);

        
        return res.status(403).json({
          code: "CHAPTER_LOCKED",
          chapterNumber: stepNo,
          requiredCoins,
          available,
          storyId: payload.storyId,
          runId,
        });
      }
    }
console.log("DEBUG CURRENT LOCK:", { plan: req.user.plan, stepNo: payload.node.stepNo, storyId: payload.storyId });

    return res.json(payload);
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
  console.log("✅ RUNS /choose HIT", {
  runId,
  userId,
  plan: req.user?.plan,
});

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
    // 🔒 BLOCK FREE USERS FROM STEP 3+ UNLESS UNLOCKED
const nextNodeRes = await query(
  "SELECT step_no FROM story_nodes WHERE id=$1",
  [toNodeId]
);
const nextStepNo = Number(nextNodeRes.rows?.[0]?.step_no ?? 0);
// if (String(req.user?.plan || "").toLowerCase() === "free" && nextStepNo >= 3) {
//   console.log("🔒 FORCED LOCK TRIGGERED", { nextStepNo });
//   return res.status(403).json({
//     code: "CHAPTER_LOCKED",
//     chapterNumber: nextStepNo,
//     requiredCoins: 100,
//     available: Number(req.user?.coins ?? 0),
//   });
// }

// Get storyId for unlock check
const storyRes = await query(
  "SELECT story_id FROM story_runs WHERE id=$1 AND user_id=$2",
  [runId, userId]
);

if (!storyRes.rows.length) {
  return res.status(404).json({ error: "Run not found" });
}

const storyId: string = storyRes.rows[0].story_id;


if (req.user!.plan === "free" && nextStepNo >= 3) {
  const unlocked = await isChapterUnlocked(userId, storyId, nextStepNo);

  if (!unlocked) {
    const userQ = await query("SELECT coins FROM users WHERE id=$1", [userId]);
    const available = Number(userQ.rows?.[0]?.coins ?? 0);
    const requiredCoins = requiredCoinsForChapter(nextStepNo);
  
   

    return res.status(403).json({
      code: "CHAPTER_LOCKED",
      chapterNumber: nextStepNo,
      requiredCoins,
      available,
      storyId,
      runId,
    });
  }
}

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
// ===============================
// UNLOCK CHAPTER (100 coins)
// ===============================
router.post("/:runId/unlock", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const runId = req.params.runId;
  const chapterNumber = Number(req.body.chapterNumber);

  // Only chapter 3,4,5 are paid
  if (![3, 4, 5].includes(chapterNumber)) {
    return res.status(400).json({ error: "Invalid chapter number" });
  }

  // Premium / Creator → no lock
  if (req.user.plan !== "free") {
    return res.json({ ok: true, unlocked: true });
  }

  // 1️⃣ Get run & story (SECURITY: ensure run belongs to this user)
  const runQ = await query(
    `SELECT id, story_id FROM story_runs WHERE id=$1 AND user_id=$2`,
    [runId, userId]
  );

  if (runQ.rows.length === 0) {
    return res.status(404).json({ error: "Run not found" });
  }

  const storyId = runQ.rows[0].story_id;
  const cost = 100;

  // ===============================
  // 4️⃣ TRANSACTION STARTS HERE
  // ===============================
  await query("BEGIN");

  try {
    // 2️⃣ Check already unlocked (IDEMPOTENT) — inside transaction
    const unlockedQ = await query(
      `SELECT 1 FROM chapter_unlocks
       WHERE user_id=$1 AND story_id=$2 AND chapter_number=$3
       LIMIT 1`,
      [userId, storyId, chapterNumber]
    );

    if (unlockedQ.rows.length > 0) {
      // already unlocked → don't charge again
      await query("COMMIT");
      return res.json({ ok: true, unlocked: true, alreadyUnlocked: true });
    }

    // 3️⃣ Check user coins safely (LOCK ROW so double-click can't double spend)
    const userQ = await query(
      `SELECT coins FROM users WHERE id=$1 FOR UPDATE`,
      [userId]
    );

    const availableCoins = Number(userQ.rows[0]?.coins ?? 0);

    if (availableCoins < cost) {
      await query("ROLLBACK");
      return res.status(402).json({
        error: "INSUFFICIENT_COINS",
        available: availableCoins,
        required: cost,
      });
    }

    const remainingCoins = availableCoins - cost;

    // Deduct coins
    await query(
      `UPDATE users SET coins = $1 WHERE id=$2`,
      [remainingCoins, userId]
    );

    // Save unlock (permanent for that story + chapter)
    await query(
      `INSERT INTO chapter_unlocks (user_id, story_id, chapter_number)
       VALUES ($1, $2, $3)`,
      [userId, storyId, chapterNumber]
    );

    // Log transaction
    // ✅ meta keys aligned with wallet UI + future debugging
    await query(
      `INSERT INTO coin_transactions (user_id, type, coins, meta)
       VALUES ($1, 'redeem', $2, $3::jsonb)`,
      [
        userId,
        -cost,
        JSON.stringify({
          story_id: storyId,
          chapter_number: chapterNumber,
          note: `Unlocked Chapter ${chapterNumber}`,
        }),
      ]
    );

    await query("COMMIT");

    return res.json({
      ok: true,
      unlocked: true,
      remainingCoins,
      spent: cost,
      storyId,
      chapterNumber,
    });
  } catch (err) {
    await query("ROLLBACK");
    console.error("Unlock failed:", err);
    return res.status(500).json({ error: "Unlock failed" });
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


// ... existing routes
// ✅ GET /api/runs/:runId/reading-state?nodeId=...
router.get("/:runId/reading-state", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id;
  const runId = req.params.runId;
  const nodeId = String(req.query.nodeId || "");

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!nodeId) return res.status(400).json({ error: "nodeId is required" });

  const q = `
    select page_index, bookmark_page_index, font_px
    from reading_state
    where user_id=$1 and run_id=$2 and node_id=$3
    limit 1
  `;

  const r = await query(q, [userId, runId, nodeId]);
  return res.json({ state: r.rows[0] ?? null });
});

// ✅ POST /api/runs/:runId/reading-state
router.post("/:runId/reading-state", requireAuth, async (req, res) => {
  const userId = (req as any).user?.id;
  const runId = req.params.runId;
  const { nodeId, pageIndex, bookmarkPageIndex, fontPx } = req.body || {};

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!nodeId) return res.status(400).json({ error: "nodeId is required" });

  const q = `
    insert into reading_state (user_id, run_id, node_id, page_index, bookmark_page_index, font_px)
    values ($1, $2, $3, $4, $5, $6)
    on conflict (user_id, run_id, node_id)
    do update set
      page_index = excluded.page_index,
      bookmark_page_index = excluded.bookmark_page_index,
      font_px = excluded.font_px,
      updated_at = now()
    returning page_index, bookmark_page_index, font_px
  `;

  const r = await query(q, [
    userId,
    runId,
    String(nodeId),
    Number(pageIndex ?? 0),
    bookmarkPageIndex === null || bookmarkPageIndex === undefined ? null : Number(bookmarkPageIndex),
    fontPx === null || fontPx === undefined ? null : Number(fontPx),
  ]);

  return res.json({ ok: true, state: r.rows[0] });
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
// POST /api/runs/:runId/feedback  body: { rating?: number, feedback?: string }
router.post("/:runId/feedback", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const runId = req.params.runId;
  const rating = req.body.rating ? Number(req.body.rating) : null;
  const feedback = req.body.feedback ? String(req.body.feedback).slice(0, 2000) : null;

  const runQ = await query(
    `SELECT id, story_id, is_completed
     FROM story_runs
     WHERE id=$1`,
    [runId]
  );

  const run = runQ.rows?.[0];
  if (!run) return res.status(404).json({ error: "Run not found" });

  if (!run.is_completed) {
    return res.status(400).json({ error: "Run not completed yet" });
  }

  await query(
    `INSERT INTO run_feedback (run_id, user_id, story_id, rating, feedback)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (run_id, user_id)
     DO UPDATE SET rating=EXCLUDED.rating, feedback=EXCLUDED.feedback`,
    [runId, userId, run.story_id, rating, feedback]
  );

  res.json({ ok: true });
});

// ===============================
// GET UNLOCKED CHAPTERS FOR RUN
// ===============================
router.get("/:runId/unlocks", requireAuth, async (req: AuthRequest, res) => {
  const runId = req.params.runId;
  const userId = req.user!.id;

  // 1️⃣ Get story_id from run
  const runQ = await query(
    `SELECT story_id FROM story_runs WHERE id=$1 AND user_id=$2`,
    [runId, userId]
  );

  if (!runQ.rows.length) {
    return res.status(404).json({ error: "Run not found" });
  }

  const storyId = runQ.rows[0].story_id;

  // 2️⃣ Fetch unlocked chapters for this story
  const q = await query(
    `SELECT chapter_number
     FROM chapter_unlocks
     WHERE user_id=$1 AND story_id=$2
     ORDER BY chapter_number`,
    [userId, storyId]
  );

  res.json({
    unlockedChapters: q.rows.map((r) => Number(r.chapter_number)),
  });
});

export default router;
