<?php

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
                    if ($value === null || $value === '') {
                        $errors[$field][] = "El campo $field es obligatorio";
                    }
                    break;

                case 'email':
                    if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $errors[$field][] = "El campo $field debe ser un email válido";
                    }
                    break;

                case 'min':
                    $min = (int)($params[0] ?? 0);
                    if (is_string($value) && strlen($value) < $min) {
                        $errors[$field][] = "El campo $field debe tener al menos $min caracteres";
                    }
                    break;

                case 'max':
                    $max = (int)($params[0] ?? 255);
                    if (is_string($value) && strlen($value) > $max) {
                        $errors[$field][] = "El campo $field no debe exceder $max caracteres";
                    }
                    break;

                case 'in':
                    if ($value !== null && $value !== '' && !in_array((string)$value, $params, true)) {
                        $errors[$field][] = "El campo $field no es válido";
                    }
                    break;

                case 'confirmed':
                    $confirmation = $data[$field . '_confirmation'] ?? null;
                    if ($value !== $confirmation) {
                        $errors[$field][] = "La confirmación de $field no coincide";
                    }
                    break;

                case 'string':
                    if ($value !== null && !is_string($value)) {
                        $errors[$field][] = "El campo $field debe ser texto";
                    }
                    break;

                case 'array':
                    if ($value !== null && !is_array($value)) {
                        $errors[$field][] = "El campo $field debe ser un arreglo";
                    }
                    break;

                case 'numeric':
                    if ($value !== null && $value !== '' && !is_numeric($value)) {
                        $errors[$field][] = "El campo $field debe ser numérico";
                    }
                    break;

                case 'boolean':
                    if ($value !== null && !in_array($value, [true, false, 'true', 'false', 0, 1, '0', '1'], true)) {
                        $errors[$field][] = "El campo $field debe ser booleano";
                    }
                    break;
            }
        }
    }

    return $errors;
}
