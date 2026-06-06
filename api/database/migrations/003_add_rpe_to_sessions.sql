ALTER TABLE sessions ADD COLUMN rpe TINYINT DEFAULT NULL COMMENT 'Rate of Perceived Exertion 1-10';
ALTER TABLE sessions ADD COLUMN rpe_notes TEXT DEFAULT NULL COMMENT 'Post-workout notes';
