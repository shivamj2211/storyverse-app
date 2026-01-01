"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.toggleUserBan = toggleUserBan;
const db_1 = require("../../db");
/**
 * Users Admin Controller
 * Handles user management operations (view, update, ban, etc.)
 */
// Get all users
async function getAllUsers(req, res) {
    try {
        const usersRes = await (0, db_1.query)(`SELECT id, email, phone, full_name, is_admin, is_premium, coins, created_at
       FROM users
       ORDER BY created_at DESC`);
        const users = usersRes.rows.map(u => ({
            id: u.id,
            email: u.email,
            phone: u.phone,
            fullName: u.full_name,
            isAdmin: u.is_admin,
            isPremium: u.is_premium,
            coins: u.coins || 0,
            createdAt: u.created_at,
        }));
        res.json({ users });
    }
    catch (err) {
        console.error("Get all users failed:", err);
        res.status(500).json({ error: "Unable to fetch users" });
    }
}
// Get user by ID
async function getUserById(req, res) {
    try {
        const { id } = req.params;
        const userRes = await (0, db_1.query)(`SELECT id, email, phone, full_name, is_admin, is_premium, coins, created_at
       FROM users WHERE id = $1`, [id]);
        if (!userRes.rows.length) {
            return res.status(404).json({ error: "User not found" });
        }
        const u = userRes.rows[0];
        res.json({
            id: u.id,
            email: u.email,
            phone: u.phone,
            fullName: u.full_name,
            isAdmin: u.is_admin,
            isPremium: u.is_premium,
            coins: u.coins || 0,
            createdAt: u.created_at,
        });
    }
    catch (err) {
        console.error("Get user by ID failed:", err);
        res.status(500).json({ error: "Unable to fetch user" });
    }
}
// Update user
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { isAdmin, isPremium, coins } = req.body;
        const result = await (0, db_1.query)(`UPDATE users 
       SET is_admin = COALESCE($1, is_admin),
           is_premium = COALESCE($2, is_premium),
           coins = COALESCE($3, coins)
       WHERE id = $4
       RETURNING id, email, phone, full_name, is_admin, is_premium, coins`, [isAdmin !== undefined ? isAdmin : null, isPremium !== undefined ? isPremium : null, coins !== undefined ? coins : null, id]);
        if (!result.rows.length) {
            return res.status(404).json({ error: "User not found" });
        }
        const u = result.rows[0];
        res.json({
            id: u.id,
            email: u.email,
            phone: u.phone,
            fullName: u.full_name,
            isAdmin: u.is_admin,
            isPremium: u.is_premium,
            coins: u.coins || 0,
        });
    }
    catch (err) {
        console.error("Update user failed:", err);
        res.status(500).json({ error: "Unable to update user" });
    }
}
// Delete user
async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const result = await (0, db_1.query)(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
        if (!result.rows.length) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ success: true, id });
    }
    catch (err) {
        console.error("Delete user failed:", err);
        res.status(500).json({ error: "Unable to delete user" });
    }
}
// Ban/Unban user
async function toggleUserBan(req, res) {
    try {
        // TODO: Implement ban/unban user logic
        res.json({ success: true });
    }
    catch (err) {
        console.error("Toggle user ban failed:", err);
        res.status(500).json({ error: "Unable to toggle user ban" });
    }
}
