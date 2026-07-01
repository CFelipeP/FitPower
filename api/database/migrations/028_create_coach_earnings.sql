CREATE TABLE IF NOT EXISTS coach_earnings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coach_id INT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('session', 'group_session', 'program_royalty', 'other') NOT NULL,
    source_id INT UNSIGNED DEFAULT NULL,
    description VARCHAR(500) DEFAULT NULL,
    status ENUM('pending', 'available', 'paid') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
