<?php

require_once __DIR__ . '/config.php';

echo "============================\n";
echo " FitPower Database Seeder\n";
echo "============================\n\n";

$db = getDB();
$now = date('Y-m-d H:i:s');
$today = date('Y-m-d');

// ============================================================
// STEP 1: Truncate all tables (FK-safe order)
// ============================================================
echo "[1/7] Truncating tables...\n";

$db->exec("SET FOREIGN_KEY_CHECKS = 0");

$truncateOrder = [
    'forum_likes',
    'forum_replies',
    'forum_topics',
    'challenge_participants',
    'challenges',
    'messages',
    'conversations',
    'reviews',
    'activities',
    'user_achievements',
    'notifications',
    'progress_photos',
    'daily_checkins',
    'nutrition_logs',
    'body_metrics',
    'recipes',
    'smart_routines',
    'payments',
    'user_subscriptions',
    'plan_features',
    'session_participants',
    'exercise_library',
    'exercises',
    'sessions',
    'user_programs',
    'support_tickets',
    'contact_messages',
    'trainer_certification',
    'trainer_language',
    'trainer_specialization',
    'programs',
    'trainers',
    'password_resets',
    'subscription_plans',
    'certifications',
    'languages',
    'specializations',
    'achievements',
    'articles',
    'leaderboard_entries',
    'users',
];

foreach ($truncateOrder as $table) {
    $db->exec("TRUNCATE TABLE `{$table}`");
    echo "  - {$table}\n";
}

$db->exec("SET FOREIGN_KEY_CHECKS = 1");

echo "  All tables truncated.\n\n";

// ============================================================
// STEP 2: Re-insert lookup data (from schema.sql)
// ============================================================
echo "[2/7] Inserting lookup data...\n";

$db->exec("INSERT INTO specializations (slug, name) VALUES
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
    ('crossfit', 'CrossFit')");

$db->exec("INSERT INTO languages (name) VALUES
    ('English'), ('Español'), ('Português'), ('Français'), ('Deutsch'),
    ('Italiano'), ('日本語'), ('中文'), ('العربية'), ('हिन्दी')");

$db->exec("INSERT INTO certifications (slug, name) VALUES
    ('nasm-cpt', 'NASM CPT'),
    ('ace-cpt', 'ACE CPT'),
    ('nsca-cscs', 'NSCA CSCS'),
    ('issa-cpt', 'ISSA CPT'),
    ('acf-l1', 'ACF Level 1'),
    ('crossfit-l2', 'CrossFit Level 2'),
    ('precision-nutrition', 'Precision Nutrition'),
    ('other', 'Other')");

$db->exec("INSERT INTO achievements (slug, label, icon, type, sort_order) VALUES
    ('7-day-streak', '7-Day Streak', 'Zap', 'streak', 1),
    ('first-pr', 'First PR', 'Trophy', 'strength', 2),
    ('50-workouts', '50 Workouts', 'Dumbbell', 'volume', 3),
    ('5k-calories', '5K Calories', 'Flame', 'nutrition', 4),
    ('30-day-challenge', '30 Day Challenge', 'Calendar', 'streak', 5),
    ('consistency-king', 'Consistency King', 'Award', 'streak', 6),
    ('community-hero', 'Community Hero', 'Users', 'social', 7),
    ('master', 'Master', 'Crown', 'milestone', 8)");

echo "  Lookup data inserted.\n\n";

// ============================================================
// STEP 3: Users & Trainer
// ============================================================
echo "[3/7] Creating users and trainer...\n";

$password = password_hash('Prueba123xd', PASSWORD_BCRYPT);

$userStmt = $db->prepare(
    "INSERT INTO users (first_name, last_name, email, role, password, fitness_level, primary_goal, training_days, email_verified_at, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

$users = [
    ['Admin',   'User',    'admin@fitpower.com',       'admin', 'advanced',    'wellness',  5, 'active'],
    ['Alex',    'Rivera',  'alex.rivera@fitpower.com',  'coach', 'advanced',    'muscle',    6, 'active'],
    ['Maria',   'Garcia',  'maria.garcia@fitpower.com', 'client','intermediate', 'fat-loss', 4, 'active'],
    ['Juan',    'Perez',   'juan.perez@fitpower.com',   'client','intermediate', 'muscle',   5, 'active'],
    ['Laura',   'Martinez','laura.martinez@fitpower.com','client','beginner',   'wellness',  3, 'active'],
];

$userIds = [];
foreach ($users as $u) {
    $userStmt->execute([$u[0], $u[1], $u[2], $u[3], $password, $u[4], $u[5], $u[6], $now, $u[7], $now, $now]);
    $uid = (int)$db->lastInsertId();
    $userIds[] = $uid;
    echo "  ✓ {$u[0]} {$u[1]} <{$u[2]}> (id={$uid})\n";
}

[$adminId, $coachUserId, $mariaId, $juanId, $lauraId] = $userIds;

// Trainer for Alex Rivera
$trainerStmt = $db->prepare(
    "INSERT INTO trainers (user_id, first_name, last_name, email, phone, date_of_birth, gender, experience,
     bio, philosophy, country, city, timezone, modality,
     terms_accepted, privacy_accepted, marketing_optin, status, avg_rating, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 'approved', 0.0, ?, ?)"
);

$trainerStmt->execute([
    $coachUserId,
    'Alex', 'Rivera', 'alex.rivera@fitpower.com',
    '+1-555-0101', '1985-03-15', 'male', '10+',
    'Certified personal trainer with over 10 years of experience helping clients achieve their fitness goals through science-based programming.',
    'I believe in sustainable fitness through progressive overload, proper nutrition, and consistency. Every journey is unique.',
    'United States', 'Miami', 'America/New_York', 'hybrid',
    $now, $now,
]);
$trainerId = (int)$db->lastInsertId();
echo "  ✓ Coach Alex Rivera (trainer id={$trainerId})\n";

// Link specializations (Strength=1, HIIT=2, Functional=8)
$db->prepare("INSERT IGNORE INTO trainer_specialization (trainer_id, specialization_id) VALUES (?, ?)")->execute([$trainerId, 1]);
$db->prepare("INSERT IGNORE INTO trainer_specialization (trainer_id, specialization_id) VALUES (?, ?)")->execute([$trainerId, 2]);
$db->prepare("INSERT IGNORE INTO trainer_specialization (trainer_id, specialization_id) VALUES (?, ?)")->execute([$trainerId, 8]);

echo "\n";

// ============================================================
// STEP 4: Programs
// ============================================================
echo "[4/7] Creating programs...\n";

$progStmt = $db->prepare(
    "INSERT INTO programs (trainer_id, name, description, tag, duration_minutes, weeks, sessions_per_week, difficulty, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)"
);

$programs = [
    ['HIIT Inferno',      'High-intensity interval training designed to torch calories and boost cardiovascular endurance.', 'HIIT',       '30-45 min', 8,  4, 'advanced'],
    ['Total Strength',    'Full-body strength training program focusing on compound lifts and progressive overload.',     'Strength',   '45-60 min', 12, 4, 'intermediate'],
    ['Upper Body Power',  'Targeted upper body program to build strength and definition in chest, back, and arms.',        'Upper Body', '40-50 min', 8,  3, 'intermediate'],
    ['Yoga Flow',         'Relaxing yoga flow for flexibility, mobility, and mental wellness, suitable for all levels.',   'Yoga',       '45-60 min', 6,  4, 'beginner'],
];

$programIds = [];
foreach ($programs as $p) {
    $progStmt->execute([$trainerId, $p[0], $p[1], $p[2], $p[3], $p[4], $p[5], $p[6], $now, $now]);
    $pid = (int)$db->lastInsertId();
    $programIds[] = $pid;
    echo "  ✓ {$p[0]} (id={$pid})\n";
}

[$hiitId, $strengthId, $upperId, $yogaId] = $programIds;
echo "\n";

// ============================================================
// STEP 5: User-Program enrollments, Sessions, Session Participants
// ============================================================
echo "[5/7] Creating enrollments, sessions, and participants...\n";

// User-Program enrollments
$upStmt = $db->prepare(
    "INSERT INTO user_programs (user_id, program_id, progress, current_week, status, started_at)
     VALUES (?, ?, ?, ?, ?, ?)"
);

$enrollments = [
    [$mariaId, $hiitId,     45.00, 4, 'active', '2026-05-01'],
    [$mariaId, $strengthId, 25.00, 3, 'active', '2026-05-01'],
    [$juanId,  $strengthId, 35.00, 5, 'active', '2026-05-01'],
    [$juanId,  $upperId,    60.00, 5, 'active', '2026-05-01'],
    [$lauraId, $yogaId,     15.00, 1, 'active', '2026-05-26'],
    [$adminId, $hiitId,     80.00, 7, 'active', '2026-04-01'],
];

foreach ($enrollments as $e) {
    $upStmt->execute($e);
}

echo "  ✓ " . count($enrollments) . " enrollments created\n";

// Sessions
$sesStmt = $db->prepare(
    "INSERT INTO sessions (program_id, trainer_id, title, description, `date`, start_time, end_time, type, max_participants, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

$sessionsData = [
    // HIIT Inferno – past
    [$hiitId, $trainerId, 'HIIT Inferno – Week 4 Day 1', 'Full body HIIT circuit',        '2026-05-04', '07:00', '07:45', 'group', 20, 'completed'],
    [$hiitId, $trainerId, 'HIIT Inferno – Week 4 Day 2', 'Tabata protocol',               '2026-05-06', '07:00', '07:30', 'group', 20, 'completed'],
    [$hiitId, $trainerId, 'HIIT Inferno – Week 4 Day 3', 'EMOM challenge',                '2026-05-08', '07:00', '07:40', 'group', 20, 'completed'],
    [$hiitId, $trainerId, 'HIIT Inferno – Week 4 Day 4', 'AMRAP finisher',                '2026-05-10', '07:00', '07:35', 'group', 20, 'completed'],
    // HIIT Inferno – upcoming
    [$hiitId, $trainerId, 'HIIT Inferno – Week 5 Day 1', 'Pyramid HIIT',                  '2026-06-01', '07:00', '07:45', 'group', 20, 'scheduled'],
    [$hiitId, $trainerId, 'HIIT Inferno – Week 5 Day 2', 'Interval sprints',              '2026-06-03', '07:00', '07:30', 'group', 20, 'scheduled'],
    // Total Strength – past
    [$strengthId, $trainerId, 'Total Strength – Week 3 Day 1', 'Squat focus',              '2026-05-05', '09:00', '10:00', 'group', 15, 'completed'],
    [$strengthId, $trainerId, 'Total Strength – Week 3 Day 2', 'Deadlift focus',           '2026-05-07', '09:00', '10:00', 'group', 15, 'completed'],
    // Total Strength – upcoming
    [$strengthId, $trainerId, 'Total Strength – Week 4 Day 1', 'Bench press focus',        '2026-06-02', '09:00', '10:00', 'group', 15, 'scheduled'],
    [$strengthId, $trainerId, 'Total Strength – Week 4 Day 2', 'Overhead press focus',     '2026-06-04', '09:00', '10:00', 'group', 15, 'scheduled'],
    // Upper Body Power – past
    [$upperId, $trainerId, 'Upper Body Power – Week 4 Day 1', 'Push day',                  '2026-05-05', '11:00', '11:50', 'group', 12, 'completed'],
    [$upperId, $trainerId, 'Upper Body Power – Week 4 Day 2', 'Pull day',                  '2026-05-07', '11:00', '11:50', 'group', 12, 'completed'],
    [$upperId, $trainerId, 'Upper Body Power – Week 4 Day 3', 'Arms & shoulders',          '2026-05-09', '11:00', '11:50', 'group', 12, 'completed'],
    // Upper Body Power – upcoming
    [$upperId, $trainerId, 'Upper Body Power – Week 5 Day 1', 'Push day + volume',         '2026-06-02', '11:00', '11:50', 'group', 12, 'scheduled'],
    // Yoga Flow – past
    [$yogaId, $trainerId, 'Yoga Flow – Week 1 Day 1', 'Sun salutations flow',              '2026-05-26', '06:00', '06:45', 'group', 25, 'completed'],
    [$yogaId, $trainerId, 'Yoga Flow – Week 1 Day 2', 'Hip opener sequence',               '2026-05-27', '06:00', '06:45', 'group', 25, 'completed'],
    // Yoga Flow – upcoming
    [$yogaId, $trainerId, 'Yoga Flow – Week 1 Day 3', 'Full body stretch',                 '2026-05-29', '06:00', '06:45', 'group', 25, 'scheduled'],
    [$yogaId, $trainerId, 'Yoga Flow – Week 2 Day 1', 'Balance & core',                    '2026-06-02', '06:00', '06:45', 'group', 25, 'scheduled'],
    // 1-on-1 for admin
    [$hiitId, $trainerId, 'Personal Coaching – Admin', 'One-on-one coaching session',      '2026-06-05', '10:00', '10:30', '1on1',  1, 'scheduled'],
];

$sessionIds = [];
foreach ($sessionsData as $s) {
    $sesStmt->execute([$s[0], $s[1], $s[2], $s[3], $s[4], $s[5], $s[6], $s[7], $s[8], $s[9], $now, $now]);
    $sessionIds[] = (int)$db->lastInsertId();
}

echo "  ✓ " . count($sessionsData) . " sessions created\n";

// Session participants
$spStmt = $db->prepare(
    "INSERT IGNORE INTO session_participants (session_id, user_id, status) VALUES (?, ?, ?)"
);

$participants = [
    // Maria -> HIIT (past + upcoming)
    [$sessionIds[0],  $mariaId, 'completed'],
    [$sessionIds[1],  $mariaId, 'completed'],
    [$sessionIds[2],  $mariaId, 'completed'],
    [$sessionIds[3],  $mariaId, 'completed'],
    [$sessionIds[4],  $mariaId, 'registered'],
    [$sessionIds[5],  $mariaId, 'registered'],
    // Maria -> Total Strength (past + upcoming)
    [$sessionIds[6],  $mariaId, 'completed'],
    [$sessionIds[7],  $mariaId, 'completed'],
    [$sessionIds[8],  $mariaId, 'registered'],
    [$sessionIds[9],  $mariaId, 'registered'],
    // Juan -> Total Strength (past + upcoming)
    [$sessionIds[6],  $juanId,  'completed'],
    [$sessionIds[7],  $juanId,  'completed'],
    [$sessionIds[8],  $juanId,  'registered'],
    [$sessionIds[9],  $juanId,  'registered'],
    // Juan -> Upper Body (past + upcoming)
    [$sessionIds[10], $juanId,  'completed'],
    [$sessionIds[11], $juanId,  'completed'],
    [$sessionIds[12], $juanId,  'completed'],
    [$sessionIds[13], $juanId,  'registered'],
    // Laura -> Yoga (past + upcoming)
    [$sessionIds[14], $lauraId, 'completed'],
    [$sessionIds[15], $lauraId, 'completed'],
    [$sessionIds[16], $lauraId, 'registered'],
    [$sessionIds[17], $lauraId, 'registered'],
    // Admin -> HIIT upcoming + personal
    [$sessionIds[4],  $adminId, 'registered'],
    [$sessionIds[18], $adminId, 'registered'],
];

foreach ($participants as $p) {
    $spStmt->execute($p);
}

echo "  ✓ " . count($participants) . " participants registered\n\n";

// ============================================================
// STEP 6: Nutrition logs, Body metrics, User achievements
// ============================================================
echo "[6/7] Creating health data...\n";

// Nutrition logs (today)
$nutStmt = $db->prepare(
    "INSERT INTO nutrition_logs
        (user_id, log_date, calories_target, calories_consumed, protein_current, protein_target,
         carbs_current, carbs_target, fat_current, fat_target, water_glasses,
         breakfast_checked, lunch_checked, dinner_checked, snack_checked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        calories_consumed = VALUES(calories_consumed),
        protein_current   = VALUES(protein_current),
        carbs_current     = VALUES(carbs_current),
        fat_current       = VALUES(fat_current),
        water_glasses     = VALUES(water_glasses)"
);

$nutritionData = [
    [$mariaId, $today, 1800, 1650, 120.5, 150, 180.0, 200, 55.0, 60, 6, 1, 1, 1, 0],
    [$juanId,  $today, 2500, 2300, 180.0, 200, 250.0, 280, 70.0, 80, 5, 1, 1, 1, 1],
    [$lauraId, $today, 1700, 1200,  85.0, 120, 130.0, 180, 40.0, 55, 4, 1, 1, 0, 0],
    [$adminId, $today, 2000, 1900, 130.0, 160, 210.0, 230, 60.0, 65, 7, 1, 1, 1, 1],
];

foreach ($nutritionData as $n) {
    $nutStmt->execute($n);
}

echo "  ✓ " . count($nutritionData) . " nutrition logs for today\n";

// Body metrics
$bmStmt = $db->prepare(
    "INSERT INTO body_metrics (user_id, log_date, weight_kg, body_fat_pct, muscle_kg, bmi)
     VALUES (?, ?, ?, ?, ?, ?)"
);

$metricsData = [
    // Maria
    [$mariaId, '2026-04-28', 72.0, 28.0, 28.5, 25.0],
    [$mariaId, '2026-05-15', 71.2, 27.5, 29.0, 24.7],
    [$mariaId, $today,       70.5, 27.0, 29.2, 24.5],
    // Juan
    [$juanId,  '2026-04-28', 85.0, 22.0, 38.0, 27.0],
    [$juanId,  '2026-05-15', 84.2, 21.5, 38.5, 26.8],
    [$juanId,  $today,       83.5, 21.0, 39.0, 26.5],
    // Laura
    [$lauraId, '2026-04-28', 65.0, 30.0, 24.0, 23.5],
    [$lauraId, '2026-05-15', 64.5, 29.5, 24.3, 23.3],
    [$lauraId, $today,       64.0, 29.0, 24.5, 23.1],
    // Admin
    [$adminId, '2026-04-28', 78.0, 18.0, 42.0, 23.8],
    [$adminId, $today,       77.2, 17.5, 42.5, 23.5],
];

foreach ($metricsData as $m) {
    $bmStmt->execute($m);
}

echo "  ✓ " . count($metricsData) . " body metric records\n";

// User achievements (some unlocked)
$uaStmt = $db->prepare(
    "INSERT IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)"
);

$userAchievements = [
    // Admin – many unlocked
    [$adminId, 1, '2026-05-10 10:00:00'], // 7-day streak
    [$adminId, 2, '2026-04-20 09:30:00'], // First PR
    [$adminId, 5, '2026-05-25 08:00:00'], // 30 day challenge
    [$adminId, 6, '2026-05-15 11:00:00'], // Consistency king
    // Maria
    [$mariaId, 1, '2026-05-20 07:00:00'], // 7-day streak
    [$mariaId, 2, '2026-05-18 10:30:00'], // First PR
    [$mariaId, 4, '2026-05-22 09:00:00'], // 5K calories
    // Juan
    [$juanId,  1, '2026-05-12 08:00:00'], // 7-day streak
    [$juanId,  3, '2026-05-15 11:00:00'], // 50 workouts
    // Laura – only 1 unlocked (7-day streak), the rest are locked
    [$lauraId, 1, '2026-05-27 06:30:00'], // 7-day streak
];

foreach ($userAchievements as $ua) {
    $uaStmt->execute($ua);
}

echo "  ✓ " . count($userAchievements) . " user achievements\n\n";

// ============================================================
// STEP 7: Remaining data (activities, tickets, subs, reviews)
// ============================================================
echo "[7/7] Creating activities, tickets, subscriptions, reviews...\n";

// Activities
$actStmt = $db->prepare(
    "INSERT INTO activities (user_id, trainer_id, type, description, icon, icon_color, badge_text, badge_class, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

$activities = [
    [$adminId,     $trainerId, 'workout',     'Completed HIIT Inferno session',             'Dumbbell',   '#10b981', 'Done',  'bg-success', '2026-05-27 07:45:00'],
    [$adminId,     null,       'progress',    'New body measurement recorded',               'Activity',   '#3b82f6', 'New',   'bg-primary', '2026-05-28 08:00:00'],
    [$coachUserId, null,       'session',     'Created new HIIT Inferno session',            'Calendar',   '#8b5cf6', 'New',   'bg-primary', '2026-05-27 09:00:00'],
    [$mariaId,     $trainerId, 'workout',     'Completed Total Strength workout',            'Dumbbell',   '#10b981', 'Done',  'bg-success', '2026-05-27 10:00:00'],
    [$mariaId,     null,       'achievement', 'Unlocked 7-Day Streak achievement',           'Trophy',     '#f59e0b', 'New',   'bg-warning', '2026-05-20 07:00:00'],
    [$mariaId,     null,       'nutrition',   'Logged today\'s meals',                       'Apple',      '#ef4444', 'Log',   'bg-info',    '2026-05-28 12:00:00'],
    [$juanId,      $trainerId, 'workout',     'Completed Upper Body Power session',          'Dumbbell',   '#10b981', 'Done',  'bg-success', '2026-05-27 11:50:00'],
    [$juanId,      null,       'subscription','Upgraded to Pro plan',                        'CreditCard', '#8b5cf6', 'Pro',   'bg-primary', '2026-05-15 14:00:00'],
    [$lauraId,     $trainerId, 'workout',     'Completed Yoga Flow session',                 'Heart',      '#ec4899', 'Done',  'bg-success', '2026-05-27 06:45:00'],
    [$lauraId,     null,       'milestone',   'First week of training completed',            'Award',      '#f59e0b', 'Week 1','bg-warning', '2026-05-28 06:45:00'],
];

foreach ($activities as $a) {
    $actStmt->execute($a);
}

echo "  ✓ " . count($activities) . " activities\n";

// Support tickets
$ticketStmt = $db->prepare(
    "INSERT INTO support_tickets (user_id, subject, message, severity, created_at)
     VALUES (?, ?, ?, ?, ?)"
);

$tickets = [
    [$mariaId, 'Cannot access workout videos',            'Hi, I am unable to play the videos in the HIIT Inferno program. They keep buffering and never load.',                                                                                     'open',        '2026-05-25 10:30:00'],
    [$juanId,  'Billing question',                        'I was charged twice for my subscription this month. Can you help me get a refund for the duplicate charge?',                                                                                 'in_progress', '2026-05-26 14:15:00'],
    [$lauraId, 'Need help with meal plan',               'The nutrition plan seems too restrictive for my lifestyle. Can I get some modifications or alternatives?',                                                                                    'open',        '2026-05-27 09:00:00'],
    [$adminId, 'Feature request: Dark mode',              'Would be great to have a dark mode option in the mobile app. The white background is very bright at night.',                                                                                 'resolved',    '2026-05-20 16:00:00'],
];

foreach ($tickets as $t) {
    $ticketStmt->execute($t);
}

echo "  ✓ " . count($tickets) . " support tickets\n";

// Subscription plans (overwrite with user-specified prices)
$subPlanStmt = $db->prepare(
    "INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, popular, status)
     VALUES (?, ?, ?, ?, ?, 'active')"
);

$planData = [
    ['Starter',    'Perfect to get started with essential features.',       29.00,  19.00, 0],
    ['Pro',        'Best for serious athletes who want real results.',      79.00,  59.00, 1],
    ['Enterprise', 'For the full experience with everything included.',    199.00, 149.00, 0],
];

$planIds = [];
foreach ($planData as $pd) {
    $subPlanStmt->execute($pd);
    $planIds[] = (int)$db->lastInsertId();
}

echo "  ✓ " . count($planData) . " subscription plans (Starter $29, Pro $79, Enterprise $199)\n";

// Plan features
$pfStmt = $db->prepare(
    "INSERT INTO plan_features (plan_id, text, included, sort_order) VALUES (?, ?, ?, ?)"
);

$planFeatures = [
    [$planIds[0], 'Workout tracker',             1, 1],
    [$planIds[0], 'Basic progress reports',      1, 2],
    [$planIds[0], 'Email support',               1, 3],
    [$planIds[0], 'Live coaching sessions',      0, 4],
    [$planIds[0], 'Nutrition plans',             0, 5],
    [$planIds[1], 'Everything in Starter',       1, 1],
    [$planIds[1], 'Unlimited live coaching',     1, 2],
    [$planIds[1], 'AI-powered programming',      1, 3],
    [$planIds[1], 'Custom nutrition plans',      1, 4],
    [$planIds[1], 'Priority support',            1, 5],
    [$planIds[2], 'Everything in Pro',           1, 1],
    [$planIds[2], '1-on-1 personal coaching',    1, 2],
    [$planIds[2], 'Premium nutrition prescription',1, 3],
    [$planIds[2], 'Body composition analysis',   1, 4],
    [$planIds[2], 'Early access to new features',1, 5],
];

foreach ($planFeatures as $pf) {
    $pfStmt->execute($pf);
}

echo "  ✓ " . count($planFeatures) . " plan features\n";

// User subscriptions
$usStmt = $db->prepare(
    "INSERT INTO user_subscriptions (user_id, plan_id, billing, status, starts_at, ends_at)
     VALUES (?, ?, ?, ?, ?, ?)"
);

$endsYearly = date('Y-m-d', strtotime('+1 year')) . ' 23:59:59';

$userSubs = [
    [$adminId,     $planIds[2], 'yearly',  'active', '2026-01-01', $endsYearly],
    [$coachUserId, $planIds[1], 'monthly', 'active', '2026-03-01', null],
    [$mariaId,     $planIds[1], 'monthly', 'active', '2026-04-15', null],
    [$juanId,      $planIds[1], 'yearly',  'active', '2026-02-01', $endsYearly],
    [$lauraId,     $planIds[0], 'monthly', 'active', '2026-05-01', null],
];

foreach ($userSubs as $us) {
    $usStmt->execute($us);
}

echo "  ✓ " . count($userSubs) . " user subscriptions\n";

// Reviews
$revStmt = $db->prepare(
    "INSERT INTO reviews (user_id, trainer_id, session_id, rating, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?)"
);

$reviews = [
    [$mariaId, $trainerId, $sessionIds[0], 5, 'Amazing HIIT session! Alex really pushes you to your limits.',          '2026-05-04 08:00:00'],
    [$mariaId, $trainerId, $sessionIds[6], 4, 'Great strength session, very well structured.',                          '2026-05-05 10:15:00'],
    [$juanId,  $trainerId, $sessionIds[6], 5, 'Best deadlift coaching I have ever had.',                                '2026-05-05 10:30:00'],
    [$juanId,  $trainerId, $sessionIds[10],4, 'Good push day workout, felt the burn!',                                  '2026-05-05 12:00:00'],
    [$lauraId, $trainerId, $sessionIds[14],5, 'Perfect beginner yoga flow. I felt amazing afterwards!',                 '2026-05-26 07:00:00'],
];

foreach ($reviews as $r) {
    $revStmt->execute($r);
}

echo "  ✓ " . count($reviews) . " reviews\n\n";

// Future sessions for Live Dashboard
$futureStmt = $db->prepare(
    "INSERT INTO sessions (program_id, trainer_id, title, description, `date`, start_time, end_time, type, max_participants, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
$futureSessions = [
    [$hiitId, $trainerId, 'HIIT Inferno – Live Today', 'Live HIIT session - today!',     $today,       '10:00', '10:45', 'group', 20, 'scheduled', $now, $now],
    [$strengthId, $trainerId, 'Strength – Afternoon Session', 'Afternoon strength',       $today,       '15:00', '16:00', 'group', 15, 'scheduled', $now, $now],
    [$yogaId, $trainerId, 'Evening Yoga Flow', 'Relaxing evening yoga',                  date('Y-m-d', strtotime('+1 day')), '18:00', '18:45', 'group', 25, 'scheduled', $now, $now],
    [$upperId, $trainerId, 'Upper Body – Tomorrow Morning', 'Morning push session',      date('Y-m-d', strtotime('+1 day')), '07:00', '07:50', 'group', 12, 'scheduled', $now, $now],
];
foreach ($futureSessions as $fs) {
    $futureStmt->execute([$fs[0], $fs[1], $fs[2], $fs[3], $fs[4], $fs[5], $fs[6], $fs[7], $fs[8], $fs[9], $now, $now]);
}
echo "  ✓ " . count($futureSessions) . " future sessions\n";

// Articles
$artStmt = $db->prepare(
    "INSERT INTO articles (author_id, title, slug, excerpt, content, category, status, published_at, created_at, updated_at, is_featured, is_archived)
     VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?)"
);
$articles = [
    [$coachUserId, '5 Tips to Maximize Your HIIT Workouts', 'hiit-tips', 'Learn how to get the most out of every HIIT session with these expert tips.', 'Full article content about HIIT workouts...', 'Training', '2026-07-01 08:00:00', '2026-07-01 08:00:00', '2026-07-01 08:00:00', 1, 0],
    [$coachUserId, 'Nutrition Guide for Athletes', 'nutrition-guide', 'A comprehensive guide to eating for performance and recovery.', 'Full nutrition article content...', 'Nutrition', '2026-06-28 10:00:00', '2026-06-28 10:00:00', '2026-06-28 10:00:00', 0, 0],
    [$adminId, 'New Features in FitPower 2026', 'fitpower-2026-features', 'Check out the latest features we have added this year.', 'Feature announcement content...', 'Announcements', '2026-06-15 09:00:00', '2026-06-15 09:00:00', '2026-06-15 09:00:00', 0, 0],
    [$coachUserId, 'The Importance of Recovery Days', 'recovery-days', 'Why rest days are crucial for your progress and how to use them effectively.', 'Recovery article content...', 'Wellness', '2026-06-10 07:00:00', '2026-06-10 07:00:00', '2026-06-10 07:00:00', 0, 0],
    [$adminId, 'Community Spotlight: Maria Journey', 'community-spotlight-maria', 'Read about how Maria transformed her fitness journey with FitPower.', 'Spotlight article content...', 'Community', '2026-05-30 12:00:00', '2026-05-30 12:00:00', '2026-05-30 12:00:00', 0, 0],
];
foreach ($articles as $a) {
    $artStmt->execute($a);
}
echo "  ✓ " . count($articles) . " articles\n";

// Admin audit log
$auditStmt = $db->prepare(
    "INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?)"
);
$auditLogs = [
    [$adminId, 'login', 'session', 0, json_encode(['ip' => '192.168.1.1']), '2026-07-08 08:00:00'],
    [$adminId, 'update_settings', 'platform_settings', 1, json_encode(['setting' => 'platform_name', 'old' => 'FitPower', 'new' => 'FitPower']), '2026-07-07 14:30:00'],
    [$adminId, 'delete_user', 'users', 99, json_encode(['user_email' => 'spam@example.com', 'reason' => 'spam_account']), '2026-07-06 10:15:00'],
    [$adminId, 'approve_content', 'articles', 1, json_encode(['action' => 'published', 'title' => 'HIIT Tips']), '2026-07-01 08:30:00'],
    [$adminId, 'login', 'session', 0, json_encode(['ip' => '192.168.1.1']), '2026-07-07 09:00:00'],
    [$adminId, 'failed_login', 'session', 0, json_encode(['ip' => '10.0.0.5', 'attempts' => 3]), '2026-07-06 03:00:00'],
    [$adminId, 'failed_login', 'session', 0, json_encode(['ip' => '10.0.0.5', 'attempts' => 5]), '2026-07-06 03:05:00'],
    [$adminId, 'resolve_report', 'content_reports', 3, json_encode(['new_status' => 'dismissed']), '2026-07-05 11:00:00'],
];
foreach ($auditLogs as $al) {
    $auditStmt->execute($al);
}
echo "  ✓ " . count($auditLogs) . " audit log entries\n";

// Platform settings
$settingsStmt = $db->prepare(
    "INSERT IGNORE INTO platform_settings (setting_key, setting_value, description) VALUES (?, ?, ?)"
);
$settingsData = [
    ['platform_name', 'FitPower', 'Nombre de la plataforma'],
    ['support_email', 'support@fitpower.app', 'Email de soporte'],
    ['default_language', 'es', 'Idioma por defecto'],
    ['timezone', 'America/Mexico_City', 'Zona horaria'],
    ['max_users', '10000', 'Máximo de usuarios permitidos'],
    ['max_storage_gb', '50', 'Almacenamiento máximo en GB'],
    ['api_rate_limit', '60', 'Límite de peticiones por minuto'],
    ['file_upload_max_mb', '25', 'Tamaño máximo de archivo en MB'],
];
foreach ($settingsData as $s) { $settingsStmt->execute($s); }
echo "  ✓ platform settings\n";

// Media assets
$mediaStmt = $db->prepare(
    "INSERT INTO media_assets (file_name, file_path, file_type, file_size, mime_type, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)"
);
$mediaAssets = [
    ['banner-hiit.jpg', 'uploads/media/banner-hiit.jpg', 'image', 245760, 'image/jpeg', $coachUserId, '2026-06-01 10:00:00'],
    ['logo.png', 'uploads/media/logo.png', 'image', 51200, 'image/png', $adminId, '2026-05-01 09:00:00'],
    ['workout-demo.mp4', 'uploads/media/workout-demo.mp4', 'video', 52428800, 'video/mp4', $coachUserId, '2026-06-15 14:00:00'],
    ['nutrition-plan.pdf', 'uploads/media/nutrition-plan.pdf', 'document', 102400, 'application/pdf', $adminId, '2026-06-20 11:00:00'],
    ['podcast-episode-1.mp3', 'uploads/media/podcast-episode-1.mp3', 'audio', 8388608, 'audio/mpeg', $coachUserId, '2026-06-25 16:00:00'],
];
foreach ($mediaAssets as $m) {
    $mediaStmt->execute($m);
}
echo "  ✓ " . count($mediaAssets) . " media assets\n";

// Content reports (flagged reports)
$reportStmt = $db->prepare(
    "INSERT INTO content_reports (reporter_id, content_type, content_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
);
$reports = [
    [$adminId, 'forum_topic', 1, 'Inappropriate content', 'pending', '2026-05-27 10:00:00'],
    [$adminId, 'social_post', 3, 'Suspicious account activity', 'pending', '2026-05-27 14:00:00'],
    [$mariaId, 'forum_reply', 5, 'Spam messages', 'dismissed', '2026-05-25 09:00:00'],
    [$juanId,  'forum_topic', 2, 'Fake review submitted', 'action_taken', '2026-05-24 16:00:00'],
];
foreach ($reports as $r) { $reportStmt->execute($r); }
echo "  ✓ content reports (flagged)\n";

// ============================================================
// DONE
// ============================================================
echo "====================================\n";
echo " Database seeding completed successfully!\n";
echo "====================================\n";
echo " Users created: " . count($users) . "\n";
echo " Programs created: " . count($programs) . "\n";
echo " Sessions created: " . (count($sessionsData) + count($futureSessions)) . "\n";
echo " Participants registered: " . count($participants) . "\n";
echo " Nutrition logs: " . count($nutritionData) . "\n";
echo " Body metric records: " . count($metricsData) . "\n";
echo " Activities: " . count($activities) . "\n";
echo " Support tickets: " . count($tickets) . "\n";
echo " Reviews: " . count($reviews) . "\n";
echo " Articles: " . count($articles) . "\n";
echo " Media assets: " . count($mediaAssets) . "\n";
echo " Audit log entries: " . count($auditLogs) . "\n";
echo "====================================\n";
echo "\nAll passwords: Prueba123xd\n";
