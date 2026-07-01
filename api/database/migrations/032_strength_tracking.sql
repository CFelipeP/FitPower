ALTER TABLE workout_logs ADD COLUMN rpe DECIMAL(2,1) DEFAULT NULL;
ALTER TABLE workout_logs ADD COLUMN rir INT UNSIGNED DEFAULT NULL;
ALTER TABLE workout_logs ADD COLUMN is_pr TINYINT(1) DEFAULT 0;

CREATE TABLE strength_standards (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    exercise_id INT UNSIGNED NOT NULL,
    gender ENUM('male','female') NOT NULL,
    body_weight_kg DECIMAL(5,1) NOT NULL,
    novice DECIMAL(6,2) NOT NULL,
    intermediate DECIMAL(6,2) NOT NULL,
    advanced DECIMAL(6,2) NOT NULL,
    elite DECIMAL(6,2) NOT NULL,
    FOREIGN KEY (exercise_id) REFERENCES exercise_library(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE estimated_one_rms (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    exercise_id INT UNSIGNED NOT NULL,
    estimated_1rm DECIMAL(6,2) NOT NULL,
    formula_used VARCHAR(20) DEFAULT 'epley',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exercise_id) REFERENCES exercise_library(id),
    UNIQUE KEY unique_user_exercise (user_id, exercise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
