<?php

function listProgramReviews(string $programId): void {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT pr.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.photo as user_photo
        FROM program_reviews pr
        JOIN users u ON u.id = pr.user_id
        WHERE pr.program_id = ?
        ORDER BY pr.created_at DESC
    ");
    $stmt->execute([$programId]);
    $reviews = $stmt->fetchAll();

    $avgStmt = $db->prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM program_reviews WHERE program_id = ?");
    $avgStmt->execute([$programId]);
    $stats = $avgStmt->fetch();

    success([
        'reviews' => $reviews,
        'avgRating' => $stats['avg_rating'] ? round((float)$stats['avg_rating'], 1) : 0,
        'total' => (int)$stats['total'],
    ]);
}

function createProgramReview(): void {
    $auth = requireAuth();
    $input = getJsonInput();
    $rules = ['programId' => 'required', 'rating' => 'required|numeric|min:1|max:5'];
    $errors = validate($input, $rules);
    if ($errors) error('Error de validación', 422, $errors);

    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM program_reviews WHERE user_id = ? AND program_id = ?");
    $stmt->execute([$auth['sub'], $input['programId']]);
    if ($stmt->fetch()) {
        $db->prepare("UPDATE program_reviews SET rating = ?, comment = ? WHERE user_id = ? AND program_id = ?")
            ->execute([$input['rating'], $input['comment'] ?? null, $auth['sub'], $input['programId']]);
        success(null, 'Review actualizada');
    } else {
        $db->prepare("INSERT INTO program_reviews (user_id, program_id, rating, comment) VALUES (?, ?, ?, ?)")
            ->execute([$auth['sub'], $input['programId'], $input['rating'], $input['comment'] ?? null]);

        $pStmt = $db->prepare("SELECT AVG(rating) FROM program_reviews WHERE program_id = ?");
        $pStmt->execute([$input['programId']]);
        $avg = $pStmt->fetchColumn();

        $db->prepare("UPDATE programs SET avg_rating = ? WHERE id = ?")->execute([round((float)$avg, 1), $input['programId']]);

        success(null, 'Review creada', 201);
    }
}
