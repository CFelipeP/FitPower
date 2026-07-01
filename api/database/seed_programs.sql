-- Seed programs for landing page
-- Run: mysql -u root fitpower < database/seed_programs.sql

USE fitpower;

DELETE FROM user_programs;
DELETE FROM sessions;
DELETE FROM programs;
ALTER TABLE programs AUTO_INCREMENT = 1;

INSERT INTO programs (name, description, tag, duration_minutes, weeks, sessions_per_week, difficulty, image, enrollments, status, created_at, updated_at) VALUES
('HIIT Inferno',        'High-intensity interval training designed to torch calories and boost cardiovascular endurance.', 'High Intensity', '35', 8, 4, 'intermediate', 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=600&h=450&fit=crop', 0, 'active', NOW(), NOW()),
('Total Strength',      'Full-body strength training program focusing on compound lifts and progressive overload.',       'Strength',       '50', 12, 4, 'intermediate', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&h=450&fit=crop', 0, 'active', NOW(), NOW()),
('Upper Body Power',    'Targeted upper body program to build strength and definition in chest, back, and arms.',        'Upper Body',     '45', 8, 3, 'intermediate', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=450&fit=crop', 0, 'active', NOW(), NOW()),
('Yoga Flow',           'Relaxing yoga flow for flexibility, mobility, and mental wellness, suitable for all levels.',    'Mobility',       '40', 6, 4, 'beginner',    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=450&fit=crop', 0, 'active', NOW(), NOW()),
('Cardio Core Blast',   'Dynamic cardio and core program to build endurance and strengthen your midsection.',             'Cardio',         '30', 6, 5, 'beginner',    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=450&fit=crop', 0, 'active', NOW(), NOW()),
('Power & Plyo',        'Explosive plyometric training combined with powerlifting for athletic performance.',             'Plyometrics',    '45', 10, 4, 'advanced',   'https://images.unsplash.com/photo-1599058918144-1ffabb6ab9a0?w=600&h=450&fit=crop', 0, 'active', NOW(), NOW()),
('Bodyweight Mastery',  'Calisthenics program to build functional strength using only your body weight.',                 'Calisthenics',   '35', 8, 3, 'intermediate', 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&h=450&fit=crop', 0, 'active', NOW(), NOW()),
('Recovery & Stretch',  'Active recovery and stretching program to improve mobility and reduce injury risk.',             'Recovery',       '25', 4, 3, 'beginner',    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=450&fit=crop', 0, 'active', NOW(), NOW());
