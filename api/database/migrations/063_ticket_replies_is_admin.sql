-- ============================================================
-- 063 - QA audit fixes (round 2)
--  1. ticket_replies.is_admin (admin + user replies -> 500)
-- ============================================================
ALTER TABLE ticket_replies ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id;
