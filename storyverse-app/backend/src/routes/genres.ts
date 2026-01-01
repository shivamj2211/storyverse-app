import { Router, Response } from "express";
import { query } from "../db";

const router = Router();

router.get("/", async (_req, res: Response) => {
  try {
    const r = await query(
  `SELECT key, label, COALESCE(icon,'') AS icon
   FROM genres
   ORDER BY label ASC`
);
return res.json({ genres: r.rows });

  } catch (err) {
    console.error("GET /api/genres failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
