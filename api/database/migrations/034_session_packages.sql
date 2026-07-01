CREATE TABLE session_packages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coach_id INT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    session_count INT UNSIGNED NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration_days INT UNSIGNED,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_session_packages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_id INT UNSIGNED NOT NULL,
    package_id INT UNSIGNED NOT NULL,
    sessions_used INT UNSIGNED DEFAULT 0,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATE,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (package_id) REFERENCES session_packages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
