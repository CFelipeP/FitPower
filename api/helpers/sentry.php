<?php
function initSentry(): void {
    $dsn = getenv('SENTRY_DSN');
    if (!$dsn) return;
    \Sentry\init(['dsn' => $dsn, 'traces_sample_rate' => 0.1]);
    set_exception_handler(function(\Throwable $e) {
        \Sentry\captureException($e);
    });
    set_error_handler(function($severity, $message, $file, $line) {
        if (error_reporting() & $severity) {
            \Sentry\captureMessage($message);
        }
    });
}
