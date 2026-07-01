<?php

function changePassword(): void {
    $auth = requireAuth();
    $input = getJsonInput();

    $rules = [
        'currentPassword' => 'required|string|min:1',
        'newPassword' => 'required|string|min:8|max:255',
    ];

    $errors = validate($input, $rules);
    if ($errors) {
        error('Error de validación', 422, $errors);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$auth['sub']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($input['currentPassword'], $user['password'])) {
        error('Contraseña actual incorrecta', 401);
    }

    $hashedPassword = password_hash($input['newPassword'], PASSWORD_BCRYPT);
    $db->prepare("UPDATE users SET password = ? WHERE id = ?")
        ->execute([$hashedPassword, $auth['sub']]);

    success(null, 'Contraseña actualizada exitosamente');
}
