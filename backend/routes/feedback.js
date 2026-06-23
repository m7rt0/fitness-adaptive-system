const express = require("express");
const router = express.Router();
const db = require("../db");
const {
    calculateAverageRir,
    generateExerciseAdaptationDecision,
    generateSessionAdaptationDecision
} = require("../logic/adaptiveAlgorithm");

function groupSetsByExercise(sets) {
    const groups = {};

    sets.forEach(set => {
        const exerciseId = Number(set.exercise_id);

        if (!groups[exerciseId]) {
            groups[exerciseId] = [];
        }

        groups[exerciseId].push(set);
    });

    return groups;
}

async function getPreviousExerciseSets(connection, session, exerciseId) {
    const [previousSessions] = await connection.query(
        `SELECT ws.id
         FROM workout_sessions ws
         JOIN set_logs sl ON sl.session_id = ws.id
         WHERE ws.user_id = ?
           AND ws.id <> ?
           AND ws.program_id <=> ?
           AND ws.workout_day_id <=> ?
           AND sl.exercise_id = ?
         ORDER BY ws.workout_date DESC, ws.id DESC
         LIMIT 1`,
        [
            session.user_id,
            session.id,
            session.program_id,
            session.workout_day_id,
            exerciseId
        ]
    );

    if (previousSessions.length === 0) {
        return [];
    }

    const [previousSets] = await connection.query(
        "SELECT * FROM set_logs WHERE session_id = ? AND exercise_id = ? ORDER BY set_number",
        [previousSessions[0].id, exerciseId]
    );

    return previousSets;
}

router.post("/", async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { session_id, fatigue, notes } = req.body;

        if (!session_id || !fatigue) {
            return res.status(400).json({ error: "Липсват данни за обратна връзка" });
        }

        const [sessionRows] = await connection.query(
            "SELECT * FROM workout_sessions WHERE id = ?",
            [session_id]
        );

        if (sessionRows.length === 0) {
            return res.status(404).json({ error: "Тренировката не е намерена" });
        }

        const session = sessionRows[0];

        const [sets] = await connection.query(
            `SELECT 
                sl.*,
                e.name AS exercise_name
             FROM set_logs sl
             JOIN exercises e ON sl.exercise_id = e.id
             WHERE sl.session_id = ?
             ORDER BY e.name, sl.set_number`,
            [session_id]
        );

        if (sets.length === 0) {
            return res.status(400).json({ error: "Няма намерени серии за тази тренировка" });
        }

        let targetMap = {};

        if (session.workout_day_id) {
            const [targets] = await connection.query(
                "SELECT exercise_id, sets, reps_min, reps_max, target_rir FROM workout_exercises WHERE workout_day_id = ?",
                [session.workout_day_id]
            );

            targets.forEach(target => {
                targetMap[Number(target.exercise_id)] = target;
            });
        }

        const groupedSets = groupSetsByExercise(sets);
        const exerciseDecisions = [];

        for (const exerciseIdText of Object.keys(groupedSets)) {
            const exerciseId = Number(exerciseIdText);
            const currentSets = groupedSets[exerciseId];
            const previousSets = await getPreviousExerciseSets(connection, session, exerciseId);
            const target = targetMap[exerciseId] || null;

            const decision = generateExerciseAdaptationDecision(
                currentSets,
                previousSets,
                target,
                Number(fatigue)
            );

            exerciseDecisions.push({
                exercise_id: exerciseId,
                exercise_name: currentSets[0].exercise_name,
                decision_type: decision.decisionType,
                decision_text: decision.decisionText
            });
        }

        const sessionDecision = generateSessionAdaptationDecision(
            exerciseDecisions.map(decision => ({
                decisionType: decision.decision_type,
                decisionText: decision.decision_text
            }))
        );

        await connection.beginTransaction();

        await connection.query(
            "DELETE FROM exercise_adaptation_decisions WHERE session_id = ?",
            [session_id]
        );

        await connection.query(
            "DELETE FROM adaptation_decisions WHERE session_id = ?",
            [session_id]
        );

        await connection.query(
            "DELETE FROM workout_feedback WHERE session_id = ?",
            [session_id]
        );

        await connection.query(
            "INSERT INTO workout_feedback (session_id, difficulty, recovery, fatigue, notes) VALUES (?, ?, ?, ?, ?)",
            [session_id, null, null, fatigue, notes || ""]
        );

        await connection.query(
            "INSERT INTO adaptation_decisions (session_id, decision_type, decision_text) VALUES (?, ?, ?)",
            [session_id, sessionDecision.decisionType, sessionDecision.decisionText]
        );

        for (const decision of exerciseDecisions) {
            await connection.query(
                "INSERT INTO exercise_adaptation_decisions (session_id, exercise_id, decision_type, decision_text) VALUES (?, ?, ?, ?)",
                [
                    session_id,
                    decision.exercise_id,
                    decision.decision_type,
                    decision.decision_text
                ]
            );
        }

        await connection.commit();

        res.json({
            message: "Обратната връзка е записана успешно",
            average_rir: calculateAverageRir(sets),
            decision_type: sessionDecision.decisionType,
            decision_text: sessionDecision.decisionText,
            exercise_decisions: exerciseDecisions
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;