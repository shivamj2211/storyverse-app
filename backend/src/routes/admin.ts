import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/admin';
import { importStory } from '../utils/storyImport';
import { query } from '../db';
import { z } from 'zod';
import adminUsers from "./adminusers";
import adminCoins from "./adminCoins";

import adminRewardRules from "./adminRewardRules";


const router = Router();
router.use("/users", adminUsers);
router.use("/coins", adminCoins);
router.use("/reward-rules", adminRewardRules);

// Admin route to import a story package from JSON
    router.post('/story-import', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
      try {
        // Accept JSON body
        const pkg = req.body;
        const versionId = await importStory(pkg);
        return res.json({ ok: true, versionId });
      } catch (err: any) {
        console.error(err);
        return res.status(400).json({ error: err.message || 'Import failed' });
      }
    });

    // Publish a version
    router.post('/versions/:versionId/publish', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
      const versionId = req.params.versionId;
      try {
        // Find version and its story
        const vRes = await query('SELECT story_id FROM story_versions WHERE id=$1', [versionId]);
        if (!vRes.rows.length) {
          return res.status(404).json({ error: 'Version not found' });
        }
        const storyId = vRes.rows[0].story_id;
        // Unpublish other versions of the story
        await query('UPDATE story_versions SET is_published=false WHERE story_id=$1', [storyId]);
        // Publish this version
        await query('UPDATE story_versions SET is_published=true, published_at=NOW() WHERE id=$1', [versionId]);
        return res.json({ ok: true });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

      // Unpublish a version (only if safe)
      router.post('/versions/:versionId/unpublish', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
        const versionId = req.params.versionId;
        try {
          // Ensure no runs referencing this version
          const runsRes = await query('SELECT 1 FROM story_runs WHERE story_version_id=$1 LIMIT 1', [versionId]);
          if (runsRes.rows.length) {
            return res.status(400).json({ error: 'Cannot unpublish version with existing runs' });
          }
          await query('UPDATE story_versions SET is_published=false, published_at=NULL WHERE id=$1', [versionId]);
          return res.json({ ok: true });
        } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Internal server error' });
        }
      });

      // Delete a version (only drafts, no runs)
      router.delete('/versions/:versionId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
        const versionId = req.params.versionId;
        try {
          const versionRes = await query('SELECT is_published FROM story_versions WHERE id=$1', [versionId]);
          if (!versionRes.rows.length) {
            return res.status(404).json({ error: 'Version not found' });
          }
          if (versionRes.rows[0].is_published) {
            return res.status(400).json({ error: 'Cannot delete published version' });
          }
          const runsRes = await query('SELECT 1 FROM story_runs WHERE story_version_id=$1 LIMIT 1', [versionId]);
          if (runsRes.rows.length) {
            return res.status(400).json({ error: 'Cannot delete version with existing runs' });
          }
          await query('DELETE FROM story_versions WHERE id=$1', [versionId]);
          return res.json({ ok: true });
        } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Internal server error' });
        }
      });

      // List stories and their versions (admin view)
      router.get('/stories', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
        try {
          const resStories = await query('SELECT id, slug, title, summary FROM stories');
          const stories = [] as any[];
          for (const story of resStories.rows) {
            const versionsRes = await query('SELECT id, version_name, is_published, published_at, notes FROM story_versions WHERE story_id=$1 ORDER BY created_at DESC', [story.id]);
            stories.push({
              id: story.id,
              slug: story.slug,
              title: story.title,
              summary: story.summary,
              versions: versionsRes.rows.map((v) => ({ id: v.id, versionName: v.version_name, isPublished: v.is_published, publishedAt: v.published_at, notes: v.notes }))
            });
          }
          return res.json({ stories });
        } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Internal server error' });
        }
      });

      // Get a single story with its versions
      router.get('/stories/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
        const storyId = req.params.id;
        try {
          const storyRes = await query('SELECT id, slug, title, summary FROM stories WHERE id=$1', [storyId]);
          if (!storyRes.rows.length) {
            return res.status(404).json({ error: 'Story not found' });
          }
          const versionsRes = await query('SELECT id, version_name, is_published, published_at, notes FROM story_versions WHERE story_id=$1 ORDER BY created_at DESC', [storyId]);
          return res.json({
            id: storyRes.rows[0].id,
            slug: storyRes.rows[0].slug,
            title: storyRes.rows[0].title,
            summary: storyRes.rows[0].summary,
            versions: versionsRes.rows.map((v) => ({ id: v.id, versionName: v.version_name, isPublished: v.is_published, publishedAt: v.published_at, notes: v.notes }))
          });
        } catch (err) {
          console.error(err);
          return res.status(500).json({ error: 'Internal server error' });
        }
      });
      // ----------------------------
      // ADMIN: Nodes (story_nodes)
      // ----------------------------

      // Get latest versionId for a story (prefer published, else latest)
      async function getBestVersionId(storyId: string) {
        const published = await query(
          `SELECT id FROM story_versions
          WHERE story_id=$1 AND is_published=true
          ORDER BY published_at DESC NULLS LAST, created_at DESC
          LIMIT 1`,
          [storyId]
        );
        if (published.rows[0]?.id) return published.rows[0].id as string;

        const latest = await query(
          `SELECT id FROM story_versions
          WHERE story_id=$1
          ORDER BY created_at DESC
          LIMIT 1`,
          [storyId]
        );
        return latest.rows[0]?.id as string | undefined;
      }

      // GET nodes for a story (latest/published version)
      router.get(
        "/stories/:id/nodes",
        requireAuth,
        requireAdmin,
        async (req: AuthRequest, res: Response) => {
          try {
            const storyId = req.params.id;

            const versionId = await getBestVersionId(storyId);
            if (!versionId) return res.status(404).json({ error: "No version found" });

            const nodesRes = await query(
              `SELECT id, story_version_id, step_no, node_code, title, content, is_start, created_at
              FROM story_nodes
              WHERE story_version_id=$1
              ORDER BY step_no ASC, created_at ASC`,
              [versionId]
            );

            return res.json({
              storyId,
              versionId,
              nodes: nodesRes.rows,
            });
          } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error" });
          }
        }
      );

      // POST create node (chapter)
      router.post(
        "/nodes",
        requireAuth,
        requireAdmin,
        async (req: AuthRequest, res: Response) => {
          try {
            const schema = z.object({
              story_id: z.string().uuid(),
              story_version_id: z.string().uuid().optional(),
              step_no: z.number().int().min(1).max(5),
              node_code: z.string().min(1).optional(),
              title: z.string().min(1),
              content: z.string().min(1),
              is_start: z.boolean().optional().default(false),
            });

            const body = schema.parse(req.body);

            const versionId =
              body.story_version_id || (await getBestVersionId(body.story_id));
            if (!versionId) return res.status(404).json({ error: "No version found" });

            const nodeCode =
              body.node_code ||
              `n${body.step_no}-${Math.random().toString(36).slice(2, 8)}`;

            const ins = await query(
              `INSERT INTO story_nodes (story_version_id, step_no, node_code, title, content, is_start)
              VALUES ($1,$2,$3,$4,$5,$6)
              RETURNING *`,
              [versionId, body.step_no, nodeCode, body.title, body.content, body.is_start]
            );

            return res.status(201).json({ node: ins.rows[0] });
          } catch (err: any) {
            if (err?.name === "ZodError") {
              return res.status(400).json({ error: "Invalid payload", details: err.errors });
            }
            console.error(err);
            return res.status(400).json({ error: err.message || "Create node failed" });
          }
        }
      );

      // PUT update node
      router.put(
        "/nodes/:id",
        requireAuth,
        requireAdmin,
        async (req: AuthRequest, res: Response) => {
          try {
            const nodeId = req.params.id;

            const schema = z.object({
              step_no: z.number().int().min(1).max(5).optional(),
              node_code: z.string().min(1).optional(),
              title: z.string().min(1).optional(),
              content: z.string().min(1).optional(),
              is_start: z.boolean().optional(),
            });

            const body = schema.parse(req.body);

            const fields: string[] = [];
            const values: any[] = [];
            let i = 1;

            if (body.step_no !== undefined) { fields.push(`step_no=$${i++}`); values.push(body.step_no); }
            if (body.node_code !== undefined) { fields.push(`node_code=$${i++}`); values.push(body.node_code); }
            if (body.title !== undefined) { fields.push(`title=$${i++}`); values.push(body.title); }
            if (body.content !== undefined) { fields.push(`content=$${i++}`); values.push(body.content); }
            if (body.is_start !== undefined) { fields.push(`is_start=$${i++}`); values.push(body.is_start); }

            if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

            values.push(nodeId);

            const upd = await query(
              `UPDATE story_nodes SET ${fields.join(", ")} WHERE id=$${i} RETURNING *`,
              values
            );

            if (!upd.rows.length) return res.status(404).json({ error: "Node not found" });

            return res.json({ node: upd.rows[0] });
          } catch (err: any) {
            if (err?.name === "ZodError") {
              return res.status(400).json({ error: "Invalid payload", details: err.errors });
            }
            console.error(err);
            return res.status(400).json({ error: err.message || "Update node failed" });
          }
        }
      );

      // DELETE node (also delete choices referencing it)
      router.delete(
        "/nodes/:id",
        requireAuth,
        requireAdmin,
        async (req: AuthRequest, res: Response) => {
          try {
            const nodeId = req.params.id;

            await query(`DELETE FROM node_choices WHERE from_node_id=$1 OR to_node_id=$1`, [nodeId]);
            const del = await query(`DELETE FROM story_nodes WHERE id=$1 RETURNING id`, [nodeId]);

            if (!del.rows.length) return res.status(404).json({ error: "Node not found" });
            return res.json({ ok: true });
          } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error" });
          }
        }
      );

      // ----------------------------
      // ADMIN: Choices (node_choices)
      // ----------------------------

      // GET choices for a story (latest/published version)
      router.get(
        "/stories/:id/choices",
        requireAuth,
        requireAdmin,
        async (req: AuthRequest, res: Response) => {
          try {
            const storyId = req.params.id;
            const versionId = await getBestVersionId(storyId);
            if (!versionId) return res.status(404).json({ error: "No version found" });

            const choicesRes = await query(
              `SELECT c.id, c.story_version_id, c.genre_key, c.from_node_id, c.to_node_id, c.created_at,
                      fn.node_code as from_node_code, fn.title as from_title,
                      tn.node_code as to_node_code, tn.title as to_title
              FROM node_choices c
              JOIN story_nodes fn ON fn.id=c.from_node_id
              JOIN story_nodes tn ON tn.id=c.to_node_id
              WHERE c.story_version_id=$1
              ORDER BY fn.step_no ASC, c.genre_key ASC`,
              [versionId]
            );

            return res.json({ storyId, versionId, choices: choicesRes.rows });
          } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error" });
          }
        }
      );

      // POST create choice
      router.post(
        "/choices",
        requireAuth,
        requireAdmin,
        async (req: AuthRequest, res: Response) => {
          try {
            const schema = z.object({
              story_version_id: z.string().uuid(),
              from_node_id: z.string().uuid(),
              genre_key: z.string().min(1),
              to_node_id: z.string().uuid(),
            });

            const body = schema.parse(req.body);

            const ins = await query(
              `INSERT INTO node_choices (story_version_id, from_node_id, genre_key, to_node_id)
              VALUES ($1,$2,$3,$4)
              RETURNING *`,
              [body.story_version_id, body.from_node_id, body.genre_key, body.to_node_id]
            );

            return res.status(201).json({ choice: ins.rows[0] });
          } catch (err: any) {
            if (err?.name === "ZodError") {
              return res.status(400).json({ error: "Invalid payload", details: err.errors });
            }
            console.error(err);
            return res.status(400).json({ error: err.message || "Create choice failed" });
          }
        }
      );

      // PUT update choice
      router.put(
        "/choices/:id",
        requireAuth,
        requireAdmin,
        async (req: AuthRequest, res: Response) => {
          try {
            const choiceId = req.params.id;

            const schema = z.object({
              genre_key: z.string().min(1).optional(),
              to_node_id: z.string().uuid().optional(),
            });

            const body = schema.parse(req.body);

            const fields: string[] = [];
            const values: any[] = [];
            let i = 1;

            if (body.genre_key !== undefined) { fields.push(`genre_key=$${i++}`); values.push(body.genre_key); }
            if (body.to_node_id !== undefined) { fields.push(`to_node_id=$${i++}`); values.push(body.to_node_id); }

            if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

            values.push(choiceId);

            const upd = await query(
              `UPDATE node_choices SET ${fields.join(", ")} WHERE id=$${i} RETURNING *`,
              values
            );

            if (!upd.rows.length) return res.status(404).json({ error: "Choice not found" });

            return res.json({ choice: upd.rows[0] });
          } catch (err: any) {
            if (err?.name === "ZodError") {
              return res.status(400).json({ error: "Invalid payload", details: err.errors });
            }
            console.error(err);
            return res.status(400).json({ error: err.message || "Update choice failed" });
          }
        }
      );

      // DELETE choice
      router.delete(
        "/choices/:id",
        requireAuth,
        requireAdmin,
        async (req: AuthRequest, res: Response) => {
          try {
            const choiceId = req.params.id;
            const del = await query(`DELETE FROM node_choices WHERE id=$1 RETURNING id`, [choiceId]);
            if (!del.rows.length) return res.status(404).json({ error: "Choice not found" });
            return res.json({ ok: true });
          } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error" });
          }
        }
      );

// ===== GENRES (ADMIN) =====

// GET /api/admin/genres
router.get("/genres", requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const r = await query(
      "SELECT key, label, COALESCE(icon,'') AS icon FROM genres ORDER BY label ASC"
    );
    return res.json({ genres: r.rows });
  } catch (err) {
    console.error("GET /api/admin/genres failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/genres
router.post("/genres", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.body?.key || "").trim();
    const label = String(req.body?.label || "").trim();
    const icon = String(req.body?.icon || "").trim();

    if (!key || !label) {
      return res.status(400).json({ error: "key and label required" });
    }

    await query(
      `INSERT INTO genres (key, label, icon)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET label=EXCLUDED.label, icon=EXCLUDED.icon`,
      [key, label, icon || ""]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/genres failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/genres/:key
router.patch("/genres/:key", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.params.key || "").trim();
    const label = String(req.body?.label || "").trim();
    const icon = String(req.body?.icon || "").trim();

    if (!key) return res.status(400).json({ error: "key required" });
    if (!label) return res.status(400).json({ error: "label required" });

    const r = await query(
      `UPDATE genres
       SET label=$2, icon=$3
       WHERE key=$1
       RETURNING key, label, COALESCE(icon,'') AS icon`,
      [key, label, icon || ""]
    );

    if (!r.rows.length) return res.status(404).json({ error: "Genre not found" });
    return res.json({ genre: r.rows[0] });
  } catch (err) {
    console.error("PATCH /api/admin/genres/:key failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/genres/:key
router.delete(
  "/genres/:key",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const key = String(req.params.key || "").trim();
    if (!key) return res.status(400).json({ error: "key required" });

    try {
      // 🔥 IMPORTANT: delete references FIRST
      // CHANGE table/column names based on Step 1 result
      await query("DELETE FROM story_genres WHERE genre_key = $1", [key]);

      // Now delete the genre itself
      await query("DELETE FROM genres WHERE key = $1", [key]);

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("DELETE /api/admin/genres failed:", err);

      // FK violation (Postgres)
      if (err?.code === "23503") {
        return res.status(409).json({
          error: "Genre is used by stories. Remove it from stories first.",
        });
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  }
);



export default router;