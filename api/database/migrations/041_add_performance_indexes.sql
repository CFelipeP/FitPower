-- Migration 041: Composite indexes for performance optimization
-- Reduces query time for dashboards, leaderboard, social feed, and N+1 queries

-- Users: fast role/status filtering (admin dashboard)
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_users_status_created ON users(status, created_at);

-- Sessions: fast coach dashboard queries
CREATE INDEX idx_sessions_trainer_date_status ON sessions(trainer_id, date, status);

-- Session participants: fast client dashboard queries
CREATE INDEX idx_session_participants_user_status ON session_participants(user_id, status);

-- User programs: fast enrollment lookups
CREATE INDEX idx_user_programs_user_status ON user_programs(user_id, status);
CREATE INDEX idx_user_programs_program_status ON user_programs(program_id, status);

-- Payments: fast analytics queries
CREATE INDEX idx_payments_status_type_created ON payments(status, type, created_at);

-- Support tickets: fast open ticket queries
CREATE INDEX idx_tickets_severity_created ON support_tickets(severity, created_at DESC);

-- Leaderboard: fast sorting
CREATE INDEX idx_leaderboard_points ON leaderboard_entries(total_points DESC);

-- Exercise library: fast name JOIN (leaderboard by muscle)
CREATE INDEX idx_exercise_library_name ON exercise_library(name);

-- Social: fast feed queries
CREATE INDEX idx_social_posts_user_created ON social_posts(user_id, created_at DESC);
CREATE INDEX idx_social_likes_post_user ON social_likes(post_id, user_id);

-- User subscriptions: fast subscription lookups
CREATE INDEX idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);
CREATE INDEX idx_user_subscriptions_plan_status ON user_subscriptions(plan_id, status);
