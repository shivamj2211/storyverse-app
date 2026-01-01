"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    try {
        const r = await (0, db_1.query)(`SELECT key, label
       FROM genres
       ORDER BY sort_order ASC, label ASC`);
        return res.json({ genres: r.rows });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
