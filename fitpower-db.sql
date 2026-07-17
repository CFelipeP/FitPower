-- MySQL dump 10.13  Distrib 8.0.30, for Win64 (x86_64)
--
-- Host: localhost    Database: fitpower
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `achievements`
--

DROP TABLE IF EXISTS `achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `achievements`
--

LOCK TABLES `achievements` WRITE;
/*!40000 ALTER TABLE `achievements` DISABLE KEYS */;
INSERT INTO `achievements` VALUES 
(1,'7-day-streak','7-Day Streak',NULL,'streak',7,50,'Zap',1),
(2,'first-pr','First PR',NULL,'workouts',1,30,'Trophy',2),
(3,'50-workouts','50 Workouts',NULL,'workouts',50,100,'Dumbbell',3),
(4,'5k-calories','5K Calories',NULL,'calories',5000,80,'Flame',4),
(5,'30-day-challenge','30 Day Challenge',NULL,'streak',30,200,'Calendar',5),
(6,'consistency-king','Consistency King',NULL,'points',1000,150,'Award',6),
(7,'community-hero','Community Hero',NULL,'social',10,100,'Users',7),
(8,'master','Master',NULL,'points',5000,500,'Crown',8);
/*!40000 ALTER TABLE `achievements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activities`
--

DROP TABLE IF EXISTS `activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activities`
--

LOCK TABLES `activities` WRITE;
/*!40000 ALTER TABLE `activities` DISABLE KEYS */;
INSERT INTO `activities` VALUES (1,1,1,'workout','Completed HIIT Inferno session','Dumbbell','#10b981','Done','bg-success','2026-05-27 07:45:00'),(2,1,NULL,'progress','New body measurement recorded','Activity','#3b82f6','New','bg-primary','2026-05-28 08:00:00'),(3,2,NULL,'session','Created new HIIT Inferno session','Calendar','#8b5cf6','New','bg-primary','2026-05-27 09:00:00'),(4,3,1,'workout','Completed Total Strength workout','Dumbbell','#10b981','Done','bg-success','2026-05-27 10:00:00'),(5,3,NULL,'achievement','Unlocked 7-Day Streak achievement','Trophy','#f59e0b','New','bg-warning','2026-05-20 07:00:00'),(6,3,NULL,'nutrition','Logged today\'s meals','Apple','#ef4444','Log','bg-info','2026-05-28 12:00:00'),(7,4,1,'workout','Completed Upper Body Power session','Dumbbell','#10b981','Done','bg-success','2026-05-27 11:50:00'),(8,4,NULL,'subscription','Upgraded to Pro plan','CreditCard','#8b5cf6','Pro','bg-primary','2026-05-15 14:00:00'),(9,5,1,'workout','Completed Yoga Flow session','Heart','#ec4899','Done','bg-success','2026-05-27 06:45:00'),(10,5,NULL,'milestone','First week of training completed','Award','#f59e0b','Week 1','bg-warning','2026-05-28 06:45:00');
/*!40000 ALTER TABLE `activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `articles`
--

DROP TABLE IF EXISTS `articles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `articles`
--

LOCK TABLES `articles` WRITE;
/*!40000 ALTER TABLE `articles` DISABLE KEYS */;
/*!40000 ALTER TABLE `articles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `body_metrics`
--

DROP TABLE IF EXISTS `body_metrics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `body_metrics`
--

LOCK TABLES `body_metrics` WRITE;
/*!40000 ALTER TABLE `body_metrics` DISABLE KEYS */;
INSERT INTO `body_metrics` VALUES (1,3,'2026-04-28',72.0,28.0,28.5,25.0,'2026-06-05 08:53:01'),(2,3,'2026-05-15',71.2,27.5,29.0,24.7,'2026-06-05 08:53:01'),(3,3,'2026-06-05',70.5,27.0,29.2,24.5,'2026-06-05 08:53:01'),(4,4,'2026-04-28',85.0,22.0,38.0,27.0,'2026-06-05 08:53:01'),(5,4,'2026-05-15',84.2,21.5,38.5,26.8,'2026-06-05 08:53:01'),(6,4,'2026-06-05',83.5,21.0,39.0,26.5,'2026-06-05 08:53:01'),(7,5,'2026-04-28',65.0,30.0,24.0,23.5,'2026-06-05 08:53:01'),(8,5,'2026-05-15',64.5,29.5,24.3,23.3,'2026-06-05 08:53:01'),(9,5,'2026-06-05',64.0,29.0,24.5,23.1,'2026-06-05 08:53:01'),(10,1,'2026-04-28',78.0,18.0,42.0,23.8,'2026-06-05 08:53:01'),(11,1,'2026-06-05',77.2,17.5,42.5,23.5,'2026-06-05 08:53:01');
/*!40000 ALTER TABLE `body_metrics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `certifications`
--

DROP TABLE IF EXISTS `certifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certifications` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `certifications`
--

LOCK TABLES `certifications` WRITE;
/*!40000 ALTER TABLE `certifications` DISABLE KEYS */;
INSERT INTO `certifications` VALUES (1,'nasm-cpt','NASM CPT'),(2,'ace-cpt','ACE CPT'),(3,'nsca-cscs','NSCA CSCS'),(4,'issa-cpt','ISSA CPT'),(5,'acf-l1','ACF Level 1'),(6,'crossfit-l2','CrossFit Level 2'),(7,'precision-nutrition','Precision Nutrition'),(8,'other','Other');
/*!40000 ALTER TABLE `certifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `challenge_participants`
--

DROP TABLE IF EXISTS `challenge_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `challenge_participants`
--

LOCK TABLES `challenge_participants` WRITE;
/*!40000 ALTER TABLE `challenge_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `challenge_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `challenges`
--

DROP TABLE IF EXISTS `challenges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `challenges`
--

LOCK TABLES `challenges` WRITE;
/*!40000 ALTER TABLE `challenges` DISABLE KEYS */;
/*!40000 ALTER TABLE `challenges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_messages`
--

DROP TABLE IF EXISTS `contact_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_messages`
--

LOCK TABLES `contact_messages` WRITE;
/*!40000 ALTER TABLE `contact_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversations`
--

DROP TABLE IF EXISTS `conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversations`
--

LOCK TABLES `conversations` WRITE;
/*!40000 ALTER TABLE `conversations` DISABLE KEYS */;
INSERT INTO `conversations` VALUES (1,2,3,'a','2026-06-06 17:26:05','2026-06-05 09:15:29');
/*!40000 ALTER TABLE `conversations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_checkins`
--

DROP TABLE IF EXISTS `daily_checkins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_checkins`
--

LOCK TABLES `daily_checkins` WRITE;
/*!40000 ALTER TABLE `daily_checkins` DISABLE KEYS */;
/*!40000 ALTER TABLE `daily_checkins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exercise_library`
--

DROP TABLE IF EXISTS `exercise_library`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exercise_library`
--

LOCK TABLES `exercise_library` WRITE;
/*!40000 ALTER TABLE `exercise_library` DISABLE KEYS */;
INSERT INTO `exercise_library` VALUES (1,'Dumbbell Bench Press','chest','pectorals','Dumbbell bench press for chest','','','intermediate','dumbbell','Lie on flat bench, press dumbbells up from chest','2026-06-06 15:52:45'),(2,'Goblet Squat','legs','quadriceps','Goblet squat for leg strength','','','beginner','dumbbell','Hold dumbbell at chest, squat down keeping torso upright','2026-06-06 15:52:45'),(3,'Dumbbell Row','back','lats','Single arm dumbbell row for back','','','intermediate','dumbbell','Hinge at hip, row dumbbell to hip keeping back straight','2026-06-06 15:52:45');
/*!40000 ALTER TABLE `exercise_library` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exercises`
--

DROP TABLE IF EXISTS `exercises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exercises`
--

LOCK TABLES `exercises` WRITE;
/*!40000 ALTER TABLE `exercises` DISABLE KEYS */;
/*!40000 ALTER TABLE `exercises` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `followers`
--

DROP TABLE IF EXISTS `followers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `followers`
--

LOCK TABLES `followers` WRITE;
/*!40000 ALTER TABLE `followers` DISABLE KEYS */;
/*!40000 ALTER TABLE `followers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_likes`
--

DROP TABLE IF EXISTS `forum_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_likes` (
  `user_id` int unsigned NOT NULL,
  `reply_id` int unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`reply_id`),
  KEY `reply_id` (`reply_id`),
  CONSTRAINT `forum_likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_likes_ibfk_2` FOREIGN KEY (`reply_id`) REFERENCES `forum_replies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_likes`
--

LOCK TABLES `forum_likes` WRITE;
/*!40000 ALTER TABLE `forum_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `forum_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_replies`
--

DROP TABLE IF EXISTS `forum_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_replies`
--

LOCK TABLES `forum_replies` WRITE;
/*!40000 ALTER TABLE `forum_replies` DISABLE KEYS */;
/*!40000 ALTER TABLE `forum_replies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_topics`
--

DROP TABLE IF EXISTS `forum_topics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_topics`
--

LOCK TABLES `forum_topics` WRITE;
/*!40000 ALTER TABLE `forum_topics` DISABLE KEYS */;
/*!40000 ALTER TABLE `forum_topics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `languages`
--

DROP TABLE IF EXISTS `languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `languages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `languages`
--

LOCK TABLES `languages` WRITE;
/*!40000 ALTER TABLE `languages` DISABLE KEYS */;
INSERT INTO `languages` VALUES (5,'Deutsch'),(1,'English'),(2,'Español'),(4,'Français'),(6,'Italiano'),(3,'Português'),(9,'العربية'),(10,'हिन्दी'),(8,'中文'),(7,'日本語');
/*!40000 ALTER TABLE `languages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leaderboard_entries`
--

DROP TABLE IF EXISTS `leaderboard_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leaderboard_entries`
--

LOCK TABLES `leaderboard_entries` WRITE;
/*!40000 ALTER TABLE `leaderboard_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `leaderboard_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,1,2,'Hola maria','2026-06-05 09:15:34'),(2,1,3,'Hola Alex','2026-06-05 09:16:13'),(3,1,2,'Que tal? veo que estas un poco mal de forma','2026-06-05 09:17:17'),(4,1,3,'no he comido we xd','2026-06-05 09:17:24'),(5,1,2,'xd','2026-06-06 15:57:47'),(6,1,3,'hola','2026-06-06 17:24:16'),(7,1,2,'a','2026-06-06 17:26:05');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nutrition_logs`
--

DROP TABLE IF EXISTS `nutrition_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `nutrition_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nutrition_logs`
--

LOCK TABLES `nutrition_logs` WRITE;
/*!40000 ALTER TABLE `nutrition_logs` DISABLE KEYS */;
INSERT INTO `nutrition_logs` VALUES (1,3,'2026-06-05',1800,1650,120.5,150.0,180.0,200.0,55.0,60.0,6,1,1,1,0,'2026-06-05 08:53:01','2026-06-05 08:53:01'),(2,4,'2026-06-05',2500,2300,180.0,200.0,250.0,280.0,70.0,80.0,5,1,1,1,1,'2026-06-05 08:53:01','2026-06-05 08:53:01'),(3,5,'2026-06-05',1700,1200,85.0,120.0,130.0,180.0,40.0,55.0,4,1,1,0,0,'2026-06-05 08:53:01','2026-06-05 08:53:01'),(4,1,'2026-06-05',2000,1900,130.0,160.0,210.0,230.0,60.0,65.0,7,1,1,1,1,'2026-06-05 08:53:01','2026-06-05 08:53:01'),(5,3,'2026-06-06',1940,0,0.0,150.0,0.0,220.0,0.0,65.0,8,0,0,0,0,'2026-06-06 19:34:51','2026-06-06 19:34:51');
/*!40000 ALTER TABLE `nutrition_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_resets`
--

LOCK TABLES `password_resets` WRITE;
/*!40000 ALTER TABLE `password_resets` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_resets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plan_features`
--

DROP TABLE IF EXISTS `plan_features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_features`
--

LOCK TABLES `plan_features` WRITE;
/*!40000 ALTER TABLE `plan_features` DISABLE KEYS */;
INSERT INTO `plan_features` VALUES (1,1,'Workout tracker',1,1),(2,1,'Basic progress reports',1,2),(3,1,'Email support',1,3),(4,1,'Live coaching sessions',0,4),(5,1,'Nutrition plans',0,5),(6,2,'Everything in Starter',1,1),(7,2,'Unlimited live coaching',1,2),(8,2,'AI-powered programming',1,3),(9,2,'Custom nutrition plans',1,4),(10,2,'Priority support',1,5),(11,3,'Everything in Pro',1,1),(12,3,'1-on-1 personal coaching',1,2),(13,3,'Premium nutrition prescription',1,3),(14,3,'Body composition analysis',1,4),(15,3,'Early access to new features',1,5);
/*!40000 ALTER TABLE `plan_features` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `program_reviews`
--

DROP TABLE IF EXISTS `program_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `program_reviews`
--

LOCK TABLES `program_reviews` WRITE;
/*!40000 ALTER TABLE `program_reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `program_reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `programs`
--

DROP TABLE IF EXISTS `programs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `programs`
--

LOCK TABLES `programs` WRITE;
/*!40000 ALTER TABLE `programs` DISABLE KEYS */;
INSERT INTO `programs` VALUES (1,1,'HIIT Inferno','High-intensity interval training designed to torch calories and boost cardiovascular endurance.','HIIT','30-45 min',8,4,'advanced',NULL,0.0,0,'active','2026-06-05 14:53:00','2026-06-05 14:53:00'),(2,1,'Total Strength','Full-body strength training program focusing on compound lifts and progressive overload.','Strength','45-60 min',12,4,'intermediate',NULL,0.0,0,'active','2026-06-05 14:53:00','2026-06-05 14:53:00'),(3,1,'Upper Body Power','Targeted upper body program to build strength and definition in chest, back, and arms.','Upper Body','40-50 min',8,3,'intermediate',NULL,0.0,0,'active','2026-06-05 14:53:00','2026-06-05 14:53:00'),(4,1,'Yoga Flow','Relaxing yoga flow for flexibility, mobility, and mental wellness, suitable for all levels.','Yoga','45-60 min',6,4,'beginner',NULL,0.0,0,'active','2026-06-05 14:53:00','2026-06-05 14:53:00');
/*!40000 ALTER TABLE `programs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `progress_photos`
--

DROP TABLE IF EXISTS `progress_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `progress_photos`
--

LOCK TABLES `progress_photos` WRITE;
/*!40000 ALTER TABLE `progress_photos` DISABLE KEYS */;
/*!40000 ALTER TABLE `progress_photos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rate_limits`
--

DROP TABLE IF EXISTS `rate_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rate_limits` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hits` int unsigned NOT NULL DEFAULT '1',
  `window_start` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ip_endpoint` (`ip_address`,`endpoint`),
  KEY `idx_window` (`window_start`)
) ENGINE=InnoDB AUTO_INCREMENT=533 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rate_limits`
--

LOCK TABLES `rate_limits` WRITE;
/*!40000 ALTER TABLE `rate_limits` DISABLE KEYS */;
INSERT INTO `rate_limits` VALUES (473,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:26:35'),(474,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:27:35'),(475,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:28:35'),(476,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:29:35'),(477,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:30:35'),(478,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:31:35'),(479,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:32:35'),(480,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:33:35'),(481,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:34:35'),(482,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:35:35'),(483,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:36:35'),(484,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:37:35'),(485,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:38:35'),(486,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:39:35'),(487,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:40:35'),(488,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:41:35'),(489,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:42:35'),(490,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:43:35'),(491,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:44:35'),(492,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:45:35'),(493,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:46:35'),(494,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:47:35'),(495,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:48:35'),(496,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:49:35'),(497,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:50:35'),(498,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:51:35'),(499,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:52:35'),(500,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:53:35'),(501,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:54:35'),(502,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:55:35'),(503,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:56:35'),(504,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:57:35'),(505,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:58:35'),(506,'127.0.0.1','/api/achievements/check',2,'2026-06-06 23:59:35'),(507,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:00:35'),(508,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:01:35'),(509,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:02:35'),(510,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:03:35'),(511,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:04:35'),(512,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:05:35'),(513,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:06:35'),(514,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:07:35'),(515,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:08:35'),(516,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:09:35'),(517,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:10:35'),(518,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:11:35'),(519,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:12:35'),(520,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:13:35'),(521,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:14:35'),(522,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:15:35'),(523,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:16:35'),(524,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:17:35'),(525,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:18:35'),(526,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:19:35'),(527,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:20:35'),(528,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:21:35'),(529,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:22:35'),(530,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:23:35'),(531,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:24:35'),(532,'127.0.0.1','/api/achievements/check',2,'2026-06-07 00:25:35');
/*!40000 ALTER TABLE `rate_limits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_throttle`
--

DROP TABLE IF EXISTS `login_throttle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_throttle` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `identifier` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` int unsigned NOT NULL DEFAULT '1',
  `locked_until` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `identifier` (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_throttle`
--

LOCK TABLES `login_throttle` WRITE;
/*!40000 ALTER TABLE `login_throttle` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_throttle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recipes`
--

DROP TABLE IF EXISTS `recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recipes`
--

LOCK TABLES `recipes` WRITE;
/*!40000 ALTER TABLE `recipes` DISABLE KEYS */;
/*!40000 ALTER TABLE `recipes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (1,3,1,NULL,5,'Amazing HIIT session! Alex really pushes you to your limits.','2026-05-04 08:00:00'),(2,3,1,NULL,4,'Great strength session, very well structured.','2026-05-05 10:15:00'),(3,4,1,NULL,5,'Best deadlift coaching I have ever had.','2026-05-05 10:30:00'),(4,4,1,NULL,4,'Good push day workout, felt the burn!','2026-05-05 12:00:00'),(5,5,1,NULL,5,'Perfect beginner yoga flow. I felt amazing afterwards!','2026-05-26 07:00:00');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `session_participants`
--

DROP TABLE IF EXISTS `session_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `session_participants`
--

LOCK TABLES `session_participants` WRITE;
/*!40000 ALTER TABLE `session_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `session_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `smart_routines`
--

DROP TABLE IF EXISTS `smart_routines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `smart_routines`
--

LOCK TABLES `smart_routines` WRITE;
/*!40000 ALTER TABLE `smart_routines` DISABLE KEYS */;
INSERT INTO `smart_routines` VALUES (1,3,'2026-06-05','Full Body Burn','full',45,'intermediate','[{\"name\": \"Mountain Climbers\", \"reps\": \"20\", \"rest\": 20, \"sets\": 3}, {\"name\": \"Goblet Squats\", \"reps\": \"12\", \"rest\": 45, \"sets\": 3}, {\"name\": \"Kettlebell Swings\", \"reps\": \"15\", \"rest\": 30, \"sets\": 3}, {\"name\": \"Clean & Press\", \"reps\": \"8\", \"rest\": 90, \"sets\": 3}, {\"name\": \"Push Ups\", \"reps\": \"15\", \"rest\": 30, \"sets\": 3}]',0,NULL,'2026-06-05 08:59:46'),(2,3,'2026-06-06','Cardio Body Burn','cardio',45,'intermediate','[{\"name\": \"Burpees\", \"reps\": \"12\", \"rest\": 20, \"sets\": 3}, {\"name\": \"Row Machine\", \"reps\": \"45s\", \"rest\": 15, \"sets\": 3}, {\"name\": \"Jump Rope\", \"reps\": \"60s\", \"rest\": 15, \"sets\": 3}, {\"name\": \"Box Jumps\", \"reps\": \"10\", \"rest\": 30, \"sets\": 3}, {\"name\": \"High Knees\", \"reps\": \"30s\", \"rest\": 15, \"sets\": 3}]',0,NULL,'2026-06-06 17:22:12'),(3,3,'2026-06-07','Core Body Burn','core',45,'intermediate','[{\"name\": \"Plank\", \"reps\": \"60s\", \"rest\": 20, \"sets\": 3}, {\"name\": \"Bicycle Kicks\", \"reps\": \"20\", \"rest\": 15, \"sets\": 3}, {\"name\": \"Russian Twists\", \"reps\": \"20\", \"rest\": 20, \"sets\": 3}, {\"name\": \"Leg Raises\", \"reps\": \"15\", \"rest\": 20, \"sets\": 3}, {\"name\": \"Crunches\", \"reps\": \"20\", \"rest\": 15, \"sets\": 3}]',0,NULL,'2026-06-06 18:16:00');
/*!40000 ALTER TABLE `smart_routines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `social_comments`
--

DROP TABLE IF EXISTS `social_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `social_comments`
--

LOCK TABLES `social_comments` WRITE;
/*!40000 ALTER TABLE `social_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `social_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `social_likes`
--

DROP TABLE IF EXISTS `social_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `social_likes`
--

LOCK TABLES `social_likes` WRITE;
/*!40000 ALTER TABLE `social_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `social_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `social_posts`
--

DROP TABLE IF EXISTS `social_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `social_posts`
--

LOCK TABLES `social_posts` WRITE;
/*!40000 ALTER TABLE `social_posts` DISABLE KEYS */;
/*!40000 ALTER TABLE `social_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `specializations`
--

DROP TABLE IF EXISTS `specializations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `specializations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `specializations`
--

LOCK TABLES `specializations` WRITE;
/*!40000 ALTER TABLE `specializations` DISABLE KEYS */;
INSERT INTO `specializations` VALUES (1,'strength','Strength'),(2,'hiit','HIIT'),(3,'yoga','Yoga'),(4,'boxing','Boxing'),(5,'cycling','Cycling'),(6,'nutrition','Nutrition'),(7,'rehab','Rehab'),(8,'functional','Functional'),(9,'calisthenics','Calisthenics'),(10,'prepost-natal','Pre/Post-natal'),(11,'crossfit','CrossFit');
/*!40000 ALTER TABLE `specializations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_plans`
--

LOCK TABLES `subscription_plans` WRITE;
/*!40000 ALTER TABLE `subscription_plans` DISABLE KEYS */;
INSERT INTO `subscription_plans` VALUES (1,'Starter','Perfect to get started with essential features.',29.00,19.00,0,'active','2026-06-05 08:53:01'),(2,'Pro','Best for serious athletes who want real results.',79.00,59.00,1,'active','2026-06-05 08:53:01'),(3,'Enterprise','For the full experience with everything included.',199.00,149.00,0,'active','2026-06-05 08:53:01');
/*!40000 ALTER TABLE `subscription_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_tickets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `trainer_id` int unsigned DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('open','in_progress','critical','resolved','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `trainer_id` (`trainer_id`),
  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `support_tickets_ibfk_2` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_tickets`
--

LOCK TABLES `support_tickets` WRITE;
/*!40000 ALTER TABLE `support_tickets` DISABLE KEYS */;
INSERT INTO `support_tickets` VALUES (1,3,NULL,'Cannot access workout videos','Hi, I am unable to play the videos in the HIIT Inferno program. They keep buffering and never load.','open','2026-05-25 10:30:00','2026-06-05 08:53:01'),(2,4,NULL,'Billing question','I was charged twice for my subscription this month. Can you help me get a refund for the duplicate charge?','in_progress','2026-05-26 14:15:00','2026-06-05 08:53:01'),(3,5,NULL,'Need help with meal plan','The nutrition plan seems too restrictive for my lifestyle. Can I get some modifications or alternatives?','open','2026-05-27 09:00:00','2026-06-05 08:53:01'),(4,1,NULL,'Feature request: Dark mode','Would be great to have a dark mode option in the mobile app. The white background is very bright at night.','resolved','2026-05-20 16:00:00','2026-06-05 08:53:01');
/*!40000 ALTER TABLE `support_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_replies`
--

DROP TABLE IF EXISTS `ticket_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_replies` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `ticket_replies_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_replies_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `trainer_certification`
--

DROP TABLE IF EXISTS `trainer_certification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trainer_certification`
--

LOCK TABLES `trainer_certification` WRITE;
/*!40000 ALTER TABLE `trainer_certification` DISABLE KEYS */;
/*!40000 ALTER TABLE `trainer_certification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trainer_language`
--

DROP TABLE IF EXISTS `trainer_language`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trainer_language` (
  `trainer_id` int unsigned NOT NULL,
  `language_id` int unsigned NOT NULL,
  PRIMARY KEY (`trainer_id`,`language_id`),
  KEY `language_id` (`language_id`),
  CONSTRAINT `trainer_language_ibfk_1` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trainer_language_ibfk_2` FOREIGN KEY (`language_id`) REFERENCES `languages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trainer_language`
--

LOCK TABLES `trainer_language` WRITE;
/*!40000 ALTER TABLE `trainer_language` DISABLE KEYS */;
/*!40000 ALTER TABLE `trainer_language` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trainer_specialization`
--

DROP TABLE IF EXISTS `trainer_specialization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trainer_specialization` (
  `trainer_id` int unsigned NOT NULL,
  `specialization_id` int unsigned NOT NULL,
  PRIMARY KEY (`trainer_id`,`specialization_id`),
  KEY `specialization_id` (`specialization_id`),
  CONSTRAINT `trainer_specialization_ibfk_1` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trainer_specialization_ibfk_2` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trainer_specialization`
--

LOCK TABLES `trainer_specialization` WRITE;
/*!40000 ALTER TABLE `trainer_specialization` DISABLE KEYS */;
INSERT INTO `trainer_specialization` VALUES (1,1),(1,2),(1,8);
/*!40000 ALTER TABLE `trainer_specialization` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trainers`
--

DROP TABLE IF EXISTS `trainers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `status` enum('pending','approved','rejected','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'approved',
  `avg_rating` decimal(2,1) NOT NULL DEFAULT '0.0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `trainers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trainers`
--

LOCK TABLES `trainers` WRITE;
/*!40000 ALTER TABLE `trainers` DISABLE KEYS */;
INSERT INTO `trainers` VALUES (1,2,'Alex','Rivera','alex.rivera@fitpower.com','+1-555-0101','1985-03-15','male',NULL,'10+','Certified personal trainer with over 10 years of experience helping clients achieve their fitness goals through science-based programming.','I believe in sustainable fitness through progressive overload, proper nutrition, and consistency. Every journey is unique.',NULL,NULL,NULL,'United States','Miami','America/New_York','hybrid',NULL,NULL,NULL,1,1,1,'approved',0.0,'2026-06-05 14:53:00','2026-06-05 14:53:00');
/*!40000 ALTER TABLE `trainers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_achievements`
--

DROP TABLE IF EXISTS `user_achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_achievements` (
  `user_id` int unsigned NOT NULL,
  `achievement_id` int unsigned NOT NULL,
  `unlocked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`achievement_id`),
  KEY `achievement_id` (`achievement_id`),
  CONSTRAINT `user_achievements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_achievements_ibfk_2` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_achievements`
--

LOCK TABLES `user_achievements` WRITE;
/*!40000 ALTER TABLE `user_achievements` DISABLE KEYS */;
INSERT INTO `user_achievements` VALUES (1,1,'2026-05-10 10:00:00'),(1,2,'2026-04-20 09:30:00'),(1,5,'2026-05-25 08:00:00'),(1,6,'2026-05-15 11:00:00'),(3,1,'2026-05-20 07:00:00'),(3,2,'2026-05-18 10:30:00'),(3,4,'2026-05-22 09:00:00'),(4,1,'2026-05-12 08:00:00'),(4,3,'2026-05-15 11:00:00'),(5,1,'2026-05-27 06:30:00');
/*!40000 ALTER TABLE `user_achievements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_programs`
--

DROP TABLE IF EXISTS `user_programs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_programs`
--

LOCK TABLES `user_programs` WRITE;
/*!40000 ALTER TABLE `user_programs` DISABLE KEYS */;
INSERT INTO `user_programs` VALUES (1,3,1,45.00,4,'active','2026-05-01 00:00:00',NULL),(2,3,2,25.00,3,'active','2026-05-01 00:00:00',NULL),(3,4,2,35.00,5,'active','2026-05-01 00:00:00',NULL),(4,4,3,60.00,5,'active','2026-05-01 00:00:00',NULL),(5,5,4,15.00,1,'active','2026-05-26 00:00:00',NULL),(6,1,1,80.00,7,'active','2026-04-01 00:00:00',NULL);
/*!40000 ALTER TABLE `user_programs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_subscriptions`
--

DROP TABLE IF EXISTS `user_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `user_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_subscriptions`
--

LOCK TABLES `user_subscriptions` WRITE;
/*!40000 ALTER TABLE `user_subscriptions` DISABLE KEYS */;
INSERT INTO `user_subscriptions` VALUES (1,1,3,'yearly','active','2026-01-01 00:00:00','2027-06-05 23:59:59',NULL,NULL),(2,2,2,'monthly','active','2026-03-01 00:00:00',NULL,NULL,NULL),(3,3,2,'monthly','active','2026-04-15 00:00:00',NULL,NULL,NULL),(4,4,2,'yearly','active','2026-02-01 00:00:00','2027-06-05 23:59:59',NULL,NULL),(5,5,1,'monthly','active','2026-05-01 00:00:00',NULL,NULL,NULL);
/*!40000 ALTER TABLE `user_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin','User','admin@fitpower.com','admin','$2y$10$7VFxpUQkESaidvj.t5SVuuaOftSoTIVpZdFRQNXB/bT1jcbwHljry','advanced','wellness',5,NULL,'2026-06-05 14:53:00',NULL,'active','2026-06-05 14:53:00','2026-06-05 14:53:00',NULL,NULL),(2,'Alex','Rivera','alex.rivera@fitpower.com','coach','$2y$10$7VFxpUQkESaidvj.t5SVuuaOftSoTIVpZdFRQNXB/bT1jcbwHljry','advanced','muscle',6,NULL,'2026-06-05 14:53:00',NULL,'active','2026-06-05 14:53:00','2026-06-05 14:53:00',NULL,NULL),(3,'Maria','Garcia','maria.garcia@fitpower.com','client','$2y$10$7VFxpUQkESaidvj.t5SVuuaOftSoTIVpZdFRQNXB/bT1jcbwHljry','intermediate','fat-loss',4,NULL,'2026-06-05 14:53:00',NULL,'active','2026-06-05 14:53:00','2026-06-05 14:53:00',NULL,NULL),(4,'Juan','Perez','juan.perez@fitpower.com','client','$2y$10$7VFxpUQkESaidvj.t5SVuuaOftSoTIVpZdFRQNXB/bT1jcbwHljry','intermediate','muscle',5,NULL,'2026-06-05 14:53:00',NULL,'active','2026-06-05 14:53:00','2026-06-05 14:53:00',NULL,NULL),(5,'Laura','Martinez','laura.martinez@fitpower.com','client','$2y$10$7VFxpUQkESaidvj.t5SVuuaOftSoTIVpZdFRQNXB/bT1jcbwHljry','beginner','wellness',3,NULL,'2026-06-05 14:53:00',NULL,'active','2026-06-05 14:53:00','2026-06-05 14:53:00',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `video_sessions`
--

DROP TABLE IF EXISTS `video_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `video_sessions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `caller_id` int unsigned NOT NULL,
  `callee_id` int unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Video Session',
  `status` enum('pending','active','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_caller` (`caller_id`),
  KEY `idx_callee` (`callee_id`),
  CONSTRAINT `video_sessions_ibfk_1` FOREIGN KEY (`caller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `video_sessions_ibfk_2` FOREIGN KEY (`callee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `video_sessions`
--

LOCK TABLES `video_sessions` WRITE;
/*!40000 ALTER TABLE `video_sessions` DISABLE KEYS */;
INSERT INTO `video_sessions` VALUES (1,2,3,'Session with client','completed','2026-06-06 17:29:40','2026-06-06 17:29:54'),(2,2,3,'Session with client','completed','2026-06-06 17:33:15','2026-06-06 17:33:20'),(3,2,3,'Session with client','completed','2026-06-06 17:38:15','2026-06-06 17:38:32'),(4,2,3,'Session with client','completed','2026-06-06 17:44:26','2026-06-06 17:50:26'),(5,2,3,'Session with client','completed','2026-06-06 17:50:35','2026-06-06 17:50:38'),(6,2,3,'Session with client','completed','2026-06-06 17:50:44','2026-06-06 17:50:47'),(7,2,3,'Session with client','completed','2026-06-06 17:51:18','2026-06-06 17:51:22'),(8,2,3,'Session with client','completed','2026-06-06 17:51:33','2026-06-06 17:51:35'),(9,2,3,'Session with client','completed','2026-06-06 17:51:47','2026-06-06 17:51:48'),(10,2,3,'Session with client','completed','2026-06-06 17:57:10','2026-06-06 17:57:39'),(11,2,3,'Session with client','completed','2026-06-06 17:58:29','2026-06-06 17:58:58'),(12,2,3,'Session with client','completed','2026-06-06 17:59:23','2026-06-06 17:59:39'),(13,2,3,'Session with client','completed','2026-06-06 18:46:15','2026-06-06 18:46:35'),(14,2,3,'Session with client','completed','2026-06-06 19:24:11','2026-06-06 19:24:34'),(15,2,3,'Session with client','completed','2026-06-06 19:34:13','2026-06-06 19:34:26'),(16,2,3,'Session with client','completed','2026-06-06 19:42:00','2026-06-06 19:42:19'),(17,2,3,'Session with client','completed','2026-06-06 19:42:34','2026-06-06 19:42:56'),(18,2,3,'pRUEBA','completed','2026-06-06 19:48:04','2026-06-06 19:48:27'),(19,2,3,'Session with client','completed','2026-06-06 19:55:22','2026-06-06 19:56:49'),(20,2,3,'Session with client','completed','2026-06-06 20:05:56','2026-06-06 20:10:45'),(21,2,3,'Session with client','completed','2026-06-06 20:13:43','2026-06-06 20:18:06'),(22,2,3,'Session with client','completed','2026-06-06 20:18:16','2026-06-06 20:19:52'),(23,2,3,'Session with client','completed','2026-06-06 20:33:15','2026-06-06 20:45:35'),(24,2,3,'Session with client','completed','2026-06-06 20:45:43','2026-06-06 20:49:45'),(25,2,3,'Session with client','completed','2026-06-06 20:50:50','2026-06-06 20:54:58'),(26,2,3,'Session with client','completed','2026-06-06 20:50:50','2026-06-06 21:02:57'),(27,2,3,'Session with client','completed','2026-06-06 21:03:00','2026-06-06 21:15:15'),(28,2,3,'Session with client','completed','2026-06-06 21:24:28','2026-06-06 21:25:12'),(29,2,3,'Session with client','active','2026-06-06 21:28:54','2026-06-06 21:29:15');
/*!40000 ALTER TABLE `video_sessions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-07  0:26:25

-- ----------------------------------------------------
-- Refresh Tokens table for JWT token rotation
-- ----------------------------------------------------

DROP TABLE IF EXISTS `refresh_tokens`;
CREATE TABLE `refresh_tokens` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------
-- Client Notes table for coach notes on clients
-- ----------------------------------------------------

DROP TABLE IF EXISTS `client_notes`;
CREATE TABLE `client_notes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `coach_id` int unsigned NOT NULL,
  `client_id` int unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `category` enum('general','nutrition','training','progress','health') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_coach_client` (`coach_id`,`client_id`),
  KEY `idx_client` (`client_id`),
  CONSTRAINT `client_notes_ibfk_1` FOREIGN KEY (`coach_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_notes_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
