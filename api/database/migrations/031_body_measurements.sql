CREATE TABLE body_measurements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    date DATE NOT NULL,
    weight_kg DECIMAL(5,1),
    body_fat_pct DECIMAL(4,1),
    waist_cm DECIMAL(5,1),
    hip_cm DECIMAL(5,1),
    chest_cm DECIMAL(5,1),
    left_arm_cm DECIMAL(5,1),
    right_arm_cm DECIMAL(5,1),
    left_thigh_cm DECIMAL(5,1),
    right_thigh_cm DECIMAL(5,1),
    left_calf_cm DECIMAL(5,1),
    right_calf_cm DECIMAL(5,1),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sleep_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    date DATE NOT NULL,
    hours DECIMAL(3,1) NOT NULL,
    quality ENUM('poor','fair','good','great') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE habits (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50) DEFAULT 'check',
    color VARCHAR(7) DEFAULT '#4CAF50',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE habit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    habit_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    date DATE NOT NULL,
    completed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_habit_date (habit_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
