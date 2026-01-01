import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/requireAuth";
import { query } from "../../db";

/**
 * Coins Admin Controller
 * Handles coin management and operations
 */

// Get coin summary for all users
export async function getCoinSummary(req: AuthRequest, res: Response) {
  try {
    const summaryRes = await query(
      `SELECT 
         COUNT(DISTINCT id) as total_users,
         SUM(coins) as total_coins,
         AVG(coins) as avg_coins,
         MAX(coins) as max_coins,
         MIN(coins) as min_coins
       FROM users`
    );

    const summary = summaryRes.rows[0];
    res.json({
      totalUsers: parseInt(summary.total_users) || 0,
      totalCoins: parseInt(summary.total_coins) || 0,
      avgCoins: parseFloat(summary.avg_coins) || 0,
      maxCoins: parseInt(summary.max_coins) || 0,
      minCoins: parseInt(summary.min_coins) || 0,
    });
  } catch (err) {
    console.error("Get coin summary failed:", err);
    res.status(500).json({ error: "Unable to fetch coin summary" });
  }
}

// Get coin history
export async function getCoinHistory(req: AuthRequest, res: Response) {
  try {
    const historyRes = await query(
      `SELECT u.id, u.email, u.coins, u.created_at
       FROM users u
       ORDER BY u.coins DESC
       LIMIT 50`
    );

    const history = historyRes.rows.map(h => ({
      userId: h.id,
      email: h.email,
      coins: h.coins || 0,
      createdAt: h.created_at,
    }));

    res.json({ history });
  } catch (err) {
    console.error("Get coin history failed:", err);
    res.status(500).json({ error: "Unable to fetch coin history" });
  }
}

// Adjust user coins
export async function adjustUserCoins(req: AuthRequest, res: Response) {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || amount === undefined) {
      return res.status(400).json({ error: "userId and amount are required" });
    }

    const result = await query(
      `UPDATE users SET coins = coins + $1 WHERE id = $2 RETURNING coins`,
      [amount, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      userId,
      newBalance: result.rows[0].coins,
    });
  } catch (err) {
    console.error("Adjust user coins failed:", err);
    res.status(500).json({ error: "Unable to adjust coins" });
  }
}

// Reset user coins
export async function resetUserCoins(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const result = await query(
      `UPDATE users SET coins = 0 WHERE id = $1 RETURNING coins`,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, userId, newBalance: 0 });
  } catch (err) {
    console.error("Reset user coins failed:", err);
    res.status(500).json({ error: "Unable to reset coins" });
  }
}

// Get coin expiry details
export async function getCoinExpiry(req: AuthRequest, res: Response) {
  try {
    res.json({ message: "Coin expiry feature coming soon", expiries: [] });
  } catch (err) {
    console.error("Get coin expiry failed:", err);
    res.status(500).json({ error: "Unable to fetch coin expiry" });
  }
}
