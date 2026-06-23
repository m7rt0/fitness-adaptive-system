const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");
const exercisesRoutes = require("./routes/exercises");
const programsRoutes = require("./routes/programs");
const workoutsRoutes = require("./routes/workouts");
const feedbackRoutes = require("./routes/feedback");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.use(express.static(path.join(__dirname, "../frontend"), {
    index: false
}));

app.use("/api/auth", authRoutes);
app.use("/api/exercises", exercisesRoutes);
app.use("/api/programs", programsRoutes);
app.use("/api/workouts", workoutsRoutes);
app.use("/api/feedback", feedbackRoutes);

app.get("/api/test", (req, res) => {
    res.json({ message: "Backend works" });
});

app.get("/api/db-test", async (req, res) => {
    try {
        const [users] = await db.query("SELECT * FROM users");
        const [exercises] = await db.query("SELECT * FROM exercises");

        res.json({
            users: users,
            exercises_count: exercises.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});