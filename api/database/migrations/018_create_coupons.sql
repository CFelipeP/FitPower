CREATE TABLE IF NOT EXISTS coupons (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_pct DECIMAL(5,2) NULL,
    discount_amount DECIMAL(10,2) NULL,
    plan_id INT UNSIGNED NULL,
    max_uses INT UNSIGNED NULL,
    current_uses INT UNSIGNED NOT NULL DEFAULT 0,
    expires_at DATETIME NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_coupon_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
