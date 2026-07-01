<?php

function logError(string $message, array $context = []): void {
    $logFile = __DIR__ . '/../logs/error.log';
    $dir = dirname($logFile);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $entry = '[' . date('Y-m-d H:i:s') . '] ' . $message;
    if ($context) $entry .= ' ' . json_encode($context);
    $entry .= PHP_EOL;
    file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
}
