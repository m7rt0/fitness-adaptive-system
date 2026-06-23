function calculateAverageRir(sets) {
    let total = 0;

    sets.forEach(set => {
        total += Number(set.rir);
    });

    return total / sets.length;
}

function calculateAverageReps(sets) {
    let total = 0;

    sets.forEach(set => {
        total += Number(set.reps);
    });

    return total / sets.length;
}

function calculateAverageWeight(sets) {
    let total = 0;

    sets.forEach(set => {
        total += Number(set.weight);
    });

    return total / sets.length;
}

function calculatePerformanceScore(sets) {
    let total = 0;

    sets.forEach(set => {
        total += Number(set.weight) * (Number(set.reps) + Number(set.rir));
    });

    return total / sets.length;
}

function getMaxReps(sets) {
    let max = 0;

    sets.forEach(set => {
        if (Number(set.reps) > max) {
            max = Number(set.reps);
        }
    });

    return max;
}

function generateExerciseAdaptationDecision(currentSets, previousSets, target, fatigue) {
    const repsMin = target && target.reps_min ? Number(target.reps_min) : 6;
    const repsMax = target && target.reps_max ? Number(target.reps_max) : 10;

    const currentScore = calculatePerformanceScore(currentSets);
    const currentAverageReps = calculateAverageReps(currentSets);
    const currentAverageRir = calculateAverageRir(currentSets);
    const currentAverageWeight = calculateAverageWeight(currentSets);
    const currentMaxReps = getMaxReps(currentSets);

    if (!previousSets || previousSets.length === 0) {
        return {
            decisionType: "Първа тренировка",
            decisionText: "Тази тренировка ще се използва като начална база. Следващия път системата ще сравни представянето ти със записаните килограми, повторения и RIR."
        };
    }

    const previousScore = calculatePerformanceScore(previousSets);
    const previousAverageReps = calculateAverageReps(previousSets);
    const previousAverageRir = calculateAverageRir(previousSets);
    const previousAverageWeight = calculateAverageWeight(previousSets);
    const previousMaxReps = getMaxReps(previousSets);

    const scoreChange = previousScore > 0 ? (currentScore - previousScore) / previousScore : 0;

    const weightIncreased = currentAverageWeight > previousAverageWeight;
    const weightIsSameOrHigher = currentAverageWeight >= previousAverageWeight;
    const repsAreBetter = currentAverageReps > previousAverageReps;
    const rirIsNotWorse = currentAverageRir >= previousAverageRir - 1;

    const previousWasAboveRange = previousMaxReps > repsMax;
    const currentIsBackInRange = currentAverageReps >= repsMin && currentAverageReps <= repsMax;

    const successfulWeightIncrease =
        previousWasAboveRange &&
        weightIncreased &&
        currentIsBackInRange;

    const hasProgress =
        scoreChange >= 0.03 ||
        (weightIsSameOrHigher && repsAreBetter && rirIsNotWorse) ||
        successfulWeightIncrease;

    const isStable =
        scoreChange > -0.03 &&
        scoreChange < 0.03;

    const hasSlightRegression =
        scoreChange <= -0.03 &&
        scoreChange > -0.10;

    const hasClearRegression =
        scoreChange <= -0.10 ||
        (currentAverageReps < repsMin && currentAverageRir <= 1);

    if (successfulWeightIncrease && fatigue >= 4) {
        return {
            decisionType: "Висока умора, но добро представяне",
            decisionText: "Качването на тежестта е успешно, но умората е висока. Не намалявай килограмите. По-добре запази новата тежест и намали 1 серия от най-натоварващото упражнение."
        };
    }

    if (successfulWeightIncrease) {
        return {
            decisionType: "Поддържане",
            decisionText: "Качването на тежестта е успешно. Следващия път запази новата тежест и опитай постепенно да върнеш повторенията към горната граница на диапазона."
        };
    }

    if (currentMaxReps > repsMax && fatigue <= 3) {
        return {
            decisionType: "Увеличи тежестта",
            decisionText: "Вече минаваш горната граница на повторенията. Следващия път увеличи тежестта с малка стъпка и започни отново в по-ниската част на диапазона."
        };
    }

    if ((hasProgress || currentMaxReps > repsMax) && fatigue >= 4) {
        return {
            decisionType: "Висока умора, но добро представяне",
            decisionText: "Представянето ти е добро, но умората е висока. Не намалявай тежестта. По-добре запази килограмите и намали 1 серия от най-натоварващото упражнение."
        };
    }

    if (hasClearRegression) {
        return {
            decisionType: "Ясен регрес",
            decisionText: "Има спад в представянето. Следващия път намали тежестта с малка стъпка или намали 1 серия, ако умората е била висока."
        };
    }

    if (hasProgress && currentMaxReps <= repsMax) {
        return {
            decisionType: "Добави повторение",
            decisionText: "Представянето ти е добро. Следващия път запази същата тежест и опитай да добавиш 1 повторение."
        };
    }

    if (isStable) {
        return {
            decisionType: "Поддържане",
            decisionText: "Представянето е стабилно. Следващия път запази същите килограми, серии и повторения. Целта е да повториш изпълнението с добър контрол."
        };
    }

    if (hasSlightRegression) {
        return {
            decisionType: "Лек регрес",
            decisionText: "Има лек спад в представянето. Следващия път не увеличавай тежестта. Запази същите килограми и се опитай да върнеш повторенията."
        };
    }

    return {
        decisionType: "Поддържане",
        decisionText: "Представянето е стабилно. Следващия път запази същите килограми, серии и повторения. Целта е да повториш изпълнението с добър контрол."
    };
}

function generateSessionAdaptationDecision(exerciseDecisions) {
    const allFirstWorkout = exerciseDecisions.every(decision => decision.decisionType === "Първа тренировка");
    const hasRegression = exerciseDecisions.some(decision => decision.decisionType === "Ясен регрес" || decision.decisionType === "Лек регрес");
    const hasHighFatigue = exerciseDecisions.some(decision => decision.decisionType === "Висока умора, но добро представяне");
    const hasProgress = exerciseDecisions.some(decision => decision.decisionType === "Добави повторение" || decision.decisionType === "Увеличи тежестта");

    if (allFirstWorkout) {
        return {
            decisionType: "Първа тренировка",
            decisionText: "Тази тренировка ще се използва като начална база за следващи сравнения."
        };
    }

    if (hasRegression) {
        return {
            decisionType: "Нужна е корекция",
            decisionText: "Има упражнения със спад в представянето. Следващия път следвай препоръките по упражнения."
        };
    }

    if (hasHighFatigue) {
        return {
            decisionType: "Контрол на обема",
            decisionText: "Представянето е добро, но умората е висока. Следващия път не добавяй излишен обем."
        };
    }

    if (hasProgress) {
        return {
            decisionType: "Прогрес",
            decisionText: "Има потенциал за прогрес. Следващия път следвай препоръките по упражнения."
        };
    }

    return {
        decisionType: "Поддържане",
        decisionText: "Представянето е стабилно. Следващия път запази текущия подход."
    };
}

module.exports = {
    calculateAverageRir,
    generateExerciseAdaptationDecision,
    generateSessionAdaptationDecision
};