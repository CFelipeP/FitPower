<?php

function deleteAccount(): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $errors = validate($input, ['password' => 'required|string']);
    if ($errors) {
        error('Validation error', 422, $errors);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$auth['sub']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($input['password'], $user['password'])) {
        error('Incorrect password', 401);
    }

    $db->prepare("DELETE FROM users WHERE id = ?")->execute([$auth['sub']]);

    success(null, 'Account deleted successfully');
}
