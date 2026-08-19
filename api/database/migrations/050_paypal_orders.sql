-- PayPal order tracking + payment capture dedupe
CREATE TABLE IF NOT EXISTS paypal_orders (
    order_id VARCHAR(64) NOT NULL PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    plan_id INT UNSIGNED NOT NULL,
    billing ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly',
    coupon VARCHAR(100) NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('created','captured') NOT NULL DEFAULT 'created',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_paypal_orders_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE payments ADD COLUMN paypal_capture_id VARCHAR(64) NULL AFTER method;
