ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) DEFAULT NULL;

ALTER TABLE user_subscriptions ADD COLUMN stripe_subscription_id VARCHAR(255) DEFAULT NULL;
