-- Idempotency table for payment webhooks (Stripe retries, PayPal resends)
CREATE TABLE IF NOT EXISTS webhook_events (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    source VARCHAR(20) NOT NULL DEFAULT 'stripe',
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
