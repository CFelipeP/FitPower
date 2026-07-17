<?php

function publicListTrainers(): void {
    $db = getDB();

    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(1, (int)($_GET['perPage'] ?? 12)));
    $offset = ($page - 1) * $perPage;
    $search = $_GET['search'] ?? '';
    $specialization = $_GET['specialization'] ?? '';
    $modality = $_GET['modality'] ?? '';

    $where = ["t.status = 'approved'"];
    $params = [];

    if ($search) {
        $where[] = "(t.first_name LIKE ? OR t.last_name LIKE ? OR t.bio LIKE ?)";
        $s = "%$search%";
        $params[] = $s; $params[] = $s; $params[] = $s;
    }

    if ($specialization) {
        $where[] = "EXISTS (SELECT 1 FROM trainer_specialization ts2 JOIN specializations s2 ON s2.id = ts2.specialization_id WHERE ts2.trainer_id = t.id AND s2.slug = ?)";
        $params[] = $specialization;
    }

    if ($modality) {
        $where[] = "t.modality = ?";
        $params[] = $modality;
    }

    $whereClause = 'WHERE ' . implode(' AND ', $where);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM trainers t $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare("
        SELECT t.id, t.first_name, t.last_name, t.photo, t.experience, t.bio,
            t.modality, t.country, t.city, t.avg_rating,
            GROUP_CONCAT(DISTINCT s.name SEPARATOR ', ') as specializations_list,
            GROUP_CONCAT(DISTINCT l.name SEPARATOR ', ') as languages_list
        FROM trainers t
        LEFT JOIN trainer_specialization ts ON ts.trainer_id = t.id
        LEFT JOIN specializations s ON s.id = ts.specialization_id
        LEFT JOIN trainer_language tl ON tl.trainer_id = t.id
        LEFT JOIN languages l ON l.id = tl.language_id
        $whereClause
        GROUP BY t.id
        ORDER BY t.avg_rating DESC, t.created_at DESC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($params);
    $trainers = $stmt->fetchAll();

    $trainers = array_map(function($t) {
        $specs = $t['specializations_list'] ? explode(', ', $t['specializations_list']) : [];
        $langs = $t['languages_list'] ? explode(', ', $t['languages_list']) : [];
        $reviewStmt = getDB()->prepare("SELECT COUNT(*) FROM reviews WHERE trainer_id = ?");
        $reviewStmt->execute([$t['id']]);
        $reviewCount = (int)$reviewStmt->fetchColumn();
        return [
            'id' => (int)$t['id'],
            'firstName' => $t['first_name'],
            'lastName' => $t['last_name'],
            'photo' => $t['photo'],
            'experience' => $t['experience'],
            'bio' => $t['bio'],
            'modality' => $t['modality'],
            'country' => $t['country'],
            'city' => $t['city'],
            'avgRating' => (float)$t['avg_rating'],
            'reviewCount' => $reviewCount,
            'specializations' => $specs,
            'languages' => $langs,
        ];
    }, $trainers);

    success([
        'trainers' => $trainers,
        'total' => $total,
        'page' => $page,
        'perPage' => $perPage,
    ]);
}

function publicGetTrainer(string $id): void {
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM trainers WHERE id = ? AND status = 'approved'");
    $stmt->execute([$id]);
    $trainer = $stmt->fetch();

    if (!$trainer) {
        error('Entrenador no encontrado', 404);
    }

    $specStmt = $db->prepare("
        SELECT s.id, s.name, s.slug
        FROM specializations s
        JOIN trainer_specialization ts ON ts.specialization_id = s.id
        WHERE ts.trainer_id = ?
    ");
    $specStmt->execute([$id]);
    $specs = $specStmt->fetchAll();

    $langStmt = $db->prepare("
        SELECT l.id, l.name
        FROM languages l
        JOIN trainer_language tl ON tl.language_id = l.id
        WHERE tl.trainer_id = ?
    ");
    $langStmt->execute([$id]);
    $langs = $langStmt->fetchAll();

    $certStmt = $db->prepare("
        SELECT c.name as certification, tc.cert_id_number, tc.cert_file
        FROM trainer_certification tc
        JOIN certifications c ON c.id = tc.certification_id
        WHERE tc.trainer_id = ?
    ");
    $certStmt->execute([$id]);
    $certs = $certStmt->fetchAll();

    $reviewStmt = $db->prepare("
        SELECT r.rating, r.comment, r.created_at,
               CONCAT(u.first_name, ' ', u.last_name) as user_name,
               u.photo as user_photo
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.trainer_id = ?
        ORDER BY r.created_at DESC
    ");
    $reviewStmt->execute([$id]);
    $reviews = $reviewStmt->fetchAll();

    $programStmt = $db->prepare("
        SELECT id, name, description, difficulty, duration_minutes, enrollments
        FROM programs
        WHERE trainer_id = ? AND status = 'active'
        ORDER BY enrollments DESC
        LIMIT 6
    ");
    $programStmt->execute([$id]);
    $programs = $programStmt->fetchAll();

    $reviewCountStmt = $db->prepare("SELECT COUNT(*) FROM reviews WHERE trainer_id = ?");
    $reviewCountStmt->execute([$id]);
    $reviewCount = (int)$reviewCountStmt->fetchColumn();

    success([
        'id' => (int)$trainer['id'],
        'firstName' => $trainer['first_name'],
        'lastName' => $trainer['last_name'],
        'photo' => $trainer['photo'],
        'experience' => $trainer['experience'],
        'bio' => $trainer['bio'],
        'philosophy' => $trainer['philosophy'],
        'modality' => $trainer['modality'],
        'country' => $trainer['country'],
        'city' => $trainer['city'],
        'specializations' => $specs,
        'languages' => $langs,
        'certifications' => $certs,
        'avgRating' => (float)$trainer['avg_rating'],
        'reviewCount' => $reviewCount,
        'reviews' => $reviews,
        'programs' => $programs,
        'social' => [
            'instagram' => $trainer['instagram'],
            'youtube' => $trainer['youtube'],
            'website' => $trainer['website'],
        ],
    ]);
}

function publicListSpecializations(): void {
    $db = getDB();
    $stmt = $db->query("SELECT id, name, slug FROM specializations ORDER BY name");
    success(['specializations' => $stmt->fetchAll()]);
}

function publicListTestimonials(): void {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT r.rating, r.comment, r.created_at,
               CONCAT(u.first_name, ' ', u.last_name) as user_name,
               u.photo as user_photo
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.rating >= 4 AND r.comment IS NOT NULL AND r.comment != ''
        ORDER BY r.created_at DESC
        LIMIT 10
    ");
    $stmt->execute();
    $reviews = $stmt->fetchAll();

    $reviews = array_map(function($r) {
        return [
            'rating' => (int)$r['rating'],
            'comment' => $r['comment'],
            'userName' => $r['user_name'],
            'userPhoto' => $r['user_photo'],
            'createdAt' => $r['created_at'],
        ];
    }, $reviews);

    success(['testimonials' => $reviews]);
}
