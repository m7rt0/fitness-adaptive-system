function translateGoal(goal) {
    if (goal === "muscle_gain") return "Покачване";
    if (goal === "fat_loss") return "Отслабване";
    if (goal === "maintenance") return "Поддържане";
    return goal || "няма";
}

function translateLevel(level) {
    if (level === "beginner") return "Начинаещ";
    if (level === "intermediate") return "Средно напреднал";
    if (level === "advanced") return "Напреднал";
    return level || "няма";
}

function groupSetsByExercise(sets) {
    const grouped = {};

    sets.forEach(set => {
        const exerciseId = Number(set.exercise_id);

        if (!grouped[exerciseId]) {
            grouped[exerciseId] = {
                exerciseName: set.exercise_name,
                sets: []
            };
        }

        grouped[exerciseId].sets.push(set);
    });

    return grouped;
}

function mapAdaptationsByExercise(adaptations) {
    const mapped = {};

    adaptations.forEach(adaptation => {
        mapped[Number(adaptation.exercise_id)] = adaptation;
    });

    return mapped;
}

async function loadHistory() {
    const historyList = document.getElementById("historyList");
    const userId = getLoggedUserId();

    if (!userId) {
        return;
    }

    try {
        const response = await fetch(`/api/workouts/history?user_id=${userId}`);
        const sessions = await response.json();

        historyList.innerHTML = "";

        if (sessions.length === 0) {
            historyList.innerHTML = "<p>Няма записани тренировки за този потребител.</p>";
            return;
        }

        sessions.forEach((session, index) => {
            const card = document.createElement("div");
            card.className = "program-day";

            const workoutNumber = sessions.length - index;
            const groupedSets = groupSetsByExercise(session.sets);
            const adaptationsByExercise = mapAdaptationsByExercise(session.exercise_adaptations || []);

            let programHtml = "<p><strong>Програма:</strong> няма данни</p>";

            if (session.program_id) {
                programHtml = `
                    <p><strong>Програма:</strong> ${translateGoal(session.goal)} - ${translateLevel(session.level)} - ${session.training_days} дни</p>
                    <p><strong>Тренировъчен ден:</strong> Ден ${session.day_number}: ${session.day_name}</p>
                `;
            }

            let setsHtml = "";

            Object.keys(groupedSets).forEach(exerciseId => {
                const exercise = groupedSets[exerciseId];
                const adaptation = adaptationsByExercise[Number(exerciseId)];

                let exerciseSetsHtml = "";

                exercise.sets.forEach(set => {
                    exerciseSetsHtml += `
                        <div class="program-exercise">
                            <strong>Серия ${set.set_number}</strong> -
                            ${set.weight} кг,
                            ${set.reps} повторения,
                            RIR ${set.rir}
                        </div>
                    `;
                });

                let adaptationHtml = "";

                if (adaptation) {
                    adaptationHtml = `
                        <div class="program-exercise">
                            <p><strong>Препоръка:</strong> ${adaptation.decision_type}</p>
                            <p>${adaptation.decision_text}</p>
                        </div>
                    `;
                }

                setsHtml += `
                    <div class="exercise-card">
                        <h3>${exercise.exerciseName}</h3>
                        ${exerciseSetsHtml}
                        ${adaptationHtml}
                    </div>
                `;
            });

            let feedbackHtml = "<p><strong>Обратна връзка:</strong> няма</p>";

            if (session.feedback) {
                feedbackHtml = `
                    <p><strong>Умора:</strong> ${session.feedback.fatigue}</p>
                    <p><strong>Бележки:</strong> ${session.feedback.notes || "няма"}</p>
                `;
            }

            let adaptationHtml = "<p><strong>Обща препоръка:</strong> няма</p>";

            if (session.adaptation) {
                adaptationHtml = `
                    <p><strong>${session.adaptation.decision_type}</strong></p>
                    <p>${session.adaptation.decision_text}</p>
                `;
            }

            card.innerHTML = `
                <h3>Тренировка ${workoutNumber}</h3>
                <p><strong>Дата:</strong> ${new Date(session.workout_date).toLocaleString("bg-BG")}</p>
                ${programHtml}

                <h4>Упражнения и серии</h4>
                ${setsHtml}

                <h4>Обратна връзка</h4>
                ${feedbackHtml}

                <h4>Обща адаптация</h4>
                ${adaptationHtml}
            `;

            historyList.appendChild(card);
        });
    } catch (error) {
        historyList.innerHTML = "<p>Грешка при зареждане на историята.</p>";
    }
}

loadHistory();