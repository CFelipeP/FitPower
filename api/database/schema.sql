CREATE DATABASE IF NOT EXISTS fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fitpower;

-- ============================================================
-- USERS (Client accounts)
-- ============================================================
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role ENUM('admin','coach','client') NOT NULL DEFAULT 'client',
    password VARCHAR(255) NOT NULL,
    fitness_level ENUM('beginner','intermediate','advanced') NULL,
    primary_goal ENUM('fat-loss','muscle','endurance','wellness') NULL,
    training_days TINYINT UNSIGNED NULL,
    photo VARCHAR(255) NULL,
    email_verified_at DATETIME NULL,
    remember_token VARCHAR(100) NULL,
    status ENUM('active','pending','suspended') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    settings JSON DEFAULT NULL
) ENGINE=InnoDB;

-- ============================================================
-- PASSWORD RESETS
-- ============================================================
CREATE TABLE password_resets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(100) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_token (token)
) ENGINE=InnoDB;

-- ============================================================
-- TRAINERS
-- ============================================================
CREATE TABLE trainers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NULL,
    date_of_birth DATE NULL,
    gender ENUM('male','female','nonbinary','prefer-not') NULL,
    photo VARCHAR(255) NULL,
    experience ENUM('0-1','1-3','3-5','5-10','10+') NULL,
    bio TEXT NULL,
    philosophy TEXT NULL,
    instagram VARCHAR(255) NULL,
    youtube VARCHAR(255) NULL,
    website VARCHAR(255) NULL,
    country VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    timezone VARCHAR(50) NULL,
    modality ENUM('online','in-person','hybrid') NULL,
    emergency_name VARCHAR(100) NULL,
    emergency_phone VARCHAR(50) NULL,
    emergency_relation VARCHAR(50) NULL,
    terms_accepted TINYINT(1) NOT NULL DEFAULT 0,
    privacy_accepted TINYINT(1) NOT NULL DEFAULT 0,
    marketing_optin TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
    avg_rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- TRAINER SPECIALIZATIONS
-- ============================================================
CREATE TABLE specializations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

INSERT INTO specializations (slug, name) VALUES
('strength', 'Strength'),
('hiit', 'HIIT'),
('yoga', 'Yoga'),
('boxing', 'Boxing'),
('cycling', 'Cycling'),
('nutrition', 'Nutrition'),
('rehab', 'Rehab'),
('functional', 'Functional'),
('calisthenics', 'Calisthenics'),
('prepost-natal', 'Pre/Post-natal'),
('crossfit', 'CrossFit');

CREATE TABLE trainer_specialization (
    trainer_id INT UNSIGNED NOT NULL,
    specialization_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (trainer_id, specialization_id),
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
    FOREIGN KEY (specialization_id) REFERENCES specializations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TRAINER LANGUAGES
-- ============================================================
CREATE TABLE languages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO languages (name) VALUES
('English'), ('Español'), ('Português'), ('Français'), ('Deutsch'),
('Italiano'), ('日本語'), ('中文'), ('العربية'), ('हिन्दी');

CREATE TABLE trainer_language (
    trainer_id INT UNSIGNED NOT NULL,
    language_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (trainer_id, language_id),
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TRAINER CERTIFICATIONS
-- ============================================================
CREATE TABLE certifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

INSERT INTO certifications (slug, name) VALUES
('nasm-cpt', 'NASM CPT'),
('ace-cpt', 'ACE CPT'),
('nsca-cscs', 'NSCA CSCS'),
('issa-cpt', 'ISSA CPT'),
('acf-l1', 'ACF Level 1'),
('crossfit-l2', 'CrossFit Level 2'),
('precision-nutrition', 'Precision Nutrition'),
('other', 'Other');

CREATE TABLE trainer_certification (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trainer_id INT UNSIGNED NOT NULL,
    certification_id INT UNSIGNED NOT NULL,
    cert_id_number VARCHAR(100) NULL,
    cert_file VARCHAR(255) NULL,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
    FOREIGN KEY (certification_id) REFERENCES certifications(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- PROGRAMS
-- ============================================================
CREATE TABLE programs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trainer_id INT UNSIGNED NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    tag VARCHAR(100) NULL,
    duration_minutes VARCHAR(50) NULL,
    weeks TINYINT UNSIGNED NULL,
    sessions_per_week TINYINT UNSIGNED NULL,
    difficulty ENUM('beginner','intermediate','advanced') NULL,
    image VARCHAR(255) NULL,
    avg_rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
    enrollments INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('active','draft','archived') NOT NULL DEFAULT 'draft',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- USER PROGRAMS (Enrollments)
-- ============================================================
CREATE TABLE user_programs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    program_id INT UNSIGNED NOT NULL,
    progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    current_week TINYINT UNSIGNED NOT NULL DEFAULT 1,
    status ENUM('active','completed','paused','cancelled') NOT NULL DEFAULT 'active',
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- WORKOUT SESSIONS
-- ============================================================
CREATE TABLE sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    program_id INT UNSIGNED NULL,
    trainer_id INT UNSIGNED NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    date DATE NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    type ENUM('group','1on1','video') NOT NULL DEFAULT 'group',
    max_participants INT UNSIGNED NULL DEFAULT 10,
    status ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- SESSION PARTICIPANTS
-- ============================================================
CREATE TABLE session_participants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status ENUM('registered','completed','cancelled') NOT NULL DEFAULT 'registered',
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- EXERCISES (within a workout/session)
-- ============================================================
CREATE TABLE exercises (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id INT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    sets TINYINT UNSIGNED NULL,
    reps VARCHAR(50) NULL,
    weight VARCHAR(50) NULL,
    notes TEXT NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SUBSCRIPTIONS (Plans)
-- ============================================================
CREATE TABLE subscription_plans (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    price_monthly DECIMAL(8,2) NOT NULL,
    price_yearly DECIMAL(8,2) NOT NULL,
    popular TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, popular) VALUES
('Starter', 'Perfect to get started', 19.00, 13.00, 0),
('Pro', 'Best for serious athletes', 39.00, 27.00, 1),
('Elite', 'For the full experience', 69.00, 48.00, 0);

-- ============================================================
-- PLAN FEATURES
-- ============================================================
CREATE TABLE plan_features (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plan_id INT UNSIGNED NOT NULL,
    text VARCHAR(255) NOT NULL,
    included TINYINT(1) NOT NULL DEFAULT 1,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO plan_features (plan_id, text, included, sort_order) VALUES
(1, '100+ on-demand workouts', 1, 1),
(1, 'Basic progress tracking', 1, 2),
(1, 'Mobile app access', 1, 3),
(1, 'Live coaching sessions', 0, 4),
(1, 'Nutrition prescription', 0, 5),
(2, '500+ on-demand workouts', 1, 1),
(2, 'Unlimited live coaching', 1, 2),
(2, 'AI-powered programming', 1, 3),
(2, 'Basic nutrition plan', 1, 4),
(2, '1-on-1 coaching', 0, 5),
(3, 'Everything in Pro', 1, 1),
(3, '1-on-1 personal coaching', 1, 2),
(3, 'Premium nutrition prescription', 1, 3),
(3, 'Body composition analysis', 1, 4),
(3, 'Early access to new features', 1, 5);

-- ============================================================
-- USER SUBSCRIPTIONS
-- ============================================================
CREATE TABLE user_subscriptions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    plan_id INT UNSIGNED NOT NULL,
    billing ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly',
    status ENUM('active','cancelled','expired') NOT NULL DEFAULT 'active',
    starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ends_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    subscription_id INT UNSIGNED NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    method VARCHAR(50) NULL,
    type ENUM('subscription','coaching','product') NOT NULL DEFAULT 'subscription',
    status ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================
CREATE TABLE support_tickets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    trainer_id INT UNSIGNED NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity ENUM('open','in_progress','critical','resolved','closed') NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- CONTACT MESSAGES (landing page form)
-- ============================================================
CREATE TABLE contact_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject ENUM('planes','tecnico','coach','otro') NOT NULL,
    message TEXT NOT NULL,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- NUTRITION LOGS
-- ============================================================
CREATE TABLE nutrition_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    log_date DATE NOT NULL,
    calories_target INT UNSIGNED NOT NULL DEFAULT 1940,
    calories_consumed INT UNSIGNED NOT NULL DEFAULT 0,
    protein_current DECIMAL(6,1) NOT NULL DEFAULT 0,
    protein_target DECIMAL(6,1) NOT NULL DEFAULT 150,
    carbs_current DECIMAL(6,1) NOT NULL DEFAULT 0,
    carbs_target DECIMAL(6,1) NOT NULL DEFAULT 220,
    fat_current DECIMAL(6,1) NOT NULL DEFAULT 0,
    fat_target DECIMAL(6,1) NOT NULL DEFAULT 65,
    water_glasses TINYINT UNSIGNED NOT NULL DEFAULT 0,
    breakfast_checked TINYINT(1) NOT NULL DEFAULT 0,
    lunch_checked TINYINT(1) NOT NULL DEFAULT 0,
    dinner_checked TINYINT(1) NOT NULL DEFAULT 0,
    snack_checked TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_date (user_id, log_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- BODY METRICS
-- ============================================================
CREATE TABLE body_metrics (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    log_date DATE NOT NULL,
    weight_kg DECIMAL(5,1) NULL,
    body_fat_pct DECIMAL(4,1) NULL,
    muscle_kg DECIMAL(5,1) NULL,
    bmi DECIMAL(4,1) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, log_date)
) ENGINE=InnoDB;

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE achievements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    description TEXT NULL,
    icon VARCHAR(50) NULL,
    sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT INTO achievements (slug, label, icon, sort_order) VALUES
('7-day-streak', '7-Day Streak', 'Zap', 1),
('first-pr', 'First PR', 'Trophy', 2),
('50-workouts', '50 Workouts', 'Dumbbell', 3),
('5k-calories', '5K Calories', 'Flame', 4),
('30-day-challenge', '30 Day Challenge', 'Calendar', 5),
('consistency-king', 'Consistency King', 'Award', 6),
('community-hero', 'Community Hero', 'Users', 7),
('master', 'Master', 'Crown', 8);

CREATE TABLE user_achievements (
    user_id INT UNSIGNED NOT NULL,
    achievement_id INT UNSIGNED NOT NULL,
    unlocked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- REVIEWS (Client feedback for trainers)
-- ============================================================
CREATE TABLE reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    trainer_id INT UNSIGNED NOT NULL,
    session_id INT UNSIGNED NULL,
    rating TINYINT UNSIGNED NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- PROGRAM REVIEWS (rating programs, not trainers)
-- ============================================================
CREATE TABLE program_reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    program_id INT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_program (user_id, program_id)
) ENGINE=InnoDB;

-- ============================================================
-- BLOG / ARTICLES
-- ============================================================
CREATE TABLE articles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    author_id INT UNSIGNED NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT NULL,
    content TEXT NOT NULL,
    cover_image VARCHAR(255) NULL,
    category VARCHAR(100) NULL,
    tags JSON NULL,
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    published_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_slug (slug),
    INDEX idx_published (published_at)
) ENGINE=InnoDB;

-- ============================================================
-- FORUM / COMMUNITY
-- ============================================================
CREATE TABLE forum_topics (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NULL,
    tags JSON NULL,
    views INT UNSIGNED NOT NULL DEFAULT 0,
    is_pinned TINYINT(1) NOT NULL DEFAULT 0,
    is_locked TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('active','archived') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE forum_replies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    topic_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    is_solution TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_topic (topic_id)
) ENGINE=InnoDB;

CREATE TABLE forum_likes (
    user_id INT UNSIGNED NOT NULL,
    reply_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, reply_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_id) REFERENCES forum_replies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- LEADERBOARD
-- ============================================================
CREATE TABLE leaderboard_entries (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    total_points INT UNSIGNED NOT NULL DEFAULT 0,
    workouts_completed INT UNSIGNED NOT NULL DEFAULT 0,
    streak_days INT UNSIGNED NOT NULL DEFAULT 0,
    total_calories_burned INT UNSIGNED NOT NULL DEFAULT 0,
    sessions_attended INT UNSIGNED NOT NULL DEFAULT 0,
    reviews_written INT UNSIGNED NOT NULL DEFAULT 0,
    forum_posts INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- RATE LIMITING
-- ============================================================
CREATE TABLE rate_limits (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    hits INT UNSIGNED NOT NULL DEFAULT 1,
    window_start DATETIME NOT NULL,
    INDEX idx_ip_endpoint (ip_address, endpoint),
    INDEX idx_window (window_start)
) ENGINE=InnoDB;

-- ============================================================
-- SMART ROUTINES (intelligent daily workout generator)
-- ============================================================
CREATE TABLE smart_routines (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    routine_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    focus VARCHAR(100) NULL,
    duration_minutes INT UNSIGNED NULL,
    difficulty ENUM('beginner','intermediate','advanced') NULL,
    exercises JSON NOT NULL,
    is_completed TINYINT(1) NOT NULL DEFAULT 0,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, routine_date)
) ENGINE=InnoDB;

-- ============================================================
-- CONVERSATIONS (Chat)
-- ============================================================
CREATE TABLE conversations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    participant_one INT UNSIGNED NOT NULL,
    participant_two INT UNSIGNED NOT NULL,
    last_message TEXT NULL,
    last_message_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_one) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_two) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT UNSIGNED NOT NULL,
    sender_id INT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
CREATE TABLE activities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    trainer_id INT UNSIGNED NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NULL,
    icon_color VARCHAR(20) NULL,
    badge_text VARCHAR(50) NULL,
    badge_class VARCHAR(20) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- EXERCISE LIBRARY (predefined exercises)
-- ============================================================
CREATE TABLE exercise_library (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NULL,
    muscle_group VARCHAR(100) NULL,
    description TEXT NULL,
    image_url VARCHAR(255) NULL,
    video_url VARCHAR(255) NULL,
    difficulty ENUM('beginner','intermediate','advanced') NULL DEFAULT 'beginner',
    equipment VARCHAR(100) NULL,
    instructions TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- DAILY CHECK-INS
-- ============================================================
CREATE TABLE daily_checkins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    checkin_date DATE NOT NULL,
    energy_level TINYINT UNSIGNED NULL,
    mood VARCHAR(20) NULL,
    sleep_hours DECIMAL(3,1) NULL,
    water_intake TINYINT UNSIGNED NULL,
    meals_completed TINYINT UNSIGNED NULL,
    workout_completed TINYINT(1) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, checkin_date)
) ENGINE=InnoDB;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NULL,
    icon VARCHAR(50) NULL,
    icon_color VARCHAR(20) NULL,
    link VARCHAR(255) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- PROGRESS PHOTOS
-- ============================================================
CREATE TABLE progress_photos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    photo_type ENUM('front','back','side','full','other') NOT NULL DEFAULT 'full',
    body_weight DECIMAL(5,1) NULL,
    notes TEXT NULL,
    taken_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, taken_at)
) ENGINE=InnoDB;

-- ============================================================
-- RECIPES
-- ============================================================
CREATE TABLE recipes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(100) NULL,
    calories INT UNSIGNED NULL,
    protein_g DECIMAL(6,1) NULL,
    carbs_g DECIMAL(6,1) NULL,
    fat_g DECIMAL(6,1) NULL,
    prep_time_minutes INT UNSIGNED NULL,
    difficulty ENUM('easy','medium','hard') NULL DEFAULT 'easy',
    image_url VARCHAR(255) NULL,
    ingredients JSON NULL,
    instructions TEXT NULL,
    tags JSON NULL,
    is_public TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- CHALLENGES
-- ============================================================
CREATE TABLE IF NOT EXISTS challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM('strength', 'cardio', 'nutrition', 'mindset', 'habit') DEFAULT 'strength',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    goal_type ENUM('reps', 'minutes', 'days', 'distance', 'weight', 'custom') DEFAULT 'reps',
    goal_value INT DEFAULT 0,
    reward VARCHAR(200) DEFAULT NULL,
    created_by INT UNSIGNED DEFAULT NULL,
    max_participants INT DEFAULT NULL,
    is_featured TINYINT(1) DEFAULT 0,
    status ENUM('active', 'upcoming', 'completed', 'cancelled') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS challenge_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    progress INT DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (challenge_id, user_id)
) ENGINE=InnoDB;
