<?php

function mbStrlenCompat(string $str): int {
    return function_exists('mb_strlen') ? mb_strlen($str, 'UTF-8') : strlen($str);
}

function validate(array $data, array $rules): array {
    $errors = [];

    foreach ($rules as $field => $fieldRules) {
        $fieldRules = is_array($fieldRules) ? $fieldRules : explode('|', $fieldRules);
        $value = $data[$field] ?? null;

        foreach ($fieldRules as $rule) {
            $params = [];
            if (str_contains($rule, ':')) {
                [$rule, $paramStr] = explode(':', $rule, 2);
                $params = explode(',', $paramStr);
            }

            switch ($rule) {
                case 'required':
                    // Whitespace-only strings do not satisfy 'required'.
                    if ($value === null || (is_string($value) && trim($value) === '')) {
                        $errors[$field][] = "The $field field is required";
                    }
                    break;

                case 'email':
                    if ($value !== null && $value !== '' && !filter_var(trim((string)$value), FILTER_VALIDATE_EMAIL)) {
                        $errors[$field][] = "The $field field must be a valid email";
                    }
                    break;

                case 'min':
                    $min = (int)($params[0] ?? 0);
                    if (is_string($value) && mbStrlenCompat($value) < $min) {
                        $errors[$field][] = "The $field field must be at least $min characters";
                    }
                    break;

                case 'max':
                    $max = (int)($params[0] ?? 255);
                    if (is_string($value) && mbStrlenCompat($value) > $max) {
                        $errors[$field][] = "The $field field must not exceed $max characters";
                    }
                    break;

                case 'in':
                    if ($value !== null && $value !== '' && !in_array((string)$value, $params, true)) {
                        $errors[$field][] = "The $field field is not valid";
                    }
                    break;

                case 'confirmed':
                    $confirmation = $data[$field . '_confirmation'] ?? null;
                    if ($value !== $confirmation) {
                        $errors[$field][] = "The $field confirmation does not match";
                    }
                    break;

                case 'string':
                    if ($value !== null && !is_string($value)) {
                        $errors[$field][] = "The $field field must be text";
                    }
                    break;

                case 'array':
                    if ($value !== null && !is_array($value)) {
                        $errors[$field][] = "The $field field must be an array";
                    }
                    break;

                case 'numeric':
                    if ($value !== null && $value !== '' && !is_numeric($value)) {
                        $errors[$field][] = "The $field field must be numeric";
                    }
                    break;

                case 'boolean':
                    if ($value !== null && !in_array($value, [true, false, 'true', 'false', 0, 1, '0', '1'], true)) {
                        $errors[$field][] = "The $field field must be boolean";
                    }
                    break;

                case 'min_value':
                    $min = (float)($params[0] ?? 0);
                    if (is_numeric($value) && (float)$value < $min) {
                        $errors[$field][] = "The $field field must be at least $min";
                    }
                    break;

                case 'max_value':
                    $max = (float)($params[0] ?? 999999);
                    if (is_numeric($value) && (float)$value > $max) {
                        $errors[$field][] = "The $field field must not exceed $max";
                    }
                    break;

                case 'date':
                    // Strict Y-m-d check (no junk into MySQL DATE columns).
                    if ($value !== null && $value !== '') {
                        $d = DateTime::createFromFormat('Y-m-d', (string)$value);
                        if (!$d || $d->format('Y-m-d') !== (string)$value) {
                            $errors[$field][] = "The $field field must be a valid date (YYYY-MM-DD)";
                        }
                    }
                    break;

                case 'time':
                    // Accepts H:i or H:i:s (no junk into MySQL TIME columns).
                    if ($value !== null && $value !== '') {
                        $v = (string)$value;
                        $ok = false;
                        foreach (['H:i:s', 'H:i'] as $fmt) {
                            $t = DateTime::createFromFormat($fmt, $v);
                            if ($t && $t->format($fmt) === $v) { $ok = true; break; }
                        }
                        if (!$ok) {
                            $errors[$field][] = "The $field field must be a valid time (HH:MM)";
                        }
                    }
                    break;

                default:
                    // Unknown rule: fail loudly in development so typos in
                    // rule names never silently pass validation.
                    if (defined('APP_ENV') && APP_ENV === 'development') {
                        $errors[$field][] = "Unknown rule: $rule";
                    }
                    break;
            }
        }
    }

    return $errors;
}
