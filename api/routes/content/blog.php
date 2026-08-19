<?php

function listArticles(): void {
    $db = getDB();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 12)));
    $offset = ($page - 1) * $perPage;
    $category = $_GET['category'] ?? '';

    $where = "WHERE a.status = 'published'";
    $params = [];
    if ($category) {
        $where .= " AND a.category = ?";
        $params[] = $category;
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM articles a $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("
        SELECT a.id, a.title, a.slug, a.excerpt, a.cover_image, a.category, a.tags, a.published_at,
               CONCAT(u.first_name, ' ', u.last_name) as author_name
        FROM articles a
        LEFT JOIN users u ON u.id = a.author_id
        $where
        ORDER BY a.published_at DESC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($params);

    success([
        'articles' => $stmt->fetchAll(),
        'total' => $total,
        'page' => $page,
    ]);
}

function getArticle(string $slug): void {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) as author_name
        FROM articles a
        LEFT JOIN users u ON u.id = a.author_id
        WHERE a.slug = ? AND a.status = 'published'
    ");
    $stmt->execute([$slug]);
    $article = $stmt->fetch();
    if (!$article) {
        error('Article not found', 404);
    }
    $article['tags'] = json_decode($article['tags'] ?? '[]', true);
    success($article);
}

function createArticle(): void {
    $auth = requireRole('admin');
    $input = getJsonInput();
    $rules = [
        'title' => 'required|string|min:1|max:255',
        'content' => 'required|string|min:1|max:100000',
        'slug' => 'string|max:255',
        'excerpt' => 'string|max:1000',
        'coverImage' => 'string|max:255',
        'category' => 'string|max:100',
        'status' => 'in:draft,published,archived',
    ];
    $errors = validate($input, $rules);
    if ($errors) error('Validation error', 422, $errors);

    $slug = $input['slug'] ?? strtolower(trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($input['title'])), '-'));
    if ($slug === '') $slug = 'post-' . bin2hex(random_bytes(4));
    $slug = mb_substr($slug, 0, 255);
    $db = getDB();
    $stmt = $db->prepare("
        INSERT INTO articles (author_id, title, slug, excerpt, content, cover_image, category, tags, status, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $auth['sub'], $input['title'], $slug, $input['excerpt'] ?? null,
        $input['content'], $input['coverImage'] ?? null, $input['category'] ?? null,
        json_encode($input['tags'] ?? []), $input['status'] ?? 'draft',
        $input['status'] === 'published' ? date('Y-m-d H:i:s') : null,
    ]);
    success(['id' => (int)$db->lastInsertId(), 'slug' => $slug], 'Article created', 201);
}

function updateArticle(string $id): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $db = getDB();
    $stmt = $db->prepare("SELECT id, author_id, published_at FROM articles WHERE id = ?");
    $stmt->execute([(int)$id]);
    $article = $stmt->fetch();
    if (!$article) error('Article not found', 404);
    if ((int)$article['author_id'] !== $auth['sub'] && $auth['role'] !== 'admin') {
        error('You do not have permission to edit this article', 403);
    }
    $validationRules = [];
    if (isset($input['title'])) $validationRules['title'] = 'string|min:1|max:255';
    if (isset($input['content'])) $validationRules['content'] = 'string|min:1|max:100000';
    if (isset($input['status'])) $validationRules['status'] = 'in:draft,published,archived';
    if (isset($input['excerpt'])) $validationRules['excerpt'] = 'string|max:1000';
    if (isset($input['coverImage'])) $validationRules['coverImage'] = 'string|max:255';
    if (isset($input['category'])) $validationRules['category'] = 'string|max:100';
    if (isset($input['slug'])) $validationRules['slug'] = 'string|max:255';
    if ($validationRules) {
        $errors = validate($input, $validationRules);
        if ($errors) error('Validation error', 422, $errors);
    }
    $fieldMap = [
        'title' => 'title',
        'excerpt' => 'excerpt',
        'content' => 'content',
        'coverImage' => 'cover_image',
        'category' => 'category',
    ];
    $updates = [];
    $params = [];
    foreach ($fieldMap as $inputKey => $dbColumn) {
        if (isset($input[$inputKey])) {
            $updates[] = "$dbColumn = ?";
            $params[] = $input[$inputKey];
        }
    }
    if (isset($input['slug'])) {
        $updates[] = "slug = ?";
        $params[] = $input['slug'];
    }
    if (isset($input['tags'])) {
        $updates[] = "tags = ?";
        $params[] = json_encode($input['tags']);
    }
    if (isset($input['status'])) {
        $updates[] = "status = ?";
        $params[] = $input['status'];
        if ($input['status'] === 'published' && !$article['published_at']) {
            $updates[] = "published_at = NOW()";
        }
    }
    if (empty($updates)) error('No fields to update', 400);
    $updates[] = "updated_at = NOW()";
    $params[] = (int)$id;
    $db->prepare("UPDATE articles SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
    success(null, 'Article updated');
}

function deleteArticle(string $id): void {
    $auth = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT id, author_id FROM articles WHERE id = ?");
    $stmt->execute([(int)$id]);
    $article = $stmt->fetch();
    if (!$article) error('Article not found', 404);
    if ((int)$article['author_id'] !== $auth['sub'] && $auth['role'] !== 'admin') {
        error('You do not have permission to delete this article', 403);
    }
    $db->prepare("DELETE FROM articles WHERE id = ?")->execute([(int)$id]);
    success(null, 'Article deleted');
}
