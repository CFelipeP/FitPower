<?php

function jsonResponse(mixed $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function success(mixed $data = null, string $message = 'OK', int $status = 200): void {
    jsonResponse([
        'success' => true,
        'message' => $message,
        'data' => $data,
    ], $status);
}

function error(string $message, int $status = 400, mixed $errors = null): void {
    $res = [
        'success' => false,
        'message' => $message,
    ];
    if ($errors !== null) {
        $res['errors'] = $errors;
    }
    jsonResponse($res, $status);
}

function getJsonInput(): array {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return is_array($data) ? $data : [];
}
