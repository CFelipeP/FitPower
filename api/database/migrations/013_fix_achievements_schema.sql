ALTER TABLE achievements ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT '' AFTER description;

ALTER TABLE achievements ADD COLUMN requirement INT UNSIGNED NOT NULL DEFAULT 0 AFTER type;

ALTER TABLE achievements ADD COLUMN points INT UNSIGNED NOT NULL DEFAULT 0 AFTER requirement;

UPDATE achievements SET type = 'streak', requirement = 7, points = 50 WHERE slug = '7-day-streak';

UPDATE achievements SET type = 'workouts', requirement = 1, points = 30 WHERE slug = 'first-pr';

UPDATE achievements SET type = 'workouts', requirement = 50, points = 100 WHERE slug = '50-workouts';

UPDATE achievements SET type = 'calories', requirement = 5000, points = 80 WHERE slug = '5k-calories';

UPDATE achievements SET type = 'streak', requirement = 30, points = 200 WHERE slug = '30-day-challenge';

UPDATE achievements SET type = 'points', requirement = 1000, points = 150 WHERE slug = 'consistency-king';

UPDATE achievements SET type = 'social', requirement = 10, points = 100 WHERE slug = 'community-hero';

UPDATE achievements SET type = 'points', requirement = 5000, points = 500 WHERE slug = 'master';
