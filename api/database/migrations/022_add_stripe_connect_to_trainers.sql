ALTER TABLE trainers ADD COLUMN stripe_connect_account_id VARCHAR(255) DEFAULT NULL AFTER stripe_account_id;
ALTER TABLE trainers ADD COLUMN stripe_connect_onboarding_complete TINYINT(1) DEFAULT 0 AFTER stripe_connect_account_id;
ALTER TABLE trainers ADD COLUMN stripe_connect_onboarding_url VARCHAR(500) DEFAULT NULL AFTER stripe_connect_onboarding_complete;
