CREATE TABLE IF NOT EXISTS coach_payouts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coach_id INT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    stripe_transfer_id VARCHAR(255) DEFAULT NULL,
    status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    description VARCHAR(500) DEFAULT NULL,
    paid_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
