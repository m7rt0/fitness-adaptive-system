const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/finish", async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { user_id, program_id, workout_day_id, readiness, sets } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "Липсва потребител." });
        }

        if (!sets || sets.length === 0) {
            return res.status(400).json({ error: "Няма въведени серии" });
        }

        await connection.beginTransaction();

        const [sessionResult] = await connection.query(
            "INSERT INTO workout_sessions (user_id, program_id, workout_day_id, readiness, status) VALUES (?, ?, ?, ?, ?)",
            [
                user_id,
                program_id || null,
                workout_day_id || null,
                readiness || null,
                "completed"
            ]
        );

        const sessionId = sessionResult.insertId;
        const exerciseSetNumbers = {};

        for (let i = 0; i < sets.length; i++) {
            const exerciseId = Number(sets[i].exerciseId);

            if (!exerciseSetNumbers[exerciseId]) {
                exerciseSetNumbers[exerciseId] = 1;
            } else {
                exerciseSetNumbers[exerciseId]++;
            }

            await connection.query(
                "INSERT INTO set_logs (session_id, exercise_id, set_number, weight, reps, rir) VALUES (?, ?, ?, ?, ?, ?)",
                [
                    sessionId,
                    exerciseId,
                    exerciseSetNumbers[exerciseId],
                    sets[i].weight,
                    sets[i].reps,
                    sets[i].rir
                ]
            );
        }

        await connection.commit();

        res.json({
            message: "Тренировката е записана успешно",
            session_id: sessionId
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.get("/history", async (req, res) => {
    try {
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ error: "Липсва потребител." });
        }

        const [sessions] = await db.query(
            `SELECT 
                ws.*,
                p.goal,
                p.level,
                p.training_days,
                wd.day_number,
                wd.day_name
             FROM workout_sessions ws
             LEFT JOIN programs p ON ws.program_id = p.id
             LEFT JOIN workout_days wd ON ws.workout_day_id = wd.id
             WHERE ws.user_id = ?
             ORDER BY ws.workout_date DESC`,
            [userId]
        );

        for (const session of sessions) {
            const [sets] = await db.query(
                `SELECT 
                    sl.set_number,
                    sl.weight,
                    sl.reps,
                    sl.rir,
                    sl.exercise_id,
                    e.name AS exercise_name
                 FROM set_logs sl
                 JOIN exercises e ON sl.exercise_id = e.id
                 WHERE sl.session_id = ?
                 ORDER BY e.name, sl.set_number`,
                [session.id]
            );

            const [feedback] = await db.query(
                "SELECT * FROM workout_feedback WHERE session_id = ? ORDER BY id DESC LIMIT 1",
                [session.id]
            );

            const [decision] = await db.query(
                "SELECT * FROM adaptation_decisions WHERE session_id = ? ORDER BY id DESC LIMIT 1",
                [session.id]
            );

            const [exerciseAdaptations] = await db.query(
                `SELECT 
                    ead.exercise_id,
                    e.name AS exercise_name,
                    ead.decision_type,
                    ead.decision_text
                 FROM exercise_adaptation_decisions ead
                 JOIN exercises e ON ead.exercise_id = e.id
                 WHERE ead.session_id = ?
                 ORDER BY e.name`,
                [session.id]
            );

            session.sets = sets;
            session.feedback = feedback[0] || null;
            session.adaptation = decision[0] || null;
            session.exercise_adaptations = exerciseAdaptations;
        }

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;