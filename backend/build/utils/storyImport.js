"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importStory = importStory;
const zod_1 = require("zod");
const db_1 = __importDefault(require("../db"));
// Schema definitions for validating story packages
const NodeSchema = zod_1.z.object({
    nodeCode: zod_1.z.string(),
    stepNo: zod_1.z.number().int().min(1).max(10),
    title: zod_1.z.string(),
    content: zod_1.z.string(),
    isStart: zod_1.z.boolean()
});
const ChoiceSchema = zod_1.z.object({
    fromNodeCode: zod_1.z.string(),
    genreKey: zod_1.z.string(),
    toNodeCode: zod_1.z.string()
});
const StorySchema = zod_1.z.object({
    title: zod_1.z.string(),
    summary: zod_1.z.string(),
    coverImageUrl: zod_1.z.string().optional().default('')
});
const VersionSchema = zod_1.z.object({
    versionName: zod_1.z.string(),
    notes: zod_1.z.string().optional().default('')
});
const StoryPackageSchema = zod_1.z.object({
    story: StorySchema,
    version: VersionSchema,
    nodes: zod_1.z.array(NodeSchema),
    choices: zod_1.z.array(ChoiceSchema)
});
// Simple slugify: lowercases and replaces spaces with hyphens
function slugify(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
/**
 * Import a story from a JSON package into the database.  Validates the
 * structure and inserts the story, version, nodes and choices in a
 * transaction.  Returns the id of the created version.
 */
async function importStory(pkg) {
    const parsed = StoryPackageSchema.parse(pkg);
    // Validate exactly one start node
    const starts = parsed.nodes.filter((n) => n.isStart);
    if (starts.length !== 1) {
        throw new Error('Package must have exactly one start node');
    }
    // Build a set of node codes for reference validation
    const codeSet = new Set(parsed.nodes.map((n) => n.nodeCode));
    // Validate choices refer to valid nodes
    for (const choice of parsed.choices) {
        if (!codeSet.has(choice.fromNodeCode) || !codeSet.has(choice.toNodeCode)) {
            throw new Error(`Choice refers to undefined node code: ${choice.fromNodeCode} -> ${choice.toNodeCode}`);
        }
    }
    // Generate slug from title
    const slug = slugify(parsed.story.title);
    // Insert in a transaction
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        // Insert or reuse story
        const storyRes = await client.query('INSERT INTO stories (slug, title, summary, cover_image_url) VALUES ($1, $2, $3, $4) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title RETURNING id', [slug, parsed.story.title, parsed.story.summary, parsed.story.coverImageUrl ?? '']);
        const storyId = storyRes.rows[0].id;
        // Insert version
        const versionRes = await client.query('INSERT INTO story_versions (story_id, version_name, notes, is_published, created_at) VALUES ($1, $2, $3, false, NOW()) RETURNING id', [storyId, parsed.version.versionName, parsed.version.notes || '']);
        const versionId = versionRes.rows[0].id;
        // Insert nodes and map codes to ids
        const nodeIdMap = {};
        for (const node of parsed.nodes) {
            const res = await client.query('INSERT INTO story_nodes (story_version_id, step_no, node_code, title, content, is_start) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [versionId, node.stepNo, node.nodeCode, node.title, node.content, node.isStart]);
            nodeIdMap[node.nodeCode] = res.rows[0].id;
        }
        // Insert choices
        for (const choice of parsed.choices) {
            await client.query('INSERT INTO node_choices (story_version_id, from_node_id, genre_key, to_node_id) VALUES ($1, $2, $3, $4)', [versionId, nodeIdMap[choice.fromNodeCode], choice.genreKey, nodeIdMap[choice.toNodeCode]]);
        }
        await client.query('COMMIT');
        return versionId;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
