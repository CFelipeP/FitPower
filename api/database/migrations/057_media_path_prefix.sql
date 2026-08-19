UPDATE users SET photo = CONCAT('/api/', photo) WHERE photo LIKE 'uploads/%';
UPDATE progress_photos SET photo_url = CONCAT('/api/', photo_url) WHERE photo_url LIKE 'uploads/%' AND photo_url NOT LIKE '/%';
