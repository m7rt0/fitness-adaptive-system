const express = require("express");
const router = express.Router();
const db = require("../db");

function getTrainingDays(trainingDays) {
    const daysCount = Number(trainingDays);

    const splits = {
        3: [
            { name: "Горна част", groups: ["Гърди", "Гръб", "Рамо", "Бицепс", "Трицепс"] },
            { name: "Долна част", groups: ["Крака"] },
            { name: "Цяло тяло", groups: ["Гърди", "Гръб", "Крака", "Рамо"] }
        ],
        4: [
            { name: "Горна част 1", groups: ["Гърди", "Гръб", "Рамо", "Бицепс", "Трицепс"] },
            { name: "Долна част 1", groups: ["Крака"] },
            { name: "Горна част 2", groups: ["Гърди", "Гръб", "Рамо", "Бицепс", "Трицепс"] },
            { name: "Долна част 2", groups: ["Крака"] }
        ],
        5: [
            { name: "Push", groups: ["Гърди", "Рамо", "Трицепс"] },
            { name: "Pull", groups: ["Гръб", "Бицепс"] },
            { name: "Legs", groups: ["Крака"] },
            { name: "Upper", groups: ["Гърди", "Гръб", "Рамо", "Бицепс", "Трицепс"] },
            { name: "Lower", groups: ["Крака"] }
        ]
    };

    return splits[daysCount] || splits[3];
}

function getTargets(goal, level) {
    if (goal === "muscle_gain") {
        return {
            repsMin: 6,
            repsMax: 10,
            targetRir: level === "advanced" ? 1 : 2
        };
    }

    if (goal === "maintenance") {
        return {
            repsMin: 6,
            repsMax: 10,
            targetRir: 2
        };
    }

    if (goal === "fat_loss") {
        return {
            repsMin: 10,
            repsMax: level === "advanced" ? 20 : 15,
            targetRir: 4
        };
    }

    return {
        repsMin: 6,
        repsMax: 10,
        targetRir: 2
    };
}

function isBigMuscleGroup(group) {
    return group === "Гърди" || group === "Гръб" || group === "Крака";
}

function getExerciseLimit(goal, level, muscleGroup, isSingleGroupDay) {
    if (isSingleGroupDay) {
        return 2;
    }

    if (level === "beginner") {
        return 1;
    }

    if (goal === "fat_loss") {
        return isBigMuscleGroup(muscleGroup) ? 2 : 1;
    }

    if (goal === "maintenance") {
        return 1;
    }

    return isBigMuscleGroup(muscleGroup) ? 2 : 1;
}

function getSetCount(goal, level, exerciseIndexForMuscle, totalExercisesForMuscle) {
    if (goal === "maintenance") {
        if (totalExercisesForMuscle === 1) return 2;
        return 1;
    }

    if (goal === "fat_loss") {
        if (level === "beginner") return 3;
        return 4;
    }

    if (goal === "muscle_gain") {
        if (totalExercisesForMuscle === 1) {
            if (level === "beginner") return 3;
            return 4;
        }

        if (exerciseIndexForMuscle === 0) {
            if (level === "beginner") return 2;
            return 3;
        }

        return 2;
    }

    return 3;
}

function sortExercises(exercises) {
    return exercises.sort((a, b) => {
        if (a.exercise_type === "Базово" && b.exercise_type !== "Базово") return -1;
        if (a.exercise_type !== "Базово" && b.exercise_type === "Базово") return 1;
        return a.id - b.id;
    });
}

function selectExercisesForDay(allExercises, day, goal, level) {
    const selectedExercises = [];
    const isSingleGroupDay = day.groups.length === 1;

    day.groups.forEach(group => {
        const exercisesForGroup = sortExercises(
            allExercises.filter(exercise => exercise.muscle_group === group)
        );

        const limit = getExerciseLimit(goal, level, group, isSingleGroupDay);
        const limitedExercises = exercisesForGroup.slice(0, limit);

        limitedExercises.forEach((exercise, index) => {
            selectedExercises.push({
                ...exercise,
                exerciseIndexForMuscle: index,
                totalExercisesForMuscle: limitedExercises.length
            });
        });
    });

    return selectedExercises;
}

router.get("/", async (req, res) => {
    try {
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ error: "Липсва потребител." });
        }

        const [programs] = await db.query(
            "SELECT * FROM programs WHERE user_id = ? ORDER BY created_at DESC",
            [userId]
        );

        res.json(programs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/generate", async (req, res) => {
    try {
        const { user_id, goal, level, training_days } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "Липсва потребител." });
        }

        const days = getTrainingDays(training_days);
        const targets = getTargets(goal, level);

        const [programResult] = await db.query(
            "INSERT INTO programs (user_id, goal, level, training_days) VALUES (?, ?, ?, ?)",
            [user_id, goal, level, Number(training_days)]
        );

        const programId = programResult.insertId;

        const [allExercises] = await db.query("SELECT * FROM exercises ORDER BY id");

        for (let i = 0; i < days.length; i++) {
            const [dayResult] = await db.query(
                "INSERT INTO workout_days (program_id, day_number, day_name) VALUES (?, ?, ?)",
                [programId, i + 1, days[i].name]
            );

            const workoutDayId = dayResult.insertId;

            const selectedExercises = selectExercisesForDay(
                allExercises,
                days[i],
                goal,
                level
            );

            for (let j = 0; j < selectedExercises.length; j++) {
                const exercise = selectedExercises[j];

                const sets = getSetCount(
                    goal,
                    level,
                    exercise.exerciseIndexForMuscle,
                    exercise.totalExercisesForMuscle
                );

                await db.query(
                    "INSERT INTO workout_exercises (workout_day_id, exercise_id, sets, reps_min, reps_max, target_rir, exercise_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                        workoutDayId,
                        exercise.id,
                        sets,
                        targets.repsMin,
                        targets.repsMax,
                        targets.targetRir,
                        j + 1
                    ]
                );
            }
        }

        res.json({
            message: "Програмата е генерирана успешно",
            program_id: programId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const programId = req.params.id;

        const [programRows] = await db.query(
            "SELECT * FROM programs WHERE id = ?",
            [programId]
        );

        if (programRows.length === 0) {
            return res.status(404).json({ error: "Програмата не е намерена" });
        }

        const [days] = await db.query(
            "SELECT * FROM workout_days WHERE program_id = ? ORDER BY day_number",
            [programId]
        );

        for (const day of days) {
            const [exercises] = await db.query(
                `SELECT 
                    we.id AS workout_exercise_id,
                    we.exercise_id,
                    e.name,
                    e.muscle_group,
                    e.exercise_type,
                    we.sets,
                    we.reps_min,
                    we.reps_max,
                    we.target_rir,
                    we.exercise_order
                 FROM workout_exercises we
                 JOIN exercises e ON we.exercise_id = e.id
                 WHERE we.workout_day_id = ?
                 ORDER BY we.exercise_order`,
                [day.id]
            );

            day.exercises = exercises;
        }

        res.json({
            program: programRows[0],
            days: days
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;