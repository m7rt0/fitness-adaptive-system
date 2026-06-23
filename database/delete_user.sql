USE fitness_adaptive_system;

SET SQL_SAFE_UPDATES = 0;

SET @identifier = 'username_or_email';

SET @user_id = (
    SELECT id
    FROM users
    WHERE username = @identifier OR email = @identifier
    LIMIT 1
);

DELETE FROM exercise_adaptation_decisions
WHERE session_id IN (
    SELECT id FROM workout_sessions WHERE user_id = @user_id
);

DELETE FROM adaptation_decisions
WHERE session_id IN (
    SELECT id FROM workout_sessions WHERE user_id = @user_id
);

DELETE FROM workout_feedback
WHERE session_id IN (
    SELECT id FROM workout_sessions WHERE user_id = @user_id
);

DELETE FROM set_logs
WHERE session_id IN (
    SELECT id FROM workout_sessions WHERE user_id = @user_id
);

DELETE FROM workout_sessions
WHERE user_id = @user_id;

DELETE FROM workout_exercises
WHERE workout_day_id IN (
    SELECT wd.id
    FROM workout_days wd
    JOIN programs p ON wd.program_id = p.id
    WHERE p.user_id = @user_id
);

DELETE FROM workout_days
WHERE program_id IN (
    SELECT id FROM programs WHERE user_id = @user_id
);

DELETE FROM programs
WHERE user_id = @user_id;

DELETE FROM users
WHERE id = @user_id;

SET SQL_SAFE_UPDATES = 1;