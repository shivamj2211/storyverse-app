"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTransactions = getAllTransactions;
exports.getTransactionsByUser = getTransactionsByUser;
exports.getTransactionsByDateRange = getTransactionsByDateRange;
exports.exportTransactions = exportTransactions;
exports.getTransactionStats = getTransactionStats;
const db_1 = require("../../db");
/**
 * Transactions Admin Controller
 * Handles transaction tracking and reporting
 */
// Get all transactions
async function getAllTransactions(req, res) {
    try {
        const transRes = await (0, db_1.query)(`SELECT sr.id, sr.user_id, sr.story_id, s.title, sr.rating, sr.created_at
       FROM story_ratings sr
       JOIN stories s ON s.id = sr.story_id
       ORDER BY sr.created_at DESC
       LIMIT 100`);
        const transactions = transRes.rows.map(t => ({
            id: t.id,
            userId: t.user_id,
            storyId: t.story_id,
            storyTitle: t.title,
            rating: t.rating,
            createdAt: t.created_at,
        }));
        res.json({ transactions });
    }
    catch (err) {
        console.error("Get all transactions failed:", err);
        res.status(500).json({ error: "Unable to fetch transactions" });
    }
}
// Get transactions by user
async function getTransactionsByUser(req, res) {
    try {
        const { userId } = req.params;
        const transRes = await (0, db_1.query)(`SELECT sr.id, sr.user_id, sr.story_id, s.title, sr.rating, sr.created_at
       FROM story_ratings sr
       JOIN stories s ON s.id = sr.story_id
       WHERE sr.user_id = $1
       ORDER BY sr.created_at DESC`, [userId]);
        const transactions = transRes.rows.map(t => ({
            id: t.id,
            userId: t.user_id,
            storyId: t.story_id,
            storyTitle: t.title,
            rating: t.rating,
            createdAt: t.created_at,
        }));
        res.json({ transactions });
    }
    catch (err) {
        console.error("Get transactions by user failed:", err);
        res.status(500).json({ error: "Unable to fetch user transactions" });
    }
}
// Get transactions by date range
async function getTransactionsByDateRange(req, res) {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }
        const transRes = await (0, db_1.query)(`SELECT sr.id, sr.user_id, sr.story_id, s.title, sr.rating, sr.created_at
       FROM story_ratings sr
       JOIN stories s ON s.id = sr.story_id
       WHERE sr.created_at BETWEEN $1 AND $2
       ORDER BY sr.created_at DESC`, [startDate, endDate]);
        const transactions = transRes.rows.map(t => ({
            id: t.id,
            userId: t.user_id,
            storyId: t.story_id,
            storyTitle: t.title,
            rating: t.rating,
            createdAt: t.created_at,
        }));
        res.json({ transactions });
    }
    catch (err) {
        console.error("Get transactions by date range failed:", err);
        res.status(500).json({ error: "Unable to fetch transactions" });
    }
}
// Export transactions
async function exportTransactions(req, res) {
    try {
        const transRes = await (0, db_1.query)(`SELECT sr.id, sr.user_id, u.email, sr.story_id, s.title, sr.rating, sr.created_at
       FROM story_ratings sr
       JOIN stories s ON s.id = sr.story_id
       JOIN users u ON u.id = sr.user_id
       ORDER BY sr.created_at DESC`);
        const csv = [
            ["ID", "User Email", "Story", "Rating", "Date"].join(","),
            ...transRes.rows.map(t => [t.id, t.email, t.title, t.rating, t.created_at].join(",")),
        ].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
        res.send(csv);
    }
    catch (err) {
        console.error("Export transactions failed:", err);
        res.status(500).json({ error: "Unable to export transactions" });
    }
}
// Get transaction statistics
async function getTransactionStats(req, res) {
    try {
        // TODO: Implement get transaction statistics logic
        res.json({ stats: {} });
    }
    catch (err) {
        console.error("Get transaction stats failed:", err);
        res.status(500).json({ error: "Unable to fetch transaction stats" });
    }
}
