ALTER TABLE exercise_library ADD COLUMN video_url VARCHAR(500) DEFAULT NULL COMMENT 'YouTube/Vimeo embed URL';
ALTER TABLE exercise_library ADD COLUMN image_url VARCHAR(500) DEFAULT NULL COMMENT 'Thumbnail/demo image URL';
