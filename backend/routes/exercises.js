const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
    try {
        const [exercises] = await db.query("SELECT * FROM exercises ORDER BY muscle_group, name");
        res.json(exercises);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;