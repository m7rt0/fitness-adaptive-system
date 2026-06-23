let setLogs = [];
let currentSessionId = null;
let currentProgramDetails = null;
let selectedProgram = null;
let selectedDay = null;

function translateGoal(goal) {
    if (goal === "muscle_gain") return "Покачване";
    if (goal === "fat_loss") return "Отслабване";
    if (goal === "maintenance") return "Поддържане";
    return goal;
}

function translateLevel(level) {
    if (level === "beginner") return "Начинаещ";
    if (level === "intermediate") return "Средно напреднал";
    if (level === "advanced") return "Напреднал";
    return level;
}

function formatSeriesCount(count) {
    if (Number(count) === 1) {
        return "1 серия";
    }

    return `${count} серии`;
}

function cleanDecimalInput(input) {
    input.value = input.value
        .replace(",", ".")
        .replace(/[^0-9.]/g, "");

    const parts = input.value.split(".");
    if (parts.length > 2) {
        input.value = parts[0] + "." + parts.slice(1).join("");
    }
}

function cleanIntegerInput(input) {
    input.value = input.value.replace(/[^0-9]/g, "");
}

async function loadPrograms() {
    const programSelect = document.getElementById("programSelect");
    const userId = getLoggedUserId();

    if (!userId) {
        return;
    }

    try {
        const response = await fetch(`/api/programs?user_id=${userId}`);
        const programs = await response.json();

        programSelect.innerHTML = "";

        if (programs.length === 0) {
            programSelect.innerHTML = "<option>Няма генерирани програми</option>";
            document.getElementById("workoutExerciseList").innerHTML =
                "<p>Първо генерирай програма от страницата за генериране.</p>";
            return;
        }

        programs.forEach((program, index) => {
            const option = document.createElement("option");
            const programNumber = programs.length - index;

            option.value = program.id;
            option.textContent =
                `Програма ${programNumber} - ${translateGoal(program.goal)} - ${translateLevel(program.level)} - ${program.training_days} дни`;

            programSelect.appendChild(option);
        });

        await loadProgramDetails(programs[0].id);
    } catch (error) {
        programSelect.innerHTML = "<option>Грешка при зареждане</option>";
    }
}

async function loadProgramDetails(programId) {
    try {
        const response = await fetch(`/api/programs/${programId}`);
        const data = await response.json();

        currentProgramDetails = data;
        selectedProgram = data.program;
        setLogs = [];
        currentSessionId = null;

        renderDaySelect(data.days);
    } catch (error) {
        document.getElementById("workoutExerciseList").innerHTML =
            "<p>Грешка при зареждане на програмата.</p>";
    }
}

function renderDaySelect(days) {
    const daySelect = document.getElementById("daySelect");

    daySelect.innerHTML = "";

    days.forEach(day => {
        const option = document.createElement("option");
        option.value = day.id;
        option.textContent = `Ден ${day.day_number}: ${day.day_name}`;
        daySelect.appendChild(option);
    });

    selectedDay = days[0];
    renderWorkoutDay();
}

function renderWorkoutDay() {
    const workoutDayInfo = document.getElementById("workoutDayInfo");
    const workoutExerciseList = document.getElementById("workoutExerciseList");

    workoutExerciseList.innerHTML = "";

    if (!selectedDay) {
        workoutDayInfo.innerHTML = "";
        workoutExerciseList.innerHTML = "<p>Няма избран тренировъчен ден.</p>";
        return;
    }

    workoutDayInfo.innerHTML = `
        <div class="program-day">
            <h3>Ден ${selectedDay.day_number}: ${selectedDay.day_name}</h3>
            <p>Цел: ${translateGoal(selectedProgram.goal)}</p>
            <p>Ниво: ${translateLevel(selectedProgram.level)}</p>
        </div>
    `;

    selectedDay.exercises.forEach(exercise => {
        const card = document.createElement("div");
        card.className = "program-day";

        const exerciseSets = setLogs.filter(set => set.exerciseId === exercise.exercise_id);

        let setsHtml = "<p>Няма въведени серии за това упражнение.</p>";

        if (exerciseSets.length > 0) {
            setsHtml = "";

            exerciseSets.forEach((set, index) => {
                setsHtml += `
                    <div class="program-exercise">
                        <strong>Серия ${index + 1}</strong> -
                        ${set.weight} кг,
                        ${set.reps} повторения,
                        RIR ${set.rir}
                    </div>
                `;
            });
        }

        card.innerHTML = `
            <h3>${exercise.name}</h3>
            <p>Мускулна група: ${exercise.muscle_group}</p>
            <p>План: ${formatSeriesCount(exercise.sets)}, ${exercise.reps_min}-${exercise.reps_max} повторения, RIR ${exercise.target_rir}</p>

            <div class="workout-form">
                <div class="form-field field-number">
                    <label>Килограми:</label>
                    <input type="text" id="weight-${exercise.exercise_id}" placeholder="кг" inputmode="decimal">
                </div>

                <div class="form-field field-number">
                    <label>Повторения:</label>
                    <input type="text" id="reps-${exercise.exercise_id}" placeholder="бр." inputmode="numeric">
                </div>

                <div class="form-field field-rir">
                    <label>RIR:</label>
                    <select id="rir-${exercise.exercise_id}">
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2" selected>2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                    </select>
                </div>

                <div class="form-field field-button">
                    <label>&nbsp;</label>
                    <button type="button" data-exercise-id="${exercise.exercise_id}">Добави серия</button>
                </div>
            </div>

            <h4>Въведени серии</h4>
            ${setsHtml}
        `;

        workoutExerciseList.appendChild(card);

        const weightInput = document.getElementById(`weight-${exercise.exercise_id}`);
        const repsInput = document.getElementById(`reps-${exercise.exercise_id}`);
        const addSetButton = card.querySelector("button");

        weightInput.addEventListener("input", () => cleanDecimalInput(weightInput));
        repsInput.addEventListener("input", () => cleanIntegerInput(repsInput));

        addSetButton.addEventListener("click", () => {
            addSetToExercise(exercise);
        });
    });
}

function addSetToExercise(exercise) {
    const weightInput = document.getElementById(`weight-${exercise.exercise_id}`);
    const repsInput = document.getElementById(`reps-${exercise.exercise_id}`);
    const rirSelect = document.getElementById(`rir-${exercise.exercise_id}`);

    const weight = Number(weightInput.value);
    const reps = Number(repsInput.value);
    const rir = Number(rirSelect.value);

    if (!weight || weight < 0.5 || weight > 500) {
        alert("Килограмите трябва да са между 0.5 и 500.");
        return;
    }

    if (!reps || reps < 1 || reps > 100) {
        alert("Повторенията трябва да са между 1 и 100.");
        return;
    }

    setLogs.push({
        exerciseId: Number(exercise.exercise_id),
        exerciseName: exercise.name,
        weight,
        reps,
        rir
    });

    weightInput.value = "";
    repsInput.value = "";

    renderWorkoutDay();
}

function renderAdaptationResult(result) {
    let exerciseHtml = "";

    if (result.exercise_decisions && result.exercise_decisions.length > 0) {
        result.exercise_decisions.forEach(decision => {
            exerciseHtml += `
                <div class="program-exercise">
                    <h4>${decision.exercise_name}</h4>
                    <p><strong>${decision.decision_type}</strong></p>
                    <p>${decision.decision_text}</p>
                </div>
            `;
        });
    }

    document.getElementById("adaptationResult").innerHTML = `
        <div class="program-day">
            <h3>Препоръка за следващата тренировка</h3>
            <p>${result.decision_text}</p>

            <h3>Препоръки по упражнения</h3>
            ${exerciseHtml}
        </div>
    `;
}

document.getElementById("programSelect").addEventListener("change", async () => {
    const programId = document.getElementById("programSelect").value;
    await loadProgramDetails(programId);
});

document.getElementById("daySelect").addEventListener("change", () => {
    const dayId = Number(document.getElementById("daySelect").value);

    selectedDay = currentProgramDetails.days.find(day => day.id === dayId);
    setLogs = [];
    currentSessionId = null;

    document.getElementById("workoutMessage").textContent = "";
    document.getElementById("feedbackSection").style.display = "none";
    document.getElementById("adaptationResult").innerHTML = "";

    renderWorkoutDay();
});

document.getElementById("finishWorkoutBtn").addEventListener("click", async () => {
    const userId = getLoggedUserId();

    if (!userId) {
        return;
    }

    if (!selectedProgram || !selectedDay) {
        alert("Избери програма и тренировъчен ден.");
        return;
    }

    if (setLogs.length === 0) {
        alert("Няма въведени серии.");
        return;
    }

    const response = await fetch("/api/workouts/finish", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: userId,
            program_id: selectedProgram.id,
            workout_day_id: selectedDay.id,
            readiness: null,
            sets: setLogs
        })
    });

    const result = await response.json();

    if (!response.ok) {
        alert(result.error);
        return;
    }

    currentSessionId = result.session_id;

    document.getElementById("workoutMessage").textContent = result.message;

    setLogs = [];
    renderWorkoutDay();

    document.getElementById("feedbackSection").style.display = "block";
});

document.getElementById("sendFeedbackBtn").addEventListener("click", async () => {
    if (!currentSessionId) {
        alert("Първо приключи тренировка.");
        return;
    }

    const fatigue = Number(document.getElementById("fatigue").value);
    const notes = document.getElementById("notes").value;

    const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            session_id: currentSessionId,
            fatigue,
            notes
        })
    });

    const result = await response.json();

    if (!response.ok) {
        alert(result.error);
        return;
    }

    renderAdaptationResult(result);
});

loadPrograms();