USE fitness_adaptive_system;

SET SQL_SAFE_UPDATES = 0;

SET @identifier = 'username_or_email';
SET @delete_programs = 0;

SET @user_id = (
    SELECT id
    FROM users
    WHERE username = @identifier OR email = @identifier
    LIMIT 1
);

DELETE ead
FROM exercise_adaptation_decisions ead
JOIN workout_sessions ws ON ead.session_id = ws.id
WHERE ws.user_id = @user_id;

DELETE ad
FROM adaptation_decisions ad
JOIN workout_sessions ws ON ad.session_id = ws.id
WHERE ws.user_id = @user_id;

DELETE wf
FROM workout_feedback wf
JOIN workout_sessions ws ON wf.session_id = ws.id
WHERE ws.user_id = @user_id;

DELETE sl
FROM set_logs sl
JOIN workout_sessions ws ON sl.session_id = ws.id
WHERE ws.user_id = @user_id;

DELETE FROM workout_sessions
WHERE user_id = @user_id;

DELETE we
FROM workout_exercises we
JOIN workout_days wd ON we.workout_day_id = wd.id
JOIN programs p ON wd.program_id = p.id
WHERE p.user_id = @user_id
  AND @delete_programs = 1;

DELETE wd
FROM workout_days wd
JOIN programs p ON wd.program_id = p.id
WHERE p.user_id = @user_id
  AND @delete_programs = 1;

DELETE FROM programs
WHERE user_id = @user_id
  AND @delete_programs = 1;

SET SQL_SAFE_UPDATES = 1;