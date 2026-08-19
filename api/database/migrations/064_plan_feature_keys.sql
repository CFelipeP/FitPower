-- ============================================================
-- 064 - Structured feature keys for plan entitlements
-- plan_features gains a stable feature_key so entitlement checks
-- stop relying on free-text matching ("everything in...", etc).
-- ============================================================
ALTER TABLE plan_features ADD COLUMN feature_key VARCHAR(64) NULL DEFAULT NULL AFTER text;
ALTER TABLE plan_features ADD INDEX idx_plan_features_key (plan_id, feature_key);

-- Starter
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'on_demand_workouts'    WHERE sp.name = 'Starter' AND pf.text LIKE '%on-demand workouts%';
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'basic_progress'        WHERE sp.name = 'Starter' AND pf.text LIKE '%Basic progress%';
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'mobile_access'         WHERE sp.name = 'Starter' AND pf.text LIKE '%Mobile app access%';
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'live_coaching'         WHERE sp.name = 'Starter' AND pf.text LIKE '%Live coaching sessions%';
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'nutrition_prescription' WHERE sp.name = 'Starter' AND pf.text LIKE '%Nutrition prescription%';

-- Pro
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'unlimited_live_coaching' WHERE sp.name = 'Pro' AND pf.text LIKE '%Unlimited live coaching%';
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'ai_programming'          WHERE sp.name = 'Pro' AND pf.text LIKE '%AI-powered programming%';
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'custom_nutrition'        WHERE sp.name = 'Pro' AND pf.text LIKE '%Custom nutrition plans%';
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'priority_support'        WHERE sp.name = 'Pro' AND pf.text LIKE '%Priority support%';

-- Enterprise
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'one_on_one'         WHERE sp.name = 'Enterprise' AND pf.text LIKE '%1-on-1%';
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'premium_nutrition'  WHERE sp.name = 'Enterprise' AND pf.text LIKE '%Premium nutrition prescription%';
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'body_composition'   WHERE sp.name = 'Enterprise' AND pf.text LIKE '%Body composition%';
UPDATE plan_features pf JOIN subscription_plans sp ON sp.id = pf.plan_id
SET pf.feature_key = 'early_access'       WHERE sp.name = 'Enterprise' AND pf.text LIKE '%Early access%';

-- "Everything in ..." lines are marketing text, not features: leave key NULL.
