function formatSeriesCount(count) {
    if (Number(count) === 1) {
        return "1 серия";
    }

    return `${count} серии`;
}

async function loadExercises() {
    const exerciseList = document.getElementById("exerciseList");

    try {
        const response = await fetch("/api/exercises");
        const exercises = await response.json();

        exerciseList.innerHTML = "";

        exercises.forEach(exercise => {
            const card = document.createElement("div");
            card.className = "exercise-card";

            card.innerHTML = `
                <h3>${exercise.name}</h3>
                <p>Мускулна група: ${exercise.muscle_group}</p>
                <p>Тип: ${exercise.exercise_type}</p>
            `;

            exerciseList.appendChild(card);
        });
    } catch (error) {
        exerciseList.innerHTML = "<p>Грешка при зареждане на упражненията.</p>";
    }
}

async function loadGeneratedProgram(programId) {
    const generatedProgram = document.getElementById("generatedProgram");

    try {
        const response = await fetch(`/api/programs/${programId}`);
        const data = await response.json();

        generatedProgram.innerHTML = "";

        data.days.forEach(day => {
            const dayCard = document.createElement("div");
            dayCard.className = "program-day";

            let exercisesHtml = "";

            day.exercises.forEach(exercise => {
                exercisesHtml += `
                    <div class="program-exercise">
                        <strong>${exercise.name}</strong>
                        <span>${formatSeriesCount(exercise.sets)}, ${exercise.reps_min}-${exercise.reps_max} повторения, RIR ${exercise.target_rir}</span>
                    </div>
                `;
            });

            dayCard.innerHTML = `
                <h3>Ден ${day.day_number}: ${day.day_name}</h3>
                <div>${exercisesHtml}</div>
            `;

            generatedProgram.appendChild(dayCard);
        });
    } catch (error) {
        generatedProgram.innerHTML = "<p>Грешка при зареждане на програмата.</p>";
    }
}

document.getElementById("generateBtn").addEventListener("click", async () => {
    const userId = getLoggedUserId();

    if (!userId) {
        return;
    }

    const goal = document.getElementById("goal").value;
    const level = document.getElementById("level").value;
    const training_days = Number(document.getElementById("days").value);

    const response = await fetch("/api/programs/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: userId,
            goal,
            level,
            training_days
        })
    });

    const result = await response.json();

    if (!response.ok) {
        alert(result.error);
        return;
    }

    await loadGeneratedProgram(result.program_id);
});

loadExercises();