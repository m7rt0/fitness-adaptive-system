CREATE DATABASE IF NOT EXISTS fitness_adaptive_system;
USE fitness_adaptive_system;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    fitness_level VARCHAR(50) NOT NULL DEFAULT 'intermediate',
    goal VARCHAR(50) NOT NULL DEFAULT 'muscle_gain',
    training_days INT NOT NULL DEFAULT 4,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    muscle_group VARCHAR(50) NOT NULL,
    exercise_type VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    goal VARCHAR(50) NOT NULL,
    level VARCHAR(50) NOT NULL,
    training_days INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workout_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    day_number INT NOT NULL,
    day_name VARCHAR(100) NOT NULL,
    FOREIGN KEY (program_id) REFERENCES programs(id)
);

CREATE TABLE IF NOT EXISTS workout_exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workout_day_id INT NOT NULL,
    exercise_id INT NOT NULL,
    sets INT NOT NULL,
    reps_min INT NOT NULL,
    reps_max INT NOT NULL,
    target_rir INT NOT NULL,
    exercise_order INT NOT NULL,
    FOREIGN KEY (workout_day_id) REFERENCES workout_days(id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE TABLE IF NOT EXISTS workout_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    program_id INT NULL,
    workout_day_id INT NULL,
    readiness INT NULL,
    workout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'completed',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (program_id) REFERENCES programs(id),
    FOREIGN KEY (workout_day_id) REFERENCES workout_days(id)
);

CREATE TABLE IF NOT EXISTS set_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    exercise_id INT NOT NULL,
    set_number INT NOT NULL,
    weight DECIMAL(6,2) NOT NULL,
    reps INT NOT NULL,
    rir INT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE TABLE IF NOT EXISTS workout_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    difficulty INT NULL,
    recovery INT NULL,
    fatigue INT NOT NULL,
    notes TEXT,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id)
);

CREATE TABLE IF NOT EXISTS adaptation_decisions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    decision_type VARCHAR(100) NOT NULL,
    decision_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id)
);

CREATE TABLE IF NOT EXISTS exercise_adaptation_decisions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    exercise_id INT NOT NULL,
    decision_type VARCHAR(100) NOT NULL,
    decision_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);