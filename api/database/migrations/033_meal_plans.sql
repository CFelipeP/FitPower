CREATE TABLE meal_plans (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coach_id INT UNSIGNED NOT NULL,
    client_id INT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    daily_calories INT UNSIGNED,
    protein_g INT UNSIGNED,
    carbs_g INT UNSIGNED,
    fat_g INT UNSIGNED,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES users(id),
    FOREIGN KEY (client_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE meal_plan_days (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    meal_plan_id INT UNSIGNED NOT NULL,
    day_of_week TINYINT UNSIGNED NOT NULL,
    meal_number TINYINT UNSIGNED NOT NULL,
    recipe_id INT UNSIGNED NULL,
    custom_meal_name VARCHAR(255),
    custom_calories INT UNSIGNED,
    custom_protein DECIMAL(6,1),
    custom_carbs DECIMAL(6,1),
    custom_fat DECIMAL(6,1),
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
