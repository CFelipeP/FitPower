-- FitPower Database Dump
-- Generated: 2026-06-19 03:23:43

CREATE DATABASE IF NOT EXISTS fitpower CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fitpower;

CREATE TABLE `achievements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requirement` int unsigned NOT NULL DEFAULT '0',
  `points` int unsigned NOT NULL DEFAULT '0',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `achievements` (`id`, `slug`, `label`, `description`, `type`, `requirement`, `points`, `icon`, `sort_order`) VALUES ('1', '7-day-streak', '7-Day Streak', NULL, 'streak', '7', '50', 'Zap', '1');
INSERT INTO `achievements` (`id`, `slug`, `label`, `description`, `type`, `requirement`, `points`, `icon`, `sort_order`) VALUES ('2', 'first-pr', 'First PR', NULL, 'workouts', '1', '30', 'Trophy', '2');
INSERT INTO `achievements` (`id`, `slug`, `label`, `description`, `type`, `requirement`, `points`, `icon`, `sort_order`) VALUES ('3', '50-workouts', '50 Workouts', NULL, 'workouts', '50', '100', 'Dumbbell', '3');
INSERT INTO `achievements` (`id`, `slug`, `label`, `description`, `type`, `requirement`, `points`, `icon`, `sort_order`) VALUES ('4', '5k-calories', '5K Calories', NULL, 'calories', '5000', '80', 'Flame', '4');
INSERT INTO `achievements` (`id`, `slug`, `label`, `description`, `type`, `requirement`, `points`, `icon`, `sort_order`) VALUES ('5', '30-day-challenge', '30 Day Challenge', NULL, 'streak', '30', '200', 'Calendar', '5');
INSERT INTO `achievements` (`id`, `slug`, `label`, `description`, `type`, `requirement`, `points`, `icon`, `sort_order`) VALUES ('6', 'consistency-king', 'Consistency King', NULL, 'points', '1000', '150', 'Award', '6');
INSERT INTO `achievements` (`id`, `slug`, `label`, `description`, `type`, `requirement`, `points`, `icon`, `sort_order`) VALUES ('7', 'community-hero', 'Community Hero', NULL, 'social', '10', '100', 'Users', '7');
INSERT INTO `achievements` (`id`, `slug`, `label`, `description`, `type`, `requirement`, `points`, `icon`, `sort_order`) VALUES ('8', 'master', 'Master', NULL, 'points', '5000', '500', 'Crown', '8');

CREATE TABLE `activities` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `trainer_id` int unsigned DEFAULT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `badge_text` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `badge_class` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `trainer_id` (`trainer_id`),
  KEY `idx_type` (`type`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `activities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `activities_ibfk_2` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('1', '1', '1', 'workout', 'Completed HIIT Inferno session', 'Dumbbell', '#10b981', 'Done', 'bg-success', '2026-05-27 07:45:00');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('2', '1', NULL, 'progress', 'New body measurement recorded', 'Activity', '#3b82f6', 'New', 'bg-primary', '2026-05-28 08:00:00');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('3', '2', NULL, 'session', 'Created new HIIT Inferno session', 'Calendar', '#8b5cf6', 'New', 'bg-primary', '2026-05-27 09:00:00');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('4', '3', '1', 'workout', 'Completed Total Strength workout', 'Dumbbell', '#10b981', 'Done', 'bg-success', '2026-05-27 10:00:00');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('5', '3', NULL, 'achievement', 'Unlocked 7-Day Streak achievement', 'Trophy', '#f59e0b', 'New', 'bg-warning', '2026-05-20 07:00:00');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('6', '3', NULL, 'nutrition', 'Logged today\'s meals', 'Apple', '#ef4444', 'Log', 'bg-info', '2026-05-28 12:00:00');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('7', '4', '1', 'workout', 'Completed Upper Body Power session', 'Dumbbell', '#10b981', 'Done', 'bg-success', '2026-05-27 11:50:00');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('8', '4', NULL, 'subscription', 'Upgraded to Pro plan', 'CreditCard', '#8b5cf6', 'Pro', 'bg-primary', '2026-05-15 14:00:00');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('9', '5', '1', 'workout', 'Completed Yoga Flow session', 'Heart', '#ec4899', 'Done', 'bg-success', '2026-05-27 06:45:00');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('10', '5', NULL, 'milestone', 'First week of training completed', 'Award', '#f59e0b', 'Week 1', 'bg-warning', '2026-05-28 06:45:00');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('11', NULL, NULL, 'signup', 'Bienvenido a FitPower', 'UserPlus', '#10b981', 'New', 'bg-success', '2026-06-18 17:02:51');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('12', NULL, NULL, 'signup', 'Bienvenido a FitPower', 'UserPlus', '#10b981', 'New', 'bg-success', '2026-06-18 17:05:55');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('13', NULL, NULL, 'checkin', 'Check-in del día completado', 'Heart', '#ec4899', 'Done', 'bg-success', '2026-06-18 17:05:55');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('14', NULL, NULL, 'checkin', 'Check-in del día completado', 'Heart', '#ec4899', 'Done', 'bg-success', '2026-06-18 17:05:55');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('15', NULL, NULL, 'signup', 'Bienvenido a FitPower', 'UserPlus', '#10b981', 'New', 'bg-success', '2026-06-18 19:43:12');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('16', '6', NULL, 'checkin', 'Check-in del día completado', 'Heart', '#ec4899', 'Done', 'bg-success', '2026-06-18 21:01:25');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('17', '6', NULL, 'checkin', 'Check-in del día completado', 'Heart', '#ec4899', 'Done', 'bg-success', '2026-06-18 21:01:33');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('18', '6', NULL, 'checkin', 'Check-in del día completado', 'Heart', '#ec4899', 'Done', 'bg-success', '2026-06-18 21:01:35');
INSERT INTO `activities` (`id`, `user_id`, `trainer_id`, `type`, `description`, `icon`, `icon_color`, `badge_text`, `badge_class`, `created_at`) VALUES ('19', '6', NULL, 'checkin', 'Check-in del día completado', 'Heart', '#ec4899', 'Done', 'bg-success', '2026-06-18 21:01:40');

CREATE TABLE `admin_audit_log` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` int unsigned NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` int unsigned NOT NULL,
  `details` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin` (`admin_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `fk_audit_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `articles` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `author_id` int unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `excerpt` text COLLATE utf8mb4_unicode_ci,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `cover_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `status` enum('draft','published','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `author_id` (`author_id`),
  KEY `idx_status` (`status`),
  KEY `idx_slug` (`slug`),
  KEY `idx_published` (`published_at`),
  CONSTRAINT `articles_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `body_metrics` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `log_date` date NOT NULL,
  `weight_kg` decimal(5,1) DEFAULT NULL,
  `body_fat_pct` decimal(4,1) DEFAULT NULL,
  `muscle_kg` decimal(5,1) DEFAULT NULL,
  `bmi` decimal(4,1) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`,`log_date`),
  CONSTRAINT `body_metrics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `body_metrics` (`id`, `user_id`, `log_date`, `weight_kg`, `body_fat_pct`, `muscle_kg`, `bmi`, `created_at`) VALUES ('1', '3', '2026-04-28', '72.0', '28.0', '28.5', '25.0', '2026-06-05 08:53:01');
INSERT INTO `body_metrics` (`id`, `user_id`, `log_date`, `weight_kg`, `body_fat_pct`, `muscle_kg`, `bmi`, `created_at`) VALUES ('2', '3', '2026-05-15', '71.2', '27.5', '29.0', '24.7', '2026-06-05 08:53:01');
INSERT INTO `body_metrics` (`id`, `user_id`, `log_date`, `weight_kg`, `body_fat_pct`, `muscle_kg`, `bmi`, `created_at`) VALUES ('3', '3', '2026-06-05', '70.5', '27.0', '29.2', '24.5', '2026-06-05 08:53:01');
INSERT INTO `body_metrics` (`id`, `user_id`, `log_date`, `weight_kg`, `body_fat_pct`, `muscle_kg`, `bmi`, `created_at`) VALUES ('4', '4', '2026-04-28', '85.0', '22.0', '38.0', '27.0', '2026-06-05 08:53:01');
INSERT INTO `body_metrics` (`id`, `user_id`, `log_date`, `weight_kg`, `body_fat_pct`, `muscle_kg`, `bmi`, `created_at`) VALUES ('5', '4', '2026-05-15', '84.2', '21.5', '38.5', '26.8', '2026-06-05 08:53:01');
INSERT INTO `body_metrics` (`id`, `user_id`, `log_date`, `weight_kg`, `body_fat_pct`, `muscle_kg`, `bmi`, `created_at`) VALUES ('6', '4', '2026-06-05', '83.5', '21.0', '39.0', '26.5', '2026-06-05 08:53:01');
INSERT INTO `body_metrics` (`id`, `user_id`, `log_date`, `weight_kg`, `body_fat_pct`, `muscle_kg`, `bmi`, `created_at`) VALUES ('7', '5', '2026-04-28', '65.0', '30.0', '24.0', '23.5', '2026-06-05 08:53:01');
INSERT INTO `body_metrics` (`id`, `user_id`, `log_date`, `weight_kg`, `body_fat_pct`, `muscle_kg`, `bmi`, `created_at`) VALUES ('8', '5', '2026-05-15', '64.5', '29.5', '24.3', '23.3', '2026-06-05 08:53:01');
INSERT INTO `body_metrics` (`id`, `user_id`, `log_date`, `weight_kg`, `body_fat_pct`, `muscle_kg`, `bmi`, `created_at`) VALUES ('9', '5', '2026-06-05', '64.0', '29.0', '24.5', '23.1', '2026-06-05 08:53:01');
INSERT INTO `body_metrics` (`id`, `user_id`, `log_date`, `weight_kg`, `body_fat_pct`, `muscle_kg`, `bmi`, `created_at`) VALUES ('10', '1', '2026-04-28', '78.0', '18.0', '42.0', '23.8', '2026-06-05 08:53:01');
INSERT INTO `body_metrics` (`id`, `user_id`, `log_date`, `weight_kg`, `body_fat_pct`, `muscle_kg`, `bmi`, `created_at`) VALUES ('11', '1', '2026-06-05', '77.2', '17.5', '42.5', '23.5', '2026-06-05 08:53:01');

CREATE TABLE `certifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `certifications` (`id`, `slug`, `name`) VALUES ('1', 'nasm-cpt', 'NASM CPT');
INSERT INTO `certifications` (`id`, `slug`, `name`) VALUES ('2', 'ace-cpt', 'ACE CPT');
INSERT INTO `certifications` (`id`, `slug`, `name`) VALUES ('3', 'nsca-cscs', 'NSCA CSCS');
INSERT INTO `certifications` (`id`, `slug`, `name`) VALUES ('4', 'issa-cpt', 'ISSA CPT');
INSERT INTO `certifications` (`id`, `slug`, `name`) VALUES ('5', 'acf-l1', 'ACF Level 1');
INSERT INTO `certifications` (`id`, `slug`, `name`) VALUES ('6', 'crossfit-l2', 'CrossFit Level 2');
INSERT INTO `certifications` (`id`, `slug`, `name`) VALUES ('7', 'precision-nutrition', 'Precision Nutrition');
INSERT INTO `certifications` (`id`, `slug`, `name`) VALUES ('8', 'other', 'Other');

CREATE TABLE `challenge_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `challenge_id` int NOT NULL,
  `user_id` int unsigned NOT NULL,
  `progress` int DEFAULT '0',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_participant` (`challenge_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `challenge_participants_ibfk_1` FOREIGN KEY (`challenge_id`) REFERENCES `challenges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `challenge_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `challenges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` enum('strength','cardio','nutrition','mindset','habit') COLLATE utf8mb4_unicode_ci DEFAULT 'strength',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `goal_type` enum('reps','minutes','days','distance','weight','custom') COLLATE utf8mb4_unicode_ci DEFAULT 'reps',
  `goal_value` int DEFAULT '0',
  `reward` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `max_participants` int DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT '0',
  `status` enum('active','upcoming','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'upcoming',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `challenges_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `client_goals` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `target_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `current_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'reps',
  `start_date` date NOT NULL,
  `target_date` date DEFAULT NULL,
  `status` enum('active','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `client_goals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `coach_availability` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `trainer_id` int unsigned NOT NULL,
  `day_of_week` tinyint unsigned NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_slot` (`trainer_id`,`day_of_week`,`start_time`),
  KEY `idx_day` (`day_of_week`),
  CONSTRAINT `fk_avail_trainer` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contact_messages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` enum('planes','tecnico','coach','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conversations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `participant_one` int unsigned NOT NULL,
  `participant_two` int unsigned NOT NULL,
  `last_message` text COLLATE utf8mb4_unicode_ci,
  `last_message_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `participant_one` (`participant_one`),
  KEY `participant_two` (`participant_two`),
  CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`participant_one`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`participant_two`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `conversations` (`id`, `participant_one`, `participant_two`, `last_message`, `last_message_at`, `created_at`) VALUES ('1', '2', '3', 'a', '2026-06-06 17:26:05', '2026-06-05 09:15:29');
INSERT INTO `conversations` (`id`, `participant_one`, `participant_two`, `last_message`, `last_message_at`, `created_at`) VALUES ('2', '2', '4', 'Pero has como no se, tenido unos problemas de rendimiento', '2026-06-12 01:31:47', '2026-06-10 14:12:12');
INSERT INTO `conversations` (`id`, `participant_one`, `participant_two`, `last_message`, `last_message_at`, `created_at`) VALUES ('3', '2', '1', NULL, NULL, '2026-06-12 01:14:55');
INSERT INTO `conversations` (`id`, `participant_one`, `participant_two`, `last_message`, `last_message_at`, `created_at`) VALUES ('5', '2', '6', 'ok', '2026-06-18 21:09:11', '2026-06-18 21:05:34');

CREATE TABLE `coupons` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_pct` decimal(5,2) DEFAULT NULL,
  `discount_amount` decimal(10,2) DEFAULT NULL,
  `plan_id` int unsigned DEFAULT NULL,
  `max_uses` int unsigned DEFAULT NULL,
  `current_uses` int unsigned NOT NULL DEFAULT '0',
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `fk_coupon_plan` (`plan_id`),
  KEY `idx_code` (`code`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `fk_coupon_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `daily_checkins` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `checkin_date` date NOT NULL,
  `energy_level` tinyint unsigned DEFAULT NULL,
  `mood` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sleep_hours` decimal(3,1) DEFAULT NULL,
  `water_intake` tinyint unsigned DEFAULT NULL,
  `meals_completed` tinyint unsigned DEFAULT NULL,
  `workout_completed` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`,`checkin_date`),
  CONSTRAINT `daily_checkins_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `daily_checkins` (`id`, `user_id`, `checkin_date`, `energy_level`, `mood`, `sleep_hours`, `water_intake`, `meals_completed`, `workout_completed`, `notes`, `created_at`, `updated_at`) VALUES ('1', '6', '2026-06-18', '10', 'okay', '7.0', NULL, NULL, '0', 'Bad', '2026-06-18 16:50:12', '2026-06-18 21:01:35');

CREATE TABLE `exercise_library` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `muscle_group` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `video_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `difficulty` enum('beginner','intermediate','advanced') COLLATE utf8mb4_unicode_ci DEFAULT 'beginner',
  `equipment` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instructions` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `calories_burned` decimal(6,2) DEFAULT NULL COMMENT 'Estimated calories burned per set',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('1', 'Dumbbell Bench Press', 'chest', 'pectorals', 'Dumbbell bench press for chest', '', '', 'intermediate', 'dumbbell', 'Lie on flat bench, press dumbbells up from chest', '2026-06-06 15:52:45', '4.50');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('2', 'Goblet Squat', 'legs', 'quadriceps', 'Goblet squat for leg strength', '', '', 'beginner', 'dumbbell', 'Hold dumbbell at chest, squat down keeping torso upright', '2026-06-06 15:52:45', '4.00');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('3', 'Dumbbell Row', 'back', 'lats', 'Single arm dumbbell row for back', '', '', 'intermediate', 'dumbbell', 'Hinge at hip, row dumbbell to hip keeping back straight', '2026-06-06 15:52:45', '4.00');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('4', 'Bench Press', 'chest', 'pectorals', 'Barbell bench press for chest', NULL, NULL, 'intermediate', 'barbell', 'Lie on bench, lower bar to chest, press up', '2026-06-18 19:44:30', '5.00');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('5', 'Push Up', 'chest', 'pectorals', 'Bodyweight chest exercise', NULL, NULL, 'beginner', 'bodyweight', 'Keep body straight, lower chest to ground', '2026-06-18 19:44:30', '3.50');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('6', 'Incline Dumbbell Press', 'chest', 'upper chest', 'Dumbbell press on incline bench', NULL, NULL, 'intermediate', 'dumbbell', 'Press dumbbells up from chest level', '2026-06-18 19:44:30', '4.50');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('7', 'Deadlift', 'back', 'full back', 'Full body compound lift', NULL, NULL, 'advanced', 'barbell', 'Hip hinge, pull bar up along legs', '2026-06-18 19:44:30', '6.00');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('8', 'Pull Up', 'back', 'lats', 'Bodyweight back exercise', NULL, NULL, 'intermediate', 'bodyweight', 'Pull chin over bar with controlled motion', '2026-06-18 19:44:30', '4.00');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('9', 'Barbell Row', 'back', 'mid back', 'Bent over row for back', NULL, NULL, 'intermediate', 'barbell', 'Row bar to lower chest with straight back', '2026-06-18 19:44:30', '5.00');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('10', 'Squat', 'legs', 'quadriceps', 'Barbell squat for legs', NULL, NULL, 'intermediate', 'barbell', 'Lower hips below parallel, keep chest up', '2026-06-18 19:44:30', '5.50');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('11', 'Leg Press', 'legs', 'quadriceps', 'Machine leg press', NULL, NULL, 'beginner', 'machine', 'Push platform away with legs', '2026-06-18 19:44:30', '3.50');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('12', 'Romanian Deadlift', 'legs', 'hamstrings', 'Hamstring focused deadlift', NULL, NULL, 'intermediate', 'dumbbell', 'Hinge at hips, keep legs slightly bent', '2026-06-18 19:44:30', '4.50');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('13', 'Overhead Press', 'shoulders', 'deltoids', 'Barbell shoulder press', NULL, NULL, 'intermediate', 'barbell', 'Press bar overhead from shoulders', '2026-06-18 19:44:30', '4.50');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('14', 'Lateral Raise', 'shoulders', 'side delts', 'Dumbbell lateral raise', NULL, NULL, 'beginner', 'dumbbell', 'Raise dumbbells to sides to shoulder height', '2026-06-18 19:44:30', '2.50');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('15', 'Face Pull', 'shoulders', 'rear delts', 'Cable face pull for rear delts', NULL, NULL, 'beginner', 'cable', 'Pull cable rope toward face', '2026-06-18 19:44:30', '3.00');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('16', 'Bicep Curl', 'arms', 'biceps', 'Dumbbell bicep curl', NULL, NULL, 'beginner', 'dumbbell', 'Curl dumbbells toward shoulders', '2026-06-18 19:44:30', '2.50');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('17', 'Tricep Pushdown', 'arms', 'triceps', 'Cable tricep pushdown', NULL, NULL, 'beginner', 'cable', 'Push cable down extending arms fully', '2026-06-18 19:44:30', '2.50');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('18', 'Plank', 'core', 'abs', 'Core stability exercise', NULL, NULL, 'beginner', 'bodyweight', 'Hold straight body position on forearms', '2026-06-18 19:44:30', '2.00');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('19', 'Russian Twist', 'core', 'obliques', 'Oblique rotation exercise', NULL, NULL, 'beginner', 'bodyweight', 'Rotate torso side to side with feet raised', '2026-06-18 19:44:30', '3.00');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('20', 'Running', 'cardio', 'full body', 'Cardio running', NULL, NULL, 'beginner', 'none', 'Run at steady or interval pace', '2026-06-18 19:44:30', '7.00');
INSERT INTO `exercise_library` (`id`, `name`, `category`, `muscle_group`, `description`, `image_url`, `video_url`, `difficulty`, `equipment`, `instructions`, `created_at`, `calories_burned`) VALUES ('21', 'Jump Rope', 'cardio', 'full body', 'Jump rope cardio', NULL, NULL, 'beginner', 'jump rope', 'Jump rope at moderate pace', '2026-06-18 19:44:30', '8.00');

CREATE TABLE `exercises` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `session_id` int unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sets` tinyint unsigned DEFAULT NULL,
  `reps` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weight` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `sort_order` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  CONSTRAINT `exercises_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `followers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `follower_id` int unsigned NOT NULL,
  `following_id` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_follow` (`follower_id`,`following_id`),
  KEY `following_id` (`following_id`),
  CONSTRAINT `followers_ibfk_1` FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `followers_ibfk_2` FOREIGN KEY (`following_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `forum_likes` (
  `user_id` int unsigned NOT NULL,
  `reply_id` int unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`reply_id`),
  KEY `reply_id` (`reply_id`),
  CONSTRAINT `forum_likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_likes_ibfk_2` FOREIGN KEY (`reply_id`) REFERENCES `forum_replies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `forum_replies` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `topic_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_solution` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_topic` (`topic_id`),
  CONSTRAINT `forum_replies_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `forum_topics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_replies_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `forum_topics` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `views` int unsigned NOT NULL DEFAULT '0',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('active','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `forum_topics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `goal_milestones` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `goal_id` int unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_value` decimal(10,2) NOT NULL DEFAULT '1.00',
  `current_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'reps',
  `order_index` int unsigned NOT NULL DEFAULT '0',
  `achieved` tinyint(1) DEFAULT '0',
  `achieved_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `goal_id` (`goal_id`),
  CONSTRAINT `goal_milestones_ibfk_1` FOREIGN KEY (`goal_id`) REFERENCES `client_goals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `languages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `languages` (`id`, `name`) VALUES ('5', 'Deutsch');
INSERT INTO `languages` (`id`, `name`) VALUES ('1', 'English');
INSERT INTO `languages` (`id`, `name`) VALUES ('2', 'Español');
INSERT INTO `languages` (`id`, `name`) VALUES ('4', 'Français');
INSERT INTO `languages` (`id`, `name`) VALUES ('6', 'Italiano');
INSERT INTO `languages` (`id`, `name`) VALUES ('3', 'Português');
INSERT INTO `languages` (`id`, `name`) VALUES ('9', 'العربية');
INSERT INTO `languages` (`id`, `name`) VALUES ('10', 'हिन्दी');
INSERT INTO `languages` (`id`, `name`) VALUES ('8', '中文');
INSERT INTO `languages` (`id`, `name`) VALUES ('7', '日本語');

CREATE TABLE `leaderboard_entries` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `total_points` int unsigned NOT NULL DEFAULT '0',
  `workouts_completed` int unsigned NOT NULL DEFAULT '0',
  `streak_days` int unsigned NOT NULL DEFAULT '0',
  `total_calories_burned` int unsigned NOT NULL DEFAULT '0',
  `sessions_attended` int unsigned NOT NULL DEFAULT '0',
  `reviews_written` int unsigned NOT NULL DEFAULT '0',
  `forum_posts` int unsigned NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `leaderboard_entries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `leaderboard_entries` (`id`, `user_id`, `total_points`, `workouts_completed`, `streak_days`, `total_calories_burned`, `sessions_attended`, `reviews_written`, `forum_posts`, `updated_at`) VALUES ('4', '6', '20', '0', '4', '0', '0', '0', '0', '2026-06-18 21:01:40');

CREATE TABLE `login_throttle` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `identifier` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` int unsigned NOT NULL DEFAULT '1',
  `locked_until` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `identifier` (`identifier`),
  KEY `idx_identifier` (`identifier`),
  KEY `idx_locked` (`locked_until`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `login_throttle` (`id`, `identifier`, `attempts`, `locked_until`, `created_at`) VALUES ('1', '244d52d8dae6eee1b132a1032c93f7ec95480fda14caac8e2c172492d7d6b54f', '1', NULL, '2026-06-18 17:02:32');
INSERT INTO `login_throttle` (`id`, `identifier`, `attempts`, `locked_until`, `created_at`) VALUES ('2', '362d2c507748605173f8c5251186d1bd240bb6a405f08e3bd39949b5adda0a1a', '1', NULL, '2026-06-18 19:43:01');
INSERT INTO `login_throttle` (`id`, `identifier`, `attempts`, `locked_until`, `created_at`) VALUES ('3', '6346c521d521776cd4c6bb1b8dcd5515aaf398b19836bc9331685c482df288dc', '1', NULL, '2026-06-18 20:25:26');
INSERT INTO `login_throttle` (`id`, `identifier`, `attempts`, `locked_until`, `created_at`) VALUES ('4', '99ff74f212d145f30897b00ce660ae635da887f98776ae21b8901f57874c34a4', '1', NULL, '2026-06-18 20:45:28');

CREATE TABLE `messages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` int unsigned NOT NULL,
  `sender_id` int unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `conversation_id` (`conversation_id`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('1', '1', '2', 'Hola maria', '2026-06-05 09:15:34');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('2', '1', '3', 'Hola Alex', '2026-06-05 09:16:13');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('3', '1', '2', 'Que tal? veo que estas un poco mal de forma', '2026-06-05 09:17:17');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('4', '1', '3', 'no he comido we xd', '2026-06-05 09:17:24');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('5', '1', '2', 'xd', '2026-06-06 15:57:47');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('6', '1', '3', 'hola', '2026-06-06 17:24:16');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('7', '1', '2', 'a', '2026-06-06 17:26:05');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('8', '2', '4', 'Hola', '2026-06-12 01:19:30');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('9', '2', '2', 'Hola como estas?', '2026-06-12 01:31:02');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('10', '2', '4', 'Bien la verdad, pues he estado entrenando', '2026-06-12 01:31:16');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('11', '2', '2', 'Si, he notado eso💪', '2026-06-12 01:31:30');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('12', '2', '2', 'Pero has como no se, tenido unos problemas de rendimiento', '2026-06-12 01:31:47');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('13', '5', '2', 'Hola', '2026-06-18 21:08:12');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('14', '5', '6', 'Hola coach', '2026-06-18 21:08:26');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('15', '5', '2', 'Como haz estado?', '2026-06-18 21:08:39');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('16', '5', '6', 'Pues la verdad biuen', '2026-06-18 21:08:46');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('17', '5', '2', 'Solicito una reunion urgente en live seccion', '2026-06-18 21:09:05');
INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`) VALUES ('18', '5', '6', 'ok', '2026-06-18 21:09:11');

CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int unsigned NOT NULL DEFAULT '1',
  `executed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `migration` (`migration`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('1', '002_add_settings_to_users.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('2', '003_add_rpe_to_sessions.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('3', '004_add_video_url_to_exercises.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('4', '005_add_stripe_customer_id.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('5', '006_add_reminded_to_participants.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('6', '006_add_ticket_admin_fields.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('7', '007_add_followers_table.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('8', '010_create_refresh_tokens.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('9', '011_create_login_throttle.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('10', '012_create_video_sessions.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('11', '013_fix_achievements_schema.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('12', '014_create_admin_audit_log.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('13', '015_add_token_version.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('14', '016_create_workout_logs.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('15', '017_create_coach_availability.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('16', '018_create_coupons.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('17', '019_add_trial_to_subscriptions.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('18', '020_create_migrations_table.sql', '1', '2026-06-12 02:26:37');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('19', '038_calories_burned.sql', '99', '2026-06-18 19:37:45');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('20', '039_user_nutrition_settings.sql', '99', '2026-06-18 19:37:45');
INSERT INTO `migrations` (`id`, `migration`, `batch`, `executed_at`) VALUES ('21', '040_nutrition_history_index.sql', '99', '2026-06-18 19:37:45');

CREATE TABLE `notifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`,`is_read`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `nutrition_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `log_date` date NOT NULL,
  `calories_target` int unsigned NOT NULL DEFAULT '1940',
  `calories_consumed` int unsigned NOT NULL DEFAULT '0',
  `protein_current` decimal(6,1) NOT NULL DEFAULT '0.0',
  `protein_target` decimal(6,1) NOT NULL DEFAULT '150.0',
  `carbs_current` decimal(6,1) NOT NULL DEFAULT '0.0',
  `carbs_target` decimal(6,1) NOT NULL DEFAULT '220.0',
  `fat_current` decimal(6,1) NOT NULL DEFAULT '0.0',
  `fat_target` decimal(6,1) NOT NULL DEFAULT '65.0',
  `water_glasses` tinyint unsigned NOT NULL DEFAULT '0',
  `breakfast_checked` tinyint(1) NOT NULL DEFAULT '0',
  `lunch_checked` tinyint(1) NOT NULL DEFAULT '0',
  `dinner_checked` tinyint(1) NOT NULL DEFAULT '0',
  `snack_checked` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`,`log_date`),
  KEY `idx_user_date_history` (`user_id`,`log_date`),
  CONSTRAINT `nutrition_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `nutrition_logs` (`id`, `user_id`, `log_date`, `calories_target`, `calories_consumed`, `protein_current`, `protein_target`, `carbs_current`, `carbs_target`, `fat_current`, `fat_target`, `water_glasses`, `breakfast_checked`, `lunch_checked`, `dinner_checked`, `snack_checked`, `created_at`, `updated_at`) VALUES ('1', '3', '2026-06-05', '1800', '1650', '120.5', '150.0', '180.0', '200.0', '55.0', '60.0', '6', '1', '1', '1', '0', '2026-06-05 08:53:01', '2026-06-05 08:53:01');
INSERT INTO `nutrition_logs` (`id`, `user_id`, `log_date`, `calories_target`, `calories_consumed`, `protein_current`, `protein_target`, `carbs_current`, `carbs_target`, `fat_current`, `fat_target`, `water_glasses`, `breakfast_checked`, `lunch_checked`, `dinner_checked`, `snack_checked`, `created_at`, `updated_at`) VALUES ('2', '4', '2026-06-05', '2500', '2300', '180.0', '200.0', '250.0', '280.0', '70.0', '80.0', '5', '1', '1', '1', '1', '2026-06-05 08:53:01', '2026-06-05 08:53:01');
INSERT INTO `nutrition_logs` (`id`, `user_id`, `log_date`, `calories_target`, `calories_consumed`, `protein_current`, `protein_target`, `carbs_current`, `carbs_target`, `fat_current`, `fat_target`, `water_glasses`, `breakfast_checked`, `lunch_checked`, `dinner_checked`, `snack_checked`, `created_at`, `updated_at`) VALUES ('3', '5', '2026-06-05', '1700', '1200', '85.0', '120.0', '130.0', '180.0', '40.0', '55.0', '4', '1', '1', '0', '0', '2026-06-05 08:53:01', '2026-06-05 08:53:01');
INSERT INTO `nutrition_logs` (`id`, `user_id`, `log_date`, `calories_target`, `calories_consumed`, `protein_current`, `protein_target`, `carbs_current`, `carbs_target`, `fat_current`, `fat_target`, `water_glasses`, `breakfast_checked`, `lunch_checked`, `dinner_checked`, `snack_checked`, `created_at`, `updated_at`) VALUES ('4', '1', '2026-06-05', '2000', '1900', '130.0', '160.0', '210.0', '230.0', '60.0', '65.0', '7', '1', '1', '1', '1', '2026-06-05 08:53:01', '2026-06-05 08:53:01');
INSERT INTO `nutrition_logs` (`id`, `user_id`, `log_date`, `calories_target`, `calories_consumed`, `protein_current`, `protein_target`, `carbs_current`, `carbs_target`, `fat_current`, `fat_target`, `water_glasses`, `breakfast_checked`, `lunch_checked`, `dinner_checked`, `snack_checked`, `created_at`, `updated_at`) VALUES ('5', '3', '2026-06-06', '1940', '0', '0.0', '150.0', '0.0', '220.0', '0.0', '65.0', '8', '0', '0', '0', '0', '2026-06-06 19:34:51', '2026-06-06 19:34:51');
INSERT INTO `nutrition_logs` (`id`, `user_id`, `log_date`, `calories_target`, `calories_consumed`, `protein_current`, `protein_target`, `carbs_current`, `carbs_target`, `fat_current`, `fat_target`, `water_glasses`, `breakfast_checked`, `lunch_checked`, `dinner_checked`, `snack_checked`, `created_at`, `updated_at`) VALUES ('7', '6', '2026-06-18', '1940', '0', '0.0', '150.0', '0.0', '220.0', '0.0', '65.0', '8', '1', '0', '0', '0', '2026-06-18 17:09:20', '2026-06-18 17:09:39');
INSERT INTO `nutrition_logs` (`id`, `user_id`, `log_date`, `calories_target`, `calories_consumed`, `protein_current`, `protein_target`, `carbs_current`, `carbs_target`, `fat_current`, `fat_target`, `water_glasses`, `breakfast_checked`, `lunch_checked`, `dinner_checked`, `snack_checked`, `created_at`, `updated_at`) VALUES ('10', '6', '2026-06-19', '1940', '0', '0.0', '150.0', '0.0', '220.0', '0.0', '65.0', '1', '0', '0', '0', '0', '2026-06-18 20:50:17', '2026-06-18 21:01:20');

CREATE TABLE `password_resets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `subscription_id` int unsigned DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('subscription','coaching','product') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'subscription',
  `status` enum('pending','completed','failed','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `subscription_id` (`subscription_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`subscription_id`) REFERENCES `user_subscriptions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `plan_features` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `plan_id` int unsigned NOT NULL,
  `text` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `included` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` tinyint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `plan_features_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('1', '1', 'Workout tracker', '1', '1');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('2', '1', 'Basic progress reports', '1', '2');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('3', '1', 'Email support', '1', '3');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('4', '1', 'Live coaching sessions', '0', '4');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('5', '1', 'Nutrition plans', '0', '5');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('6', '2', 'Everything in Starter', '1', '1');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('7', '2', 'Unlimited live coaching', '1', '2');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('8', '2', 'AI-powered programming', '1', '3');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('9', '2', 'Custom nutrition plans', '1', '4');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('10', '2', 'Priority support', '1', '5');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('11', '3', 'Everything in Pro', '1', '1');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('12', '3', '1-on-1 personal coaching', '1', '2');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('13', '3', 'Premium nutrition prescription', '1', '3');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('14', '3', 'Body composition analysis', '1', '4');
INSERT INTO `plan_features` (`id`, `plan_id`, `text`, `included`, `sort_order`) VALUES ('15', '3', 'Early access to new features', '1', '5');

CREATE TABLE `program_reviews` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `program_id` int unsigned NOT NULL,
  `rating` tinyint unsigned NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_program` (`user_id`,`program_id`),
  KEY `program_id` (`program_id`),
  CONSTRAINT `program_reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `program_reviews_ibfk_2` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `program_reviews_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `programs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `trainer_id` int unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `tag` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_minutes` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weeks` tinyint unsigned DEFAULT NULL,
  `sessions_per_week` tinyint unsigned DEFAULT NULL,
  `difficulty` enum('beginner','intermediate','advanced') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avg_rating` decimal(2,1) NOT NULL DEFAULT '0.0',
  `enrollments` int unsigned NOT NULL DEFAULT '0',
  `status` enum('active','draft','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `trainer_id` (`trainer_id`),
  CONSTRAINT `programs_ibfk_1` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `programs` (`id`, `trainer_id`, `name`, `description`, `tag`, `duration_minutes`, `weeks`, `sessions_per_week`, `difficulty`, `image`, `avg_rating`, `enrollments`, `status`, `created_at`, `updated_at`) VALUES ('1', '1', 'HIIT Inferno', 'High-intensity interval training designed to torch calories and boost cardiovascular endurance.', 'High Intensity', '35', '8', '4', 'intermediate', 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=600&h=450&fit=crop', '0.0', '3', 'active', '2026-06-10 13:32:50', '2026-06-18 21:04:09');
INSERT INTO `programs` (`id`, `trainer_id`, `name`, `description`, `tag`, `duration_minutes`, `weeks`, `sessions_per_week`, `difficulty`, `image`, `avg_rating`, `enrollments`, `status`, `created_at`, `updated_at`) VALUES ('2', '1', 'Total Strength', 'Full-body strength training program focusing on compound lifts and progressive overload.', 'Strength', '50', '12', '4', 'intermediate', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&h=450&fit=crop', '0.0', '1', 'active', '2026-06-10 13:32:50', '2026-06-10 14:48:13');
INSERT INTO `programs` (`id`, `trainer_id`, `name`, `description`, `tag`, `duration_minutes`, `weeks`, `sessions_per_week`, `difficulty`, `image`, `avg_rating`, `enrollments`, `status`, `created_at`, `updated_at`) VALUES ('3', '1', 'Upper Body Power', 'Targeted upper body program to build strength and definition in chest, back, and arms.', 'Upper Body', '45', '8', '3', 'intermediate', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=450&fit=crop', '0.0', '0', 'active', '2026-06-10 13:32:50', '2026-06-10 14:48:13');
INSERT INTO `programs` (`id`, `trainer_id`, `name`, `description`, `tag`, `duration_minutes`, `weeks`, `sessions_per_week`, `difficulty`, `image`, `avg_rating`, `enrollments`, `status`, `created_at`, `updated_at`) VALUES ('4', '1', 'Yoga Flow', 'Relaxing yoga flow for flexibility, mobility, and mental wellness, suitable for all levels.', 'Mobility', '40', '6', '4', 'beginner', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=450&fit=crop', '0.0', '1', 'active', '2026-06-10 13:32:50', '2026-06-10 14:45:54');
INSERT INTO `programs` (`id`, `trainer_id`, `name`, `description`, `tag`, `duration_minutes`, `weeks`, `sessions_per_week`, `difficulty`, `image`, `avg_rating`, `enrollments`, `status`, `created_at`, `updated_at`) VALUES ('5', '1', 'Cardio Core Blast', 'Dynamic cardio and core program to build endurance and strengthen your midsection.', 'Cardio', '30', '6', '5', 'beginner', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=450&fit=crop', '0.0', '0', 'active', '2026-06-10 13:32:50', '2026-06-10 14:45:27');
INSERT INTO `programs` (`id`, `trainer_id`, `name`, `description`, `tag`, `duration_minutes`, `weeks`, `sessions_per_week`, `difficulty`, `image`, `avg_rating`, `enrollments`, `status`, `created_at`, `updated_at`) VALUES ('6', '1', 'Power & Plyo', 'Explosive plyometric training combined with powerlifting for athletic performance.', 'Plyometrics', '45', '10', '4', 'advanced', 'https://images.unsplash.com/photo-1599058918144-1ffabb6ab9a0?w=600&h=450&fit=crop', '0.0', '0', 'active', '2026-06-10 13:32:50', '2026-06-10 14:45:27');
INSERT INTO `programs` (`id`, `trainer_id`, `name`, `description`, `tag`, `duration_minutes`, `weeks`, `sessions_per_week`, `difficulty`, `image`, `avg_rating`, `enrollments`, `status`, `created_at`, `updated_at`) VALUES ('7', '1', 'Bodyweight Mastery', 'Calisthenics program to build functional strength using only your body weight.', 'Calisthenics', '35', '8', '3', 'intermediate', 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&h=450&fit=crop', '0.0', '0', 'active', '2026-06-10 13:32:50', '2026-06-10 14:45:27');
INSERT INTO `programs` (`id`, `trainer_id`, `name`, `description`, `tag`, `duration_minutes`, `weeks`, `sessions_per_week`, `difficulty`, `image`, `avg_rating`, `enrollments`, `status`, `created_at`, `updated_at`) VALUES ('8', '1', 'Recovery & Stretch', 'Active recovery and stretching program to improve mobility and reduce injury risk.', 'Recovery', '25', '4', '3', 'beginner', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=450&fit=crop', '0.0', '0', 'active', '2026-06-10 13:32:50', '2026-06-10 14:45:27');

CREATE TABLE `progress_photos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo_type` enum('front','back','side','full','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'full',
  `body_weight` decimal(5,1) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `taken_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`,`taken_at`),
  CONSTRAINT `progress_photos_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rate_limits` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hits` int unsigned NOT NULL DEFAULT '1',
  `window_start` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ip_endpoint` (`ip_address`,`endpoint`),
  KEY `idx_window` (`window_start`)
) ENGINE=InnoDB AUTO_INCREMENT=1906 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1831', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:12:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1832', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:13:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1833', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:14:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1834', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:15:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1835', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:16:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1836', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:17:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1837', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:18:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1838', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:19:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1839', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:20:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1840', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:21:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1841', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:22:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1842', '127.0.0.1', '/api/debug_export', '1', '2026-06-18 20:22:23');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1843', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:23:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1844', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:24:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1845', '127.0.0.1', '/api/workout_logs', '1', '2026-06-18 20:25:08');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1846', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:25:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1847', '127.0.0.1', '/api/auth/login', '1', '2026-06-18 20:25:26');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1848', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:26:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1849', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:27:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1850', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:28:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1851', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:29:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1852', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:30:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1853', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:31:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1854', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:32:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1855', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:33:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1856', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:34:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1857', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:35:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1858', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:36:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1859', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:37:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1860', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:38:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1861', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:39:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1862', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:40:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1863', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:41:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1864', '127.0.0.1', '/api/achievements/check', '2', '2026-06-18 20:42:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1865', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:43:43');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1866', '127.0.0.1', '/api/nutrition', '1', '2026-06-18 20:44:07');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1867', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:45:00');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1868', '127.0.0.1', '/api/auth/login', '1', '2026-06-18 20:45:28');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1869', '127.0.0.1', '/api/nutrition', '2', '2026-06-18 20:45:29');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1870', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:46:00');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1871', '127.0.0.1', '/api/nutrition', '2', '2026-06-18 20:50:17');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1872', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:51:11');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1873', '127.0.0.1', '/api/nutrition', '4', '2026-06-18 20:52:31');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1874', '127.0.0.1', '/api/sessions/20', '1', '2026-06-18 20:53:04');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1875', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:53:19');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1876', '127.0.0.1', '/api/photos/2', '1', '2026-06-18 20:53:40');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1877', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:54:19');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1878', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:55:19');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1879', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:56:19');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1880', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 20:57:20');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1881', '127.0.0.1', '/api/achievements/check', '2', '2026-06-18 20:58:20');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1882', '127.0.0.1', '/api/photos', '1', '2026-06-18 20:59:18');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1883', '127.0.0.1', '/api/photos/3', '1', '2026-06-18 20:59:21');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1884', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 21:00:19');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1885', '127.0.0.1', '/api/nutrition', '1', '2026-06-18 21:01:20');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1886', '127.0.0.1', '/api/checkins', '4', '2026-06-18 21:01:25');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1887', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 21:01:43');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1888', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 21:02:43');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1889', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 21:03:43');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1890', '127.0.0.1', '/api/photos', '1', '2026-06-18 21:03:46');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1891', '127.0.0.1', '/api/photos/4', '1', '2026-06-18 21:03:50');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1892', '127.0.0.1', '/api/enrollments', '1', '2026-06-18 21:04:09');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1893', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 21:04:43');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1894', '127.0.0.1', '/api/conversations', '1', '2026-06-18 21:05:34');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1895', '127.0.0.1', '/api/messages/5', '2', '2026-06-18 21:05:37');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1896', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 21:05:44');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1897', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 21:06:44');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1898', '127.0.0.1', '/api/messages/5', '6', '2026-06-18 21:08:12');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1899', '127.0.0.1', '/api/achievements/check', '2', '2026-06-18 21:08:15');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1900', '127.0.0.1', '/api/video-sessions', '3', '2026-06-18 21:09:16');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1901', '127.0.0.1', '/api/achievements/check', '1', '2026-06-18 21:09:44');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1902', '127.0.0.1', '/api/achievements/check', '2', '2026-06-18 21:11:22');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1903', '127.0.0.1', '/api/video-sessions', '1', '2026-06-18 21:11:28');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1904', '127.0.0.1', '/api/video-sessions/32', '2', '2026-06-18 21:11:46');
INSERT INTO `rate_limits` (`id`, `ip_address`, `endpoint`, `hits`, `window_start`) VALUES ('1905', '127.0.0.1', '/api/video-sessions/31', '1', '2026-06-18 21:12:08');

CREATE TABLE `recipes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meal_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `calories` int unsigned DEFAULT NULL,
  `protein_g` decimal(6,1) DEFAULT NULL,
  `carbs_g` decimal(6,1) DEFAULT NULL,
  `fat_g` decimal(6,1) DEFAULT NULL,
  `prep_time_minutes` int unsigned DEFAULT NULL,
  `difficulty` enum('easy','medium','hard') COLLATE utf8mb4_unicode_ci DEFAULT 'easy',
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ingredients` json DEFAULT NULL,
  `instructions` text COLLATE utf8mb4_unicode_ci,
  `tags` json DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `refresh_tokens` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_token` (`token`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `refresh_tokens` (`id`, `user_id`, `token`, `expires_at`, `revoked`, `created_at`) VALUES ('1', '6', '0d162b1ddda9c3950ee12e967bafb9292ccac8902ce9c796136c66e43d845d740305b9e3e5e36cf82bd4c93c2c58027e5e3627967a2f1c45c0f77139db49f5fa', '2026-07-18 22:37:50', '0', '2026-06-18 16:37:50');
INSERT INTO `refresh_tokens` (`id`, `user_id`, `token`, `expires_at`, `revoked`, `created_at`) VALUES ('2', '6', 'ddff9abb36dd8151105a21841f056974d21dd9c1e33ad77a71ac9e4de03cfb16eda9ac952f0f0a510d117a0b1788a407bd268fc9748e5fa6a9aa3f548c5ed67d', '2026-07-18 22:45:18', '0', '2026-06-18 16:45:18');
INSERT INTO `refresh_tokens` (`id`, `user_id`, `token`, `expires_at`, `revoked`, `created_at`) VALUES ('3', '6', '152c697a4711f19551c55605bc2d58f6bd4b423ce3bc62dd5c21f1e67fd580cf60956b6e9efef71e6580390a9a030fe987ccf72d37bd3c4d5ee08799970795de', '2026-07-18 22:51:38', '0', '2026-06-18 16:51:38');

CREATE TABLE `reviews` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `trainer_id` int unsigned NOT NULL,
  `session_id` int unsigned DEFAULT NULL,
  `rating` tinyint unsigned NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `trainer_id` (`trainer_id`),
  KEY `session_id` (`session_id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `reviews_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `reviews` (`id`, `user_id`, `trainer_id`, `session_id`, `rating`, `comment`, `created_at`) VALUES ('1', '3', '1', NULL, '5', 'Amazing HIIT session! Alex really pushes you to your limits.', '2026-05-04 08:00:00');
INSERT INTO `reviews` (`id`, `user_id`, `trainer_id`, `session_id`, `rating`, `comment`, `created_at`) VALUES ('2', '3', '1', NULL, '4', 'Great strength session, very well structured.', '2026-05-05 10:15:00');
INSERT INTO `reviews` (`id`, `user_id`, `trainer_id`, `session_id`, `rating`, `comment`, `created_at`) VALUES ('3', '4', '1', NULL, '5', 'Best deadlift coaching I have ever had.', '2026-05-05 10:30:00');
INSERT INTO `reviews` (`id`, `user_id`, `trainer_id`, `session_id`, `rating`, `comment`, `created_at`) VALUES ('4', '4', '1', NULL, '4', 'Good push day workout, felt the burn!', '2026-05-05 12:00:00');
INSERT INTO `reviews` (`id`, `user_id`, `trainer_id`, `session_id`, `rating`, `comment`, `created_at`) VALUES ('5', '5', '1', NULL, '5', 'Perfect beginner yoga flow. I felt amazing afterwards!', '2026-05-26 07:00:00');
INSERT INTO `reviews` (`id`, `user_id`, `trainer_id`, `session_id`, `rating`, `comment`, `created_at`) VALUES ('6', '3', '1', NULL, '5', 'Alex is an amazing coach! HIIT Inferno transformed my fitness level.', '2026-06-10 14:46:13');
INSERT INTO `reviews` (`id`, `user_id`, `trainer_id`, `session_id`, `rating`, `comment`, `created_at`) VALUES ('7', '4', '1', NULL, '4', 'Great strength program, very structured. Would recommend.', '2026-06-10 14:46:13');
INSERT INTO `reviews` (`id`, `user_id`, `trainer_id`, `session_id`, `rating`, `comment`, `created_at`) VALUES ('8', '5', '1', NULL, '5', 'Yoga Flow is perfect for recovery days. Love the sequencing.', '2026-06-10 14:46:13');

CREATE TABLE `session_participants` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `session_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `status` enum('registered','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registered',
  `reminded` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `session_participants_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `session_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `program_id` int unsigned DEFAULT NULL,
  `trainer_id` int unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `type` enum('group','1on1','video') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'group',
  `max_participants` int unsigned DEFAULT '10',
  `status` enum('scheduled','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduled',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `rpe` tinyint DEFAULT NULL COMMENT 'Rate of Perceived Exertion 1-10',
  `rpe_notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Post-workout notes',
  PRIMARY KEY (`id`),
  KEY `program_id` (`program_id`),
  KEY `trainer_id` (`trainer_id`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sessions_ibfk_2` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `sessions` (`id`, `program_id`, `trainer_id`, `title`, `description`, `date`, `start_time`, `end_time`, `type`, `max_participants`, `status`, `created_at`, `updated_at`, `rpe`, `rpe_notes`) VALUES ('20', '1', '1', 'HIIT Inferno - Week 4 Day 1', 'Full body HIIT circuit', '2026-06-04', '07:00:00', '07:45:00', 'group', '20', 'completed', '2026-06-10 14:46:13', '2026-06-18 20:53:04', '10', NULL);
INSERT INTO `sessions` (`id`, `program_id`, `trainer_id`, `title`, `description`, `date`, `start_time`, `end_time`, `type`, `max_participants`, `status`, `created_at`, `updated_at`, `rpe`, `rpe_notes`) VALUES ('21', '1', '1', 'HIIT Inferno - Week 4 Day 2', 'Tabata protocol', '2026-06-06', '07:00:00', '07:30:00', 'group', '20', 'completed', '2026-06-10 14:46:13', '2026-06-10 14:46:13', NULL, NULL);
INSERT INTO `sessions` (`id`, `program_id`, `trainer_id`, `title`, `description`, `date`, `start_time`, `end_time`, `type`, `max_participants`, `status`, `created_at`, `updated_at`, `rpe`, `rpe_notes`) VALUES ('22', '1', '1', 'HIIT Inferno - Week 4 Day 3', 'EMOM challenge', '2026-06-08', '07:00:00', '07:40:00', 'group', '20', 'completed', '2026-06-10 14:46:13', '2026-06-10 14:46:13', NULL, NULL);
INSERT INTO `sessions` (`id`, `program_id`, `trainer_id`, `title`, `description`, `date`, `start_time`, `end_time`, `type`, `max_participants`, `status`, `created_at`, `updated_at`, `rpe`, `rpe_notes`) VALUES ('23', '2', '1', 'Total Strength - Week 3 Day 1', 'Squat focus', '2026-06-05', '09:00:00', '10:00:00', 'group', '15', 'completed', '2026-06-10 14:46:13', '2026-06-10 14:46:13', NULL, NULL);
INSERT INTO `sessions` (`id`, `program_id`, `trainer_id`, `title`, `description`, `date`, `start_time`, `end_time`, `type`, `max_participants`, `status`, `created_at`, `updated_at`, `rpe`, `rpe_notes`) VALUES ('24', '2', '1', 'Total Strength - Week 3 Day 2', 'Deadlift focus', '2026-06-07', '09:00:00', '10:00:00', 'group', '15', 'completed', '2026-06-10 14:46:13', '2026-06-10 14:46:13', NULL, NULL);
INSERT INTO `sessions` (`id`, `program_id`, `trainer_id`, `title`, `description`, `date`, `start_time`, `end_time`, `type`, `max_participants`, `status`, `created_at`, `updated_at`, `rpe`, `rpe_notes`) VALUES ('25', '1', '1', 'HIIT Inferno - Week 5 Day 1', 'Pyramid HIIT', '2026-06-12', '07:00:00', '07:45:00', 'group', '20', 'scheduled', '2026-06-10 14:46:13', '2026-06-10 14:46:13', NULL, NULL);
INSERT INTO `sessions` (`id`, `program_id`, `trainer_id`, `title`, `description`, `date`, `start_time`, `end_time`, `type`, `max_participants`, `status`, `created_at`, `updated_at`, `rpe`, `rpe_notes`) VALUES ('26', '2', '1', 'Total Strength - Week 4 Day 1', 'Bench press focus', '2026-06-13', '09:00:00', '10:00:00', 'group', '15', 'scheduled', '2026-06-10 14:46:13', '2026-06-10 14:46:13', NULL, NULL);

CREATE TABLE `smart_routines` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `routine_date` date NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `focus` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_minutes` int unsigned DEFAULT NULL,
  `difficulty` enum('beginner','intermediate','advanced') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `exercises` json NOT NULL,
  `is_completed` tinyint(1) NOT NULL DEFAULT '0',
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`,`routine_date`),
  CONSTRAINT `smart_routines_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `smart_routines` (`id`, `user_id`, `routine_date`, `title`, `focus`, `duration_minutes`, `difficulty`, `exercises`, `is_completed`, `completed_at`, `created_at`) VALUES ('1', '3', '2026-06-05', 'Full Body Burn', 'full', '45', 'intermediate', '[{\"name\": \"Mountain Climbers\", \"reps\": \"20\", \"rest\": 20, \"sets\": 3}, {\"name\": \"Goblet Squats\", \"reps\": \"12\", \"rest\": 45, \"sets\": 3}, {\"name\": \"Kettlebell Swings\", \"reps\": \"15\", \"rest\": 30, \"sets\": 3}, {\"name\": \"Clean & Press\", \"reps\": \"8\", \"rest\": 90, \"sets\": 3}, {\"name\": \"Push Ups\", \"reps\": \"15\", \"rest\": 30, \"sets\": 3}]', '0', NULL, '2026-06-05 08:59:46');
INSERT INTO `smart_routines` (`id`, `user_id`, `routine_date`, `title`, `focus`, `duration_minutes`, `difficulty`, `exercises`, `is_completed`, `completed_at`, `created_at`) VALUES ('2', '3', '2026-06-06', 'Cardio Body Burn', 'cardio', '45', 'intermediate', '[{\"name\": \"Burpees\", \"reps\": \"12\", \"rest\": 20, \"sets\": 3}, {\"name\": \"Row Machine\", \"reps\": \"45s\", \"rest\": 15, \"sets\": 3}, {\"name\": \"Jump Rope\", \"reps\": \"60s\", \"rest\": 15, \"sets\": 3}, {\"name\": \"Box Jumps\", \"reps\": \"10\", \"rest\": 30, \"sets\": 3}, {\"name\": \"High Knees\", \"reps\": \"30s\", \"rest\": 15, \"sets\": 3}]', '0', NULL, '2026-06-06 17:22:12');
INSERT INTO `smart_routines` (`id`, `user_id`, `routine_date`, `title`, `focus`, `duration_minutes`, `difficulty`, `exercises`, `is_completed`, `completed_at`, `created_at`) VALUES ('3', '3', '2026-06-07', 'Core Body Burn', 'core', '45', 'intermediate', '[{\"name\": \"Plank\", \"reps\": \"60s\", \"rest\": 20, \"sets\": 3}, {\"name\": \"Bicycle Kicks\", \"reps\": \"20\", \"rest\": 15, \"sets\": 3}, {\"name\": \"Russian Twists\", \"reps\": \"20\", \"rest\": 20, \"sets\": 3}, {\"name\": \"Leg Raises\", \"reps\": \"15\", \"rest\": 20, \"sets\": 3}, {\"name\": \"Crunches\", \"reps\": \"20\", \"rest\": 15, \"sets\": 3}]', '0', NULL, '2026-06-06 18:16:00');
INSERT INTO `smart_routines` (`id`, `user_id`, `routine_date`, `title`, `focus`, `duration_minutes`, `difficulty`, `exercises`, `is_completed`, `completed_at`, `created_at`) VALUES ('4', '4', '2026-06-10', 'Push Body Build', 'push', '45', 'intermediate', '[{\"name\": \"Front Raises\", \"reps\": \"12\", \"rest\": 30, \"sets\": 3}, {\"name\": \"Incline Bench Press\", \"reps\": \"10\", \"rest\": 60, \"sets\": 4}, {\"name\": \"Shoulder Press\", \"reps\": \"12\", \"rest\": 45, \"sets\": 3}, {\"name\": \"Dips\", \"reps\": \"10\", \"rest\": 45, \"sets\": 3}, {\"name\": \"Push Ups\", \"reps\": \"15\", \"rest\": 30, \"sets\": 3}]', '0', NULL, '2026-06-10 14:02:34');
INSERT INTO `smart_routines` (`id`, `user_id`, `routine_date`, `title`, `focus`, `duration_minutes`, `difficulty`, `exercises`, `is_completed`, `completed_at`, `created_at`) VALUES ('5', '4', '2026-06-12', 'Full Body Build', 'full', '45', 'intermediate', '[{\"name\": \"Push Ups\", \"reps\": \"15\", \"rest\": 30, \"sets\": 3}, {\"name\": \"Goblet Squats\", \"reps\": \"12\", \"rest\": 45, \"sets\": 3}, {\"name\": \"Clean & Press\", \"reps\": \"8\", \"rest\": 90, \"sets\": 3}, {\"name\": \"Kettlebell Swings\", \"reps\": \"15\", \"rest\": 30, \"sets\": 3}, {\"name\": \"Mountain Climbers\", \"reps\": \"20\", \"rest\": 20, \"sets\": 3}]', '0', NULL, '2026-06-12 01:19:24');
INSERT INTO `smart_routines` (`id`, `user_id`, `routine_date`, `title`, `focus`, `duration_minutes`, `difficulty`, `exercises`, `is_completed`, `completed_at`, `created_at`) VALUES ('6', '6', '2026-06-18', 'Pull Body Build', 'pull', '30', 'beginner', '[{\"name\": \"Lat Pulldowns\", \"reps\": \"10\", \"rest\": 60, \"sets\": 4}, {\"name\": \"Seated Rows\", \"reps\": \"12\", \"rest\": 45, \"sets\": 3}, {\"name\": \"Face Pulls\", \"reps\": \"15\", \"rest\": 30, \"sets\": 3}, {\"name\": \"Deadlifts\", \"reps\": \"8\", \"rest\": 90, \"sets\": 4}]', '0', NULL, '2026-06-18 16:45:20');
INSERT INTO `smart_routines` (`id`, `user_id`, `routine_date`, `title`, `focus`, `duration_minutes`, `difficulty`, `exercises`, `is_completed`, `completed_at`, `created_at`) VALUES ('7', '6', '2026-06-19', 'Full Body Build', 'full', '30', 'beginner', '[{\"name\": \"Clean & Press\", \"reps\": \"8\", \"rest\": 90, \"sets\": 3}, {\"name\": \"Plank\", \"reps\": \"45s\", \"rest\": 30, \"sets\": 3}, {\"name\": \"Push Ups\", \"reps\": \"15\", \"rest\": 30, \"sets\": 3}, {\"name\": \"Goblet Squats\", \"reps\": \"12\", \"rest\": 45, \"sets\": 3}]', '0', NULL, '2026-06-18 18:17:43');

CREATE TABLE `social_comments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `social_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `social_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `social_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `social_likes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_like` (`post_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `social_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `social_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `social_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `social_posts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'status' COMMENT 'status, achievement, workout',
  `reference_id` int unsigned DEFAULT NULL,
  `likes_count` int DEFAULT '0',
  `comments_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `social_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `social_posts` (`id`, `user_id`, `content`, `type`, `reference_id`, `likes_count`, `comments_count`, `created_at`) VALUES ('1', '6', 'a', 'status', NULL, '0', '0', '2026-06-18 16:50:38');

CREATE TABLE `specializations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `specializations` (`id`, `slug`, `name`) VALUES ('1', 'strength', 'Strength');
INSERT INTO `specializations` (`id`, `slug`, `name`) VALUES ('2', 'hiit', 'HIIT');
INSERT INTO `specializations` (`id`, `slug`, `name`) VALUES ('3', 'yoga', 'Yoga');
INSERT INTO `specializations` (`id`, `slug`, `name`) VALUES ('4', 'boxing', 'Boxing');
INSERT INTO `specializations` (`id`, `slug`, `name`) VALUES ('5', 'cycling', 'Cycling');
INSERT INTO `specializations` (`id`, `slug`, `name`) VALUES ('6', 'nutrition', 'Nutrition');
INSERT INTO `specializations` (`id`, `slug`, `name`) VALUES ('7', 'rehab', 'Rehab');
INSERT INTO `specializations` (`id`, `slug`, `name`) VALUES ('8', 'functional', 'Functional');
INSERT INTO `specializations` (`id`, `slug`, `name`) VALUES ('9', 'calisthenics', 'Calisthenics');
INSERT INTO `specializations` (`id`, `slug`, `name`) VALUES ('10', 'prepost-natal', 'Pre/Post-natal');
INSERT INTO `specializations` (`id`, `slug`, `name`) VALUES ('11', 'crossfit', 'CrossFit');

CREATE TABLE `subscription_plans` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price_monthly` decimal(8,2) NOT NULL,
  `price_yearly` decimal(8,2) NOT NULL,
  `popular` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `subscription_plans` (`id`, `name`, `description`, `price_monthly`, `price_yearly`, `popular`, `status`, `created_at`) VALUES ('1', 'Starter', 'Perfect to get started with essential features.', '29.00', '19.00', '0', 'active', '2026-06-05 08:53:01');
INSERT INTO `subscription_plans` (`id`, `name`, `description`, `price_monthly`, `price_yearly`, `popular`, `status`, `created_at`) VALUES ('2', 'Pro', 'Best for serious athletes who want real results.', '79.00', '59.00', '1', 'active', '2026-06-05 08:53:01');
INSERT INTO `subscription_plans` (`id`, `name`, `description`, `price_monthly`, `price_yearly`, `popular`, `status`, `created_at`) VALUES ('3', 'Enterprise', 'For the full experience with everything included.', '199.00', '149.00', '0', 'active', '2026-06-05 08:53:01');

CREATE TABLE `support_tickets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `trainer_id` int unsigned DEFAULT NULL,
  `assigned_to` int unsigned DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `severity` enum('open','in_progress','critical','resolved','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `trainer_id` (`trainer_id`),
  KEY `assigned_to` (`assigned_to`),
  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `support_tickets_ibfk_2` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `support_tickets_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('1', '3', NULL, NULL, 'Cannot access workout videos', 'Hi, I am unable to play the videos in the HIIT Inferno program. They keep buffering and never load.', NULL, 'open', '2026-05-25 10:30:00', '2026-06-05 08:53:01');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('2', '4', NULL, '1', 'Billing question', 'I was charged twice for my subscription this month. Can you help me get a refund for the duplicate charge?', NULL, 'in_progress', '2026-05-26 14:15:00', '2026-06-10 19:36:23');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('3', '5', NULL, NULL, 'Need help with meal plan', 'The nutrition plan seems too restrictive for my lifestyle. Can I get some modifications or alternatives?', NULL, 'open', '2026-05-27 09:00:00', '2026-06-05 08:53:01');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('4', '1', NULL, NULL, 'Feature request: Dark mode', 'Would be great to have a dark mode option in the mobile app. The white background is very bright at night.', NULL, 'resolved', '2026-05-20 16:00:00', '2026-06-05 08:53:01');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('5', '3', NULL, '1', 'Problema con el reproductor de video', 'Los videos del programa HIIT Inferno no cargan correctamente. Ya intenté con Chrome y Firefox y el error persiste. Me aparece \"Error de conexión con el servidor de medios\".', NULL, 'critical', '2026-06-09 22:35:35', '2026-06-10 19:36:23');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('6', '4', NULL, NULL, 'Solicitud de cambio de plan', 'Quiero cambiar mi suscripción de Starter a Pro. Me interesa tener acceso a los programas avanzados y las sesiones 1:1 con coach.', NULL, 'open', '2026-06-07 22:35:35', '2026-06-10 19:35:35');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('7', '5', NULL, NULL, 'Error al registrar progreso', 'Cuando intento marcar un ejercicio como completado en la rutina diaria, la aplicación se congela y tengo que recargar la página. Pierdo todo el progreso de la sesión.', NULL, 'open', '2026-06-10 18:35:35', '2026-06-10 19:35:35');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('8', '3', NULL, '1', 'Duda sobre planes de nutrición', 'Los macros que me asignó el plan parecen muy bajos para mi nivel de actividad. Entreno 6 días a la semana y consumo 1800 kcal. ¿Es posible ajustarlos?', NULL, 'in_progress', '2026-06-09 10:35:35', '2026-06-10 19:36:23');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('9', '4', NULL, NULL, 'Reporte de bug en la app móvil', 'La aplicación móvil de FitPower se cierra inesperadamente cuando intento ver el historial de métricas corporales. Uso Android 14 en un Samsung Galaxy S24.', NULL, 'open', '2026-06-08 06:35:35', '2026-06-10 19:35:35');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('10', '5', NULL, '1', 'Solicitud de reembolso', 'El mes pasado me cobraron dos veces la suscripción. Ya envié un correo pero no he recibido respuesta. Mi número de transacción es TXN-2026-05-15.', NULL, 'critical', '2026-06-09 13:35:35', '2026-06-10 19:36:23');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('11', '3', NULL, NULL, 'No recibo notificaciones push', 'Desde que actualicé la app la semana pasada, dejé de recibir notificaciones de recordatorio de entrenamiento y mensajes del coach. Ya revisé la configuración y están habilitadas.', NULL, 'open', '2026-06-08 22:35:35', '2026-06-10 19:35:35');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('12', '4', NULL, '1', 'Problema con la cámara en videollamadas', 'Durante las sesiones de video con mi coach, la cámara se desactiva aleatoriamente. El micrófono funciona bien, pero la imagen se congela cada 2-3 minutos.', NULL, 'in_progress', '2026-06-08 14:35:35', '2026-06-10 19:36:23');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('13', '5', NULL, NULL, 'Sugerencia: Más ejercicios de movilidad', 'Sería genial agregar más rutinas de movilidad y estiramiento para días de descanso activo. Actualmente solo hay 3 programas de recovery.', NULL, 'open', '2026-06-08 15:35:35', '2026-06-10 19:35:35');
INSERT INTO `support_tickets` (`id`, `user_id`, `trainer_id`, `assigned_to`, `subject`, `message`, `admin_note`, `severity`, `created_at`, `updated_at`) VALUES ('14', '3', NULL, NULL, 'Error 500 al generar PDF de progreso', 'Cuando intento exportar mi progreso mensual a PDF, recibo un error interno del servidor. El CSV funciona correctamente.', NULL, 'open', '2026-06-08 07:35:35', '2026-06-10 19:35:35');

CREATE TABLE `ticket_replies` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_ticket` (`ticket_id`),
  CONSTRAINT `ticket_replies_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_replies_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `ticket_replies` (`id`, `ticket_id`, `user_id`, `message`, `created_at`) VALUES ('1', '2', '1', 'Hola Maria, gracias por contactarnos. Ya revisamos el problema con los videos del HIIT Inferno. Resulta que era un problema de caché del CDN. Ya lo solucionamos, por favor intenta de nuevo. Si persiste, avísanos.', '2026-06-10 19:36:23');
INSERT INTO `ticket_replies` (`id`, `ticket_id`, `user_id`, `message`, `created_at`) VALUES ('2', '5', '1', 'Hola Laura, gracias por tu paciencia. Hemos revisado el tema del cobro duplicado. Efectivamente hubo un error en el procesador de pagos. Ya iniciamos el reembolso y deberías verlo reflejado en 3-5 días hábiles. Disculpa las molestias.', '2026-06-10 19:36:23');
INSERT INTO `ticket_replies` (`id`, `ticket_id`, `user_id`, `message`, `created_at`) VALUES ('3', '8', '1', 'Hola Maria, con gusto podemos ajustar tus macros. Para poder personalizar mejor tu plan, ¿podrías decirnos cuál es tu objetivo principal? Podemos subir las calorías a 2200-2400 si tu volumen de entrenamiento es alto.', '2026-06-10 19:36:23');
INSERT INTO `ticket_replies` (`id`, `ticket_id`, `user_id`, `message`, `created_at`) VALUES ('4', '10', '1', 'Hola Juan, gracias por reportar el problema de la cámara. Esto puede deberse a un conflicto con los codecs de video. ¿Podrías indicarnos qué navegador usas y si has probado con otro? Mientras tanto, nuestro equipo técnico ya está trabajando en una actualización.', '2026-06-10 19:36:23');
INSERT INTO `ticket_replies` (`id`, `ticket_id`, `user_id`, `message`, `created_at`) VALUES ('5', '12', '1', 'Hola Maria, gracias por contactarnos. Ya revisamos el problema con los videos del HIIT Inferno. Resulta que era un problema de caché del CDN. Ya lo solucionamos, por favor intenta de nuevo. Si persiste, avísanos.', '2026-06-10 19:36:23');

CREATE TABLE `trainer_certification` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `trainer_id` int unsigned NOT NULL,
  `certification_id` int unsigned NOT NULL,
  `cert_id_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cert_file` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `trainer_id` (`trainer_id`),
  KEY `certification_id` (`certification_id`),
  CONSTRAINT `trainer_certification_ibfk_1` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trainer_certification_ibfk_2` FOREIGN KEY (`certification_id`) REFERENCES `certifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `trainer_language` (
  `trainer_id` int unsigned NOT NULL,
  `language_id` int unsigned NOT NULL,
  PRIMARY KEY (`trainer_id`,`language_id`),
  KEY `language_id` (`language_id`),
  CONSTRAINT `trainer_language_ibfk_1` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trainer_language_ibfk_2` FOREIGN KEY (`language_id`) REFERENCES `languages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `trainer_specialization` (
  `trainer_id` int unsigned NOT NULL,
  `specialization_id` int unsigned NOT NULL,
  PRIMARY KEY (`trainer_id`,`specialization_id`),
  KEY `specialization_id` (`specialization_id`),
  CONSTRAINT `trainer_specialization_ibfk_1` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trainer_specialization_ibfk_2` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `trainer_specialization` (`trainer_id`, `specialization_id`) VALUES ('1', '1');
INSERT INTO `trainer_specialization` (`trainer_id`, `specialization_id`) VALUES ('1', '2');
INSERT INTO `trainer_specialization` (`trainer_id`, `specialization_id`) VALUES ('1', '8');

CREATE TABLE `trainers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','nonbinary','prefer-not') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `experience` enum('0-1','1-3','3-5','5-10','10+') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `philosophy` text COLLATE utf8mb4_unicode_ci,
  `instagram` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `youtube` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modality` enum('online','in-person','hybrid') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_relation` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `terms_accepted` tinyint(1) NOT NULL DEFAULT '0',
  `privacy_accepted` tinyint(1) NOT NULL DEFAULT '0',
  `marketing_optin` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('pending','approved','rejected','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `avg_rating` decimal(2,1) NOT NULL DEFAULT '0.0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `trainers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `trainers` (`id`, `user_id`, `first_name`, `last_name`, `email`, `phone`, `date_of_birth`, `gender`, `photo`, `experience`, `bio`, `philosophy`, `instagram`, `youtube`, `website`, `country`, `city`, `timezone`, `modality`, `emergency_name`, `emergency_phone`, `emergency_relation`, `terms_accepted`, `privacy_accepted`, `marketing_optin`, `status`, `avg_rating`, `created_at`, `updated_at`) VALUES ('1', '2', 'Alex', 'Rivera', 'alex.rivera@fitpower.com', '+1-555-0101', '1985-03-15', 'male', NULL, '10+', 'Certified personal trainer with over 10 years of experience helping clients achieve their fitness goals through science-based programming.', 'I believe in sustainable fitness through progressive overload, proper nutrition, and consistency. Every journey is unique.', NULL, NULL, NULL, 'United States', 'Miami', 'America/New_York', 'hybrid', NULL, NULL, NULL, '1', '1', '1', 'approved', '0.0', '2026-06-05 14:53:00', '2026-06-05 14:53:00');

CREATE TABLE `user_achievements` (
  `user_id` int unsigned NOT NULL,
  `achievement_id` int unsigned NOT NULL,
  `unlocked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`achievement_id`),
  KEY `achievement_id` (`achievement_id`),
  CONSTRAINT `user_achievements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_achievements_ibfk_2` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user_achievements` (`user_id`, `achievement_id`, `unlocked_at`) VALUES ('1', '1', '2026-05-10 10:00:00');
INSERT INTO `user_achievements` (`user_id`, `achievement_id`, `unlocked_at`) VALUES ('1', '2', '2026-04-20 09:30:00');
INSERT INTO `user_achievements` (`user_id`, `achievement_id`, `unlocked_at`) VALUES ('1', '5', '2026-05-25 08:00:00');
INSERT INTO `user_achievements` (`user_id`, `achievement_id`, `unlocked_at`) VALUES ('1', '6', '2026-05-15 11:00:00');
INSERT INTO `user_achievements` (`user_id`, `achievement_id`, `unlocked_at`) VALUES ('3', '1', '2026-05-20 07:00:00');
INSERT INTO `user_achievements` (`user_id`, `achievement_id`, `unlocked_at`) VALUES ('3', '2', '2026-05-18 10:30:00');
INSERT INTO `user_achievements` (`user_id`, `achievement_id`, `unlocked_at`) VALUES ('3', '4', '2026-05-22 09:00:00');
INSERT INTO `user_achievements` (`user_id`, `achievement_id`, `unlocked_at`) VALUES ('4', '1', '2026-05-12 08:00:00');
INSERT INTO `user_achievements` (`user_id`, `achievement_id`, `unlocked_at`) VALUES ('4', '3', '2026-05-15 11:00:00');
INSERT INTO `user_achievements` (`user_id`, `achievement_id`, `unlocked_at`) VALUES ('5', '1', '2026-05-27 06:30:00');

CREATE TABLE `user_nutrition_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `calories_target` int unsigned NOT NULL DEFAULT '1940',
  `protein_target` decimal(6,1) NOT NULL DEFAULT '150.0',
  `carbs_target` decimal(6,1) NOT NULL DEFAULT '220.0',
  `fat_target` decimal(6,1) NOT NULL DEFAULT '65.0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `user_nutrition_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_programs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `program_id` int unsigned NOT NULL,
  `progress` decimal(5,2) NOT NULL DEFAULT '0.00',
  `current_week` tinyint unsigned NOT NULL DEFAULT '1',
  `status` enum('active','completed','paused','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `program_id` (`program_id`),
  CONSTRAINT `user_programs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_programs_ibfk_2` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user_programs` (`id`, `user_id`, `program_id`, `progress`, `current_week`, `status`, `started_at`, `completed_at`) VALUES ('7', '3', '1', '45.00', '4', 'active', '2026-05-01 00:00:00', NULL);
INSERT INTO `user_programs` (`id`, `user_id`, `program_id`, `progress`, `current_week`, `status`, `started_at`, `completed_at`) VALUES ('8', '3', '2', '25.00', '3', 'active', '2026-05-01 00:00:00', NULL);
INSERT INTO `user_programs` (`id`, `user_id`, `program_id`, `progress`, `current_week`, `status`, `started_at`, `completed_at`) VALUES ('11', '5', '4', '15.00', '1', 'active', '2026-05-26 00:00:00', NULL);
INSERT INTO `user_programs` (`id`, `user_id`, `program_id`, `progress`, `current_week`, `status`, `started_at`, `completed_at`) VALUES ('12', '4', '1', '0.00', '1', 'active', '2026-06-10 15:15:33', NULL);
INSERT INTO `user_programs` (`id`, `user_id`, `program_id`, `progress`, `current_week`, `status`, `started_at`, `completed_at`) VALUES ('13', '6', '1', '0.00', '1', 'active', '2026-06-18 21:04:09', NULL);

CREATE TABLE `user_subscriptions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `plan_id` int unsigned NOT NULL,
  `billing` enum('monthly','yearly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `status` enum('active','cancelled','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `starts_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ends_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `stripe_subscription_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trial_ends_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `user_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `user_subscriptions` (`id`, `user_id`, `plan_id`, `billing`, `status`, `starts_at`, `ends_at`, `cancelled_at`, `stripe_subscription_id`, `trial_ends_at`) VALUES ('1', '1', '3', 'yearly', 'active', '2026-01-01 00:00:00', '2027-06-05 23:59:59', NULL, NULL, NULL);
INSERT INTO `user_subscriptions` (`id`, `user_id`, `plan_id`, `billing`, `status`, `starts_at`, `ends_at`, `cancelled_at`, `stripe_subscription_id`, `trial_ends_at`) VALUES ('2', '2', '2', 'monthly', 'active', '2026-03-01 00:00:00', NULL, NULL, NULL, NULL);
INSERT INTO `user_subscriptions` (`id`, `user_id`, `plan_id`, `billing`, `status`, `starts_at`, `ends_at`, `cancelled_at`, `stripe_subscription_id`, `trial_ends_at`) VALUES ('3', '3', '2', 'monthly', 'active', '2026-04-15 00:00:00', NULL, NULL, NULL, NULL);
INSERT INTO `user_subscriptions` (`id`, `user_id`, `plan_id`, `billing`, `status`, `starts_at`, `ends_at`, `cancelled_at`, `stripe_subscription_id`, `trial_ends_at`) VALUES ('4', '4', '2', 'yearly', 'active', '2026-02-01 00:00:00', '2027-06-05 23:59:59', NULL, NULL, NULL);
INSERT INTO `user_subscriptions` (`id`, `user_id`, `plan_id`, `billing`, `status`, `starts_at`, `ends_at`, `cancelled_at`, `stripe_subscription_id`, `trial_ends_at`) VALUES ('5', '5', '1', 'monthly', 'active', '2026-05-01 00:00:00', NULL, NULL, NULL, NULL);

CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','coach','client') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'client',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fitness_level` enum('beginner','intermediate','advanced') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_goal` enum('fat-loss','muscle','endurance','wellness') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `training_days` tinyint unsigned DEFAULT NULL,
  `photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','pending','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `settings` json DEFAULT NULL,
  `stripe_customer_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token_version` int unsigned NOT NULL DEFAULT '0',
  `password_changed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `role`, `password`, `fitness_level`, `primary_goal`, `training_days`, `photo`, `email_verified_at`, `remember_token`, `status`, `created_at`, `updated_at`, `settings`, `stripe_customer_id`, `token_version`, `password_changed_at`) VALUES ('1', 'Admin', 'User', 'admin@fitpower.com', 'admin', '$2y$10$7VFxpUQkESaidvj.t5SVuuaOftSoTIVpZdFRQNXB/bT1jcbwHljry', 'advanced', 'wellness', '5', NULL, '2026-06-05 14:53:00', NULL, 'active', '2026-06-05 14:53:00', '2026-06-05 14:53:00', NULL, NULL, '0', NULL);
INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `role`, `password`, `fitness_level`, `primary_goal`, `training_days`, `photo`, `email_verified_at`, `remember_token`, `status`, `created_at`, `updated_at`, `settings`, `stripe_customer_id`, `token_version`, `password_changed_at`) VALUES ('2', 'Alex', 'Rivera', 'alex.rivera@fitpower.com', 'coach', '$2y$10$7VFxpUQkESaidvj.t5SVuuaOftSoTIVpZdFRQNXB/bT1jcbwHljry', 'advanced', 'muscle', '6', NULL, '2026-06-05 14:53:00', NULL, 'active', '2026-06-05 14:53:00', '2026-06-05 14:53:00', NULL, NULL, '0', NULL);
INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `role`, `password`, `fitness_level`, `primary_goal`, `training_days`, `photo`, `email_verified_at`, `remember_token`, `status`, `created_at`, `updated_at`, `settings`, `stripe_customer_id`, `token_version`, `password_changed_at`) VALUES ('3', 'Maria', 'Garcia', 'maria.garcia@fitpower.com', 'client', '$2y$10$7VFxpUQkESaidvj.t5SVuuaOftSoTIVpZdFRQNXB/bT1jcbwHljry', 'intermediate', 'fat-loss', '4', NULL, '2026-06-05 14:53:00', NULL, 'active', '2026-06-05 14:53:00', '2026-06-05 14:53:00', NULL, NULL, '0', NULL);
INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `role`, `password`, `fitness_level`, `primary_goal`, `training_days`, `photo`, `email_verified_at`, `remember_token`, `status`, `created_at`, `updated_at`, `settings`, `stripe_customer_id`, `token_version`, `password_changed_at`) VALUES ('4', 'Juan', 'Perez', 'juan.perez@fitpower.com', 'client', '$2y$10$7VFxpUQkESaidvj.t5SVuuaOftSoTIVpZdFRQNXB/bT1jcbwHljry', 'intermediate', 'muscle', '5', NULL, '2026-06-05 14:53:00', NULL, 'active', '2026-06-05 14:53:00', '2026-06-05 14:53:00', NULL, NULL, '0', NULL);
INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `role`, `password`, `fitness_level`, `primary_goal`, `training_days`, `photo`, `email_verified_at`, `remember_token`, `status`, `created_at`, `updated_at`, `settings`, `stripe_customer_id`, `token_version`, `password_changed_at`) VALUES ('5', 'Laura', 'Martinez', 'laura.martinez@fitpower.com', 'client', '$2y$10$7VFxpUQkESaidvj.t5SVuuaOftSoTIVpZdFRQNXB/bT1jcbwHljry', 'beginner', 'wellness', '3', NULL, '2026-06-05 14:53:00', NULL, 'active', '2026-06-05 14:53:00', '2026-06-05 14:53:00', NULL, NULL, '0', NULL);
INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `role`, `password`, `fitness_level`, `primary_goal`, `training_days`, `photo`, `email_verified_at`, `remember_token`, `status`, `created_at`, `updated_at`, `settings`, `stripe_customer_id`, `token_version`, `password_changed_at`) VALUES ('6', 'Ariel', 'Sotomayor', 'alejo.sotomayor0411@gmail.com', 'client', '$2y$10$7VFxpUQkESaidvj.t5SVuuaOftSoTIVpZdFRQNXB/bT1jcbwHljry', NULL, NULL, NULL, 'https://lh3.googleusercontent.com/a/ACg8ocIoxzLrjYMPogjn5j4pBkVLAwHMfBU7YfJQM1qJyfOYP18Ygw=s96-c', NULL, NULL, 'active', '2026-06-18 16:37:50', '2026-06-18 21:00:40', NULL, NULL, '0', NULL);

CREATE TABLE `video_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `caller_id` int unsigned NOT NULL,
  `callee_id` int unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Video Session',
  `scheduled_at` datetime DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `ended_at` datetime DEFAULT NULL,
  `room_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('scheduled','active','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduled',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_caller` (`caller_id`),
  KEY `idx_callee` (`callee_id`),
  CONSTRAINT `video_sessions_ibfk_1` FOREIGN KEY (`caller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `video_sessions_ibfk_2` FOREIGN KEY (`callee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workout_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `session_id` int unsigned DEFAULT NULL,
  `exercise_id` int unsigned DEFAULT NULL,
  `sets_completed` int unsigned NOT NULL DEFAULT '0',
  `reps_completed` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weight_used` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `logged_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `calories_burned` int unsigned DEFAULT NULL COMMENT 'Total calories burned for this log entry',
  PRIMARY KEY (`id`),
  KEY `fk_wlog_session` (`session_id`),
  KEY `fk_wlog_exercise` (`exercise_id`),
  KEY `idx_user_date` (`user_id`,`logged_at`),
  CONSTRAINT `fk_wlog_exercise` FOREIGN KEY (`exercise_id`) REFERENCES `exercise_library` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_wlog_session` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_wlog_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

