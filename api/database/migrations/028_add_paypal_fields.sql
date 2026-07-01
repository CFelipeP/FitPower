ALTER TABLE users ADD COLUMN paypal_customer_id VARCHAR(255) DEFAULT NULL AFTER stripe_customer_id;
ALTER TABLE user_subscriptions ADD COLUMN paypal_order_id VARCHAR(255) DEFAULT NULL AFTER stripe_subscription_id;
ALTER TABLE payments MODIFY COLUMN method VARCHAR(50) NULL COMMENT 'card, paypal, bank';
