<?php

error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers/response.php';
require_once __DIR__ . '/helpers/auth.php';
require_once __DIR__ . '/helpers/validator.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = getAllowedOrigins();
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: ' . APP_URL);
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Max-Age: 86400');

sendSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

set_exception_handler(function (Throwable $e) {
    error_log('API Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Error interno del servidor',
    ]);
    exit;
});

set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/');

// Rate limiting for write operations
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    rateLimit();
}

requireCsrf();

// Strip script directory from URI so routing works under subfolders (e.g. /FitPower/api)
// Use SCRIPT_FILENAME because PHP built-in server sets SCRIPT_NAME to the request URI
// for non-existent files when using a router script.
$scriptFilename = $_SERVER['SCRIPT_FILENAME'] ?? '';
$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$scriptDir = '';
if ($scriptFilename && $docRoot && str_starts_with($scriptFilename, $docRoot)) {
    $scriptDir = dirname(substr($scriptFilename, strlen($docRoot)));
    $scriptDir = rtrim(str_replace('\\', '/', $scriptDir), '/');
}
if ($scriptDir !== '' && str_starts_with($uri, $scriptDir)) {
    $uri = substr($uri, strlen($scriptDir));
}

// Also strip API_BASE prefix in case it's still present (e.g. PHP built-in server)
$base = rtrim(API_BASE, '/');
if ($base !== '' && str_starts_with($uri, $base)) {
    $uri = substr($uri, strlen($base));
}

$uri = '/' . trim($uri, '/');
$uri = $uri === '/' ? '/' : rtrim($uri, '/');

function route(string $path, array $handlers): void {
    global $uri, $method;

    $pattern = preg_replace('/\{(\w+):\*\}/', '(?P<$1>.+)', $path);
    $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $pattern);
    $pattern = '#^' . $pattern . '$#';

    if (preg_match($pattern, $uri, $matches)) {
        $handlerMethod = strtoupper($handlers['method'] ?? 'GET');
        if ($method !== $handlerMethod && $handlerMethod !== 'ANY') {
            return;
        }

        $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
        $handler = $handlers['handler'] ?? null;

        if ($handler) {
            $handler($params);
        } else {
            error('Handler no definido', 500);
        }
        exit;
    }
}

// --- Auth Routes ---
route('/auth/register', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    registerUser();
}]);

route('/auth/login', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    loginUser();
}]);

route('/auth/me', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    getCurrentUser();
}]);

route('/auth/refresh', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/helpers/auth.php';
    $input = getJsonInput();
    $refreshToken = $input['refresh_token'] ?? '';
    if (!$refreshToken) {
        error('Refresh token requerido', 400);
    }
    $result = refreshAccessToken($refreshToken);
    if (!$result) {
        error('Refresh token inválido o expirado', 401);
    }
    success($result);
}]);

route('/auth/forgot', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    forgotPassword();
}]);

route('/auth/reset', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    resetPassword();
}]);

route('/auth/verify-email', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/auth/verify.php';
    verifyEmail();
}]);

route('/auth/resend-verification', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/auth/verify.php';
    resendVerification();
}]);

route('/auth/password', ['method' => 'PUT', 'handler' => function() {
    require __DIR__ . '/routes/auth/password.php';
    changePassword();
}]);

route('/auth/account', ['method' => 'DELETE', 'handler' => function() {
    require __DIR__ . '/routes/auth/account.php';
    deleteAccount();
}]);

route('/csrf-token', ['method' => 'GET', 'handler' => function() {
    success(['csrf_token' => generateCsrfToken()]);
}]);

// --- User Routes ---
route('/users', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/users/users.php';
    listUsers();
}]);

route('/users/contacts', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/users/users.php';
    listContacts();
}]);

route('/users/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/users/users.php';
    getUser($p['id']);
}]);

route('/users/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/users/users.php';
    updateUser($p['id']);
}]);

route('/users/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/users/users.php';
    deleteUser($p['id']);
}]);

// --- Trainer Routes ---
route('/trainers', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/users/trainers.php';
    listTrainers();
}]);

route('/trainers', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/users/trainers.php';
    createTrainer();
}]);

route('/trainers/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/users/trainers.php';
    getTrainer($p['id']);
}]);

route('/trainers/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/users/trainers.php';
    updateTrainer($p['id']);
}]);

route('/trainers/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/users/trainers.php';
    deleteTrainer($p['id']);
}]);

// --- Public Coach Catalog Routes ---
route('/public/trainers', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/users/public_trainers.php';
    publicListTrainers();
}]);

route('/public/trainers/specializations', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/users/public_trainers.php';
    publicListSpecializations();
}]);

route('/public/trainers/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/users/public_trainers.php';
    publicGetTrainer($p['id']);
}]);

route('/public/testimonials', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/users/public_trainers.php';
    publicListTestimonials();
}]);

// --- Client Routes (for coach) ---
route('/clients', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/users/clients.php';
    listCoachClients();
}]);

route('/clients/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/users/clients.php';
    getClientDetail($p['id']);
}]);

// --- Program Routes ---
route('/programs', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/content/programs.php';
    listPrograms();
}]);

route('/programs', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/programs.php';
    createProgram();
}]);

route('/programs/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/content/programs.php';
    getProgram($p['id']);
}]);

route('/programs/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/content/programs.php';
    updateProgram($p['id']);
}]);

route('/programs/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/content/programs.php';
    deleteProgram($p['id']);
}]);

route('/programs/{id}/clone', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/content/programs.php';
    cloneProgram($p['id']);
}]);

// --- Workout Log Routes ---
route('/workout-logs', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/workout_logs.php';
    logWorkout();
}]);

route('/workout-logs', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/content/workout_logs.php';
    listWorkoutLogs();
}]);

// --- Enrollment Routes ---
route('/enrollments', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/programs.php';
    enrollUser();
}]);

route('/enrollments/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/content/programs.php';
    unenrollUser($p['id']);
}]);

// --- Dashboard Routes ---
route('/dashboard/admin', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/dashboard/dashboard.php';
    adminDashboard();
}]);

route('/dashboard/coach', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/dashboard/dashboard.php';
    coachDashboard();
}]);

route('/dashboard/client', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/dashboard/dashboard.php';
    clientDashboard();
}]);

// --- Coach Availability Routes ---
route('/coach/availability', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/support/coach_availability.php';
    getMyAvailability();
}]);

route('/coach/availability', ['method' => 'PUT', 'handler' => function() {
    require __DIR__ . '/routes/support/coach_availability.php';
    updateMyAvailability();
}]);

route('/coaches/{id}/availability', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/support/coach_availability.php';
    getCoachAvailability();
}]);

// --- Session Routes ---
route('/sessions', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/support/sessions.php';
    listSessions();
}]);

route('/sessions', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/support/sessions.php';
    createSession();
}]);

route('/sessions/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/support/sessions.php';
    updateSession($p['id']);
}]);

route('/sessions/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/support/sessions.php';
    deleteSession($p['id']);
}]);

// --- Nutrition Routes ---
route('/nutrition', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/nutrition.php';
    getNutrition();
}]);

route('/nutrition', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/health/nutrition.php';
    saveNutrition();
}]);

route('/nutrition/settings', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/nutrition_settings.php';
    getNutritionSettings();
}]);

route('/nutrition/settings', ['method' => 'PUT', 'handler' => function() {
    require __DIR__ . '/routes/health/nutrition_settings.php';
    saveNutritionSettings();
}]);

route('/nutrition/history', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/nutrition.php';
    getNutritionHistory();
}]);

// --- Metrics Routes ---
route('/metrics', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/nutrition.php';
    getMetrics();
}]);

route('/metrics', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/health/nutrition.php';
    saveMetrics();
}]);

// --- Contact Routes ---
route('/contact', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/support/contact.php';
    submitContact();
}]);

// --- Support Routes ---
route('/tickets', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/support/tickets.php';
    listTickets();
}]);

route('/tickets', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/support/tickets.php';
    createTicket();
}]);

route('/tickets/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/support/tickets.php';
    updateTicket($p['id']);
}]);

// --- Subscription Routes ---
route('/plans', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/finance/subscriptions.php';
    listPlans();
}]);

route('/subscriptions', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/finance/subscriptions.php';
    getUserSubscription();
}]);

route('/subscriptions', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/subscriptions.php';
    createSubscription();
}]);

route('/subscriptions/{id}/invoice', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/helpers/invoice.php';
    $file = generateInvoicePdf((int)$p['id']);
    header('Content-Type: text/html');
    readfile($file);
    unlink($file);
}]);

// --- Stripe Routes ---
route('/stripe/create-checkout', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/stripe.php';
    createCheckoutSession();
}]);

route('/stripe/webhook', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/stripe.php';
    handleWebhook();
}]);

route('/stripe/config', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/finance/stripe.php';
    getStripePublishableKey();
}]);

route('/stripe/cancel-subscription', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/stripe.php';
    cancelSubscription();
}]);

route('/stripe/session', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/finance/stripe.php';
    getCheckoutSession();
}]);

// --- PayPal Routes ---
route('/paypal/config', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/finance/paypal.php';
    getPayPalConfig();
}]);

route('/paypal/create-order', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/paypal.php';
    createPayPalOrder();
}]);

route('/paypal/capture-order', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/paypal.php';
    capturePayPalOrder();
}]);

route('/paypal/webhook', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/paypal.php';
    handlePayPalWebhook();
}]);

// --- Virtual Wallet Routes ---
route('/wallet/create-subscription', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/wallet.php';
    createWalletSubscription();
}]);

route('/wallet/webhook', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/wallet.php';
    handleWalletWebhook();
}]);

// --- Chat Routes ---
route('/conversations', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/chat/chat.php';
    listConversations();
}]);

route('/conversations', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/chat/chat.php';
    startConversation();
}]);

route('/messages/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/chat/chat.php';
    getMessages($p);
}]);

route('/messages/{id}', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/chat/chat.php';
    sendMessage($p);
}]);

// --- Video Sessions Routes ---
route('/video-sessions', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/support/video_sessions.php';
    listVideoSessions();
}]);

route('/video-sessions', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/support/video_sessions.php';
    createVideoSession();
}]);

route('/video-sessions/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/support/video_sessions.php';
    updateVideoSessionStatus($p['id']);
}]);

// --- Exercise Library Routes ---
route('/exercises', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/content/exercises.php';
    listExercises();
}]);

route('/exercises', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/exercises.php';
    createExercise();
}]);

route('/exercises/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/content/exercises.php';
    updateExercise($p['id']);
}]);

route('/exercises/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/content/exercises.php';
    deleteExercise($p['id']);
}]);

route('/exercises/seed', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/exercises.php';
    seedExercises();
}]);

// --- Check-in Routes ---
route('/checkins/today', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/checkins.php';
    getCheckin();
}]);

route('/checkins', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/checkins.php';
    getCheckin();
}]);

route('/checkins', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/health/checkins.php';
    saveCheckin();
}]);

route('/checkins/history', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/checkins.php';
    listCheckins();
}]);

// --- Recipe Routes ---
route('/recipes', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/content/recipes.php';
    listRecipes();
}]);

route('/recipes/seed', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/recipes.php';
    seedRecipes();
}]);

// --- Progress Photo Routes ---
route('/photos', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/photos.php';
    listPhotos();
}]);

route('/photos', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/health/photos.php';
    uploadPhoto();
}]);

route('/photos/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/health/photos.php';
    deletePhoto($p);
}]);

// --- Profile Photo Upload ---
route('/upload/profile-photo', ['method' => 'POST', 'handler' => function() {
    $auth = requireAuth();
    $userId = $auth['sub'];

    if (empty($_FILES['photo'])) {
        error('No se envió ninguna imagen', 422);
    }

    $file = $_FILES['photo'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        error('Error al subir la imagen', 500);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png'];
    if (!in_array($ext, $allowed, true)) {
        error('Formato no permitido. Use jpg, jpeg o png', 422);
    }

    $dir = UPLOAD_DIR . '/profiles';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $filename = $userId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $dest = $dir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        error('Error al guardar la imagen', 500);
    }

    $photoUrl = 'uploads/profiles/' . $filename;

    // Update user photo in DB
    $db = getDB();
    $db->prepare("UPDATE users SET photo = ? WHERE id = ?")->execute([$photoUrl, $userId]);

    $baseUrl = rtrim(APP_URL, '/');
    success([
        'photo' => $photoUrl,
        'photoUrl' => $baseUrl . '/' . $photoUrl,
    ], 'Foto actualizada');
}]);

// --- Admin User Management Routes ---
route('/admin/users', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/users/users.php';
    adminListUsers();
}]);

route('/admin/users', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/users/users.php';
    adminCreateUser();
}]);

route('/admin/users/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/users/users.php';
    adminGetUser($p['id']);
}]);

route('/admin/users/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/users/users.php';
    adminUpdateUser($p['id']);
}]);

route('/admin/users/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/users/users.php';
    adminDeleteUser($p['id']);
}]);

route('/admin/coaches', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/users/users.php';
    adminListCoaches();
}]);

route('/admin/coaches/{id}/approve', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/users/users.php';
    adminApproveCoach($p['id']);
}]);

// --- Admin Batch Operations ---
route('/admin/users/batch/suspend', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/users/users.php';
    adminBatchSuspend();
}]);

route('/admin/users/batch/activate', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/users/users.php';
    adminBatchActivate();
}]);

// --- Admin Subscription Management Routes ---
route('/admin/subscriptions', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/finance/subscriptions.php';
    adminListSubscriptions();
}]);

route('/admin/subscriptions/metrics', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/finance/subscriptions.php';
    adminGetSubscriptionMetrics();
}]);

route('/admin/subscriptions/{id}/cancel', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/finance/subscriptions.php';
    adminCancelSubscription($p['id']);
}]);

route('/admin/subscriptions/{id}/plan', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/finance/subscriptions.php';
    adminChangeSubscriptionPlan($p['id']);
}]);

route('/admin/plans', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/finance/subscriptions.php';
    adminListPlans();
}]);

route('/admin/plans', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/subscriptions.php';
    adminSavePlan();
}]);

// --- Coupon Routes ---
route('/admin/coupons', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/finance/coupons.php';
    listCoupons();
}]);

route('/admin/coupons', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/coupons.php';
    createCoupon();
}]);

route('/admin/coupons/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/finance/coupons.php';
    deleteCoupon($p['id']);
}]);

// --- Admin Ticket Management Routes ---
route('/admin/tickets', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/support/tickets.php';
    adminListTickets();
}]);

route('/admin/tickets/{id}/reply', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/support/tickets.php';
    adminReplyTicket($p['id']);
}]);

route('/admin/tickets/{id}/replies', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/support/tickets.php';
    adminGetTicketReplies($p['id']);
}]);

// --- Admin Analytics Routes ---
route('/admin/analytics', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/dashboard/dashboard.php';
    adminAnalytics();
}]);

route('/admin/analytics/detailed', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/dashboard/dashboard.php';
    adminAnalyticsDetailed();
}]);

// --- Settings Routes ---
route('/settings', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/users/settings.php';
    handleGetSettings();
}]);

route('/settings', ['method' => 'PUT', 'handler' => function() {
    require __DIR__ . '/routes/users/settings.php';
    handleUpdateSettings();
}]);

// --- Notification Routes ---
route('/notifications', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/community/notifications.php';
    listNotifications();
}]);

route('/notifications/read-all', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/notifications.php';
    markAllRead();
}]);

route('/notifications/{id}/read', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/community/notifications.php';
    markRead($p);
}]);

route('/notifications', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/notifications.php';
    createNotification();
}]);

// --- Blog Routes ---
route('/blog', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/content/blog.php';
    listArticles();
}]);

route('/blog/{slug}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/content/blog.php';
    getArticle($p['slug']);
}]);

route('/blog', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/blog.php';
    createArticle();
}]);

// --- Forum Routes ---
route('/forum/topics', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/community/forum.php';
    listTopics();
}]);

route('/forum/topics', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/forum.php';
    createTopic();
}]);

route('/forum/topics/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/community/forum.php';
    getTopic($p['id']);
}]);

route('/forum/replies', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/forum.php';
    createReply();
}]);

route('/forum/likes', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/forum.php';
    toggleLike();
}]);

route('/forum/categories', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/community/forum.php';
    getForumCategories();
}]);

// --- Challenges Routes ---
route('/challenges', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/community/challenges.php';
    listChallenges();
}]);

route('/challenges/{id}/join', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/community/challenges.php';
    joinChallenge((int)$p['id']);
}]);

route('/challenges/{id}/leave', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/community/challenges.php';
    leaveChallenge((int)$p['id']);
}]);

route('/challenges/{id}/progress', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/community/challenges.php';
    $input = getJsonInput();
    $auth = requireAuth();
    updateProgress((int)$p['id'], (int)$auth['sub'], $input);
}]);

// --- Leaderboard Routes ---
route('/leaderboard', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/community/leaderboard.php';
    listLeaderboard();
}]);

route('/leaderboard/stats', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/community/leaderboard.php';
    getLeaderboardStats();
}]);

route('/leaderboard/muscle', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/community/leaderboard.php';
    getLeaderboardByMuscle();
}]);

// --- Achievement Routes ---
route('/achievements', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/gamification/achievements.php';
    listAchievements();
}]);

route('/achievements/user', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/gamification/achievements.php';
    getUserAchievements();
}]);

route('/achievements/check', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/gamification/achievements.php';
    checkAchievements();
}]);

// --- Program Reviews Routes ---
route('/program-reviews/{programId}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/reviews/program_reviews.php';
    listProgramReviews($p['programId']);
}]);

route('/program-reviews', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/reviews/program_reviews.php';
    createProgramReview();
}]);

// --- Smart Routine Routes ---
route('/routines/daily', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/content/routines.php';
    getDailyRoutine();
}]);

route('/routines/complete', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/routines.php';
    completeRoutine();
}]);

// --- Water Tracker Routes ---
route('/water', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/health/water.php';
    updateWater();
}]);

// --- Body Measurements Routes ---
route('/health/measurements', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/measurements.php';
    getMeasurements();
}]);

route('/health/measurements', ['method' => 'PUT', 'handler' => function() {
    require __DIR__ . '/routes/health/measurements.php';
    saveMeasurements();
}]);

// --- Sleep Routes ---
route('/health/sleep', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/sleep.php';
    getSleep();
}]);

route('/health/sleep', ['method' => 'PUT', 'handler' => function() {
    require __DIR__ . '/routes/health/sleep.php';
    saveSleep();
}]);

// --- Habit Routes ---
route('/health/habits', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/habits.php';
    listHabits();
}]);

route('/health/habits', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/health/habits.php';
    createHabit();
}]);

route('/health/habits/toggle', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/health/habits.php';
    toggleHabit();
}]);

route('/health/habits/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/health/habits.php';
    deleteHabit($p['id']);
}]);

// --- Export Routes ---
route('/export/program/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/support/export.php';
    exportProgram($p['id']);
}]);

route('/export/metrics', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/support/export_data.php';
    exportMetrics();
}]);

route('/export/sessions', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/support/export_data.php';
    exportSessions();
}]);

route('/export/nutrition', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/support/export_data.php';
    exportNutrition();
}]);

route('/export/all', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/support/export_data.php';
    exportAll();
}]);

// --- Reminder Routes ---
route('/system/reminders', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/system/reminders.php';
    processReminders();
}]);

// --- Social Feed Routes ---
route('/social/feed', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/community/social.php';
    getFeed();
}]);

route('/social/posts', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/social.php';
    createPost();
}]);

route('/social/like', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/social.php';
    toggleLike();
}]);

route('/social/comment', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/social.php';
    addComment();
}]);

route('/social/comments/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/community/social.php';
    getComments($p['id']);
}]);

route('/social/follow', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/social.php';
    followUser();
}]);

route('/social/unfollow', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/social.php';
    unfollowUser();
}]);

route('/social/followers/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/community/social.php';
    getFollowers($p['id']);
}]);

route('/social/following/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/community/social.php';
    getFollowing($p['id']);
}]);

// --- Audit Log Route ---
route('/admin/audit-log', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/system/audit.php';
    adminAuditLog();
}]);

// --- Revoke Sessions Route ---
route('/auth/google', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    googleLogin();
}]);

route('/auth/set-password', ['method' => 'PUT', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    setPassword();
}]);

route('/auth/google/redirect', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    googleRedirect();
}]);

route('/auth/google/callback', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    googleCallback();
}]);

route('/auth/google/callback', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    googleCallbackGet();
}]);

route('/auth/revoke-all-sessions', ['method' => 'PUT', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    revokeAllSessions();
}]);

// --- Coupon Update Route ---
route('/admin/coupons/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/finance/coupons.php';
    updateCoupon($p['id']);
}]);

// --- Blog Edit/Delete Routes ---
route('/blog/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/content/blog.php';
    updateArticle($p['id']);
}]);

route('/blog/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/content/blog.php';
    deleteArticle($p['id']);
}]);

// --- Admin Contact Messages Routes ---
route('/admin/messages', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/support/contact.php';
    adminListMessages();
}]);

route('/admin/messages/{id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/support/contact.php';
    adminGetMessage($p['id']);
}]);

route('/admin/messages/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/support/contact.php';
    adminMarkMessageRead($p['id']);
}]);

route('/admin/messages/{id}/reply', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/support/contact.php';
    adminReplyMessage($p['id']);
}]);

// --- Admin Challenge Management Routes ---
route('/admin/challenges', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/community/challenges.php';
    listChallenges();
}]);

route('/admin/challenges', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/challenges.php';
    createChallenge();
}]);

route('/admin/challenges/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/community/challenges.php';
    updateChallenge($p['id']);
}]);

route('/admin/challenges/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/community/challenges.php';
    deleteChallenge($p['id']);
}]);

// --- Admin Notification Broadcast Route ---
route('/admin/notifications/broadcast', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/community/notifications.php';
    broadcastNotification();
}]);

// --- Admin Media Routes ---
route('/admin/media', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/admin/media.php';
    adminListMedia();
}]);

route('/admin/media', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/admin/media.php';
    adminUploadMedia();
}]);

route('/admin/media/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/admin/media.php';
    adminDeleteMedia($p['id']);
}]);

// --- Admin Settings Routes ---
route('/admin/settings', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/admin/settings.php';
    adminGetSettings();
}]);

route('/admin/settings', ['method' => 'PUT', 'handler' => function() {
    require __DIR__ . '/routes/admin/settings.php';
    adminUpdateSettings();
}]);

// --- Admin Flagged Reports Routes ---
route('/admin/flagged-reports', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/admin/flagged_reports.php';
    adminListFlaggedReports();
}]);

route('/admin/flagged-reports/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/admin/flagged_reports.php';
    adminUpdateFlaggedReport($p['id']);
}]);

// --- Admin Sessions Routes ---
route('/admin/sessions', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/admin/sessions.php';
    adminListSessions();
}]);

// --- Admin Security Routes ---
route('/admin/security', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/admin/security.php';
    adminSecurityMetrics();
}]);

// --- Coach Client Detail Routes ---
route('/coach/clients/{id}/checkins', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/users/coach.php';
    getClientCheckins($p['id']);
}]);

route('/coach/clients/{id}/metrics', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/users/coach.php';
    getClientMetrics($p['id']);
}]);

route('/coach/clients/{id}/photos', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/users/coach.php';
    getClientPhotos($p['id']);
}]);

route('/coach/clients/{id}/nutrition', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/users/coach.php';
    getClientNutrition($p['id']);
}]);

route('/coach/clients/{id}/nutrition/settings', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/health/nutrition_settings.php';
    getClientNutritionSettings($p['id']);
}]);

route('/coach/clients/{id}/nutrition/settings', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/health/nutrition_settings.php';
    saveClientNutritionSettings($p['id']);
}]);

route('/coach/clients/{id}/nutrition/history', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/health/nutrition.php';
    getNutritionHistoryCoach($p['id']);
}]);

route('/coach/clients/{id}/routines', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/users/coach.php';
    assignClientRoutine($p['id']);
}]);

route('/coach/client/{id}/daily-summary', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/users/coach.php';
    getClientDailySummary($p['id']);
}]);

route('/coach/clients/{id}/notes', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/users/coach.php';
    getClientNotes($p['id']);
}]);

route('/coach/clients/{id}/notes', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/users/coach.php';
    createClientNote($p['id']);
}]);

route('/coach/notes/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/users/coach.php';
    deleteClientNote($p['id']);
}]);

// --- Coach Stripe & Finance Routes ---
route('/coach/connect-stripe', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/users/coach.php';
    connectStripe();
}]);

route('/coach/payouts', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/users/coach.php';
    getPayouts();
}]);

route('/coach/earnings', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/finance/coach_earnings.php';
    getCoachEarnings();
}]);

route('/coach/request-payout', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/finance/coach_earnings.php';
    requestPayout();
}]);

route('/admin/payouts', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/finance/coach_earnings.php';
    adminListPayouts();
}]);

route('/admin/payouts/{id}/approve', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/finance/coach_earnings.php';
    adminApprovePayout($p['id']);
}]);

// --- Workout Heatmap Route ---
route('/workout-logs/heatmap', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/content/workout_logs.php';
    getWorkoutHeatmap();
}]);

// --- Goals Routes ---
route('/goals', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/health/goals.php';
    listGoals();
}]);

route('/goals', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/health/goals.php';
    createGoal();
}]);

route('/goals/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/health/goals.php';
    updateGoal($p['id']);
}]);

route('/goals/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/health/goals.php';
    deleteGoal($p['id']);
}]);

// --- Recipe Create/Edit/Delete Routes ---
route('/recipes', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/recipes.php';
    createRecipe();
}]);

route('/recipes/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/content/recipes.php';
    updateRecipe($p['id']);
}]);

route('/recipes/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/content/recipes.php';
    deleteRecipe($p['id']);
}]);

// --- Admin Forum Management Routes ---
route('/admin/forum/topics', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/community/forum.php';
    adminListTopics();
}]);

route('/admin/forum/topics/{id}/pin', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/community/forum.php';
    pinTopic($p['id']);
}]);

route('/admin/forum/topics/{id}/lock', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/community/forum.php';
    lockTopic($p['id']);
}]);

route('/admin/forum/topics/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/community/forum.php';
    adminDeleteTopic($p['id']);
}]);

// --- Self-Enroll Route ---
route('/programs/{id}/enroll', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/content/programs.php';
    selfEnroll($p['id']);
}]);

// --- Goal Milestone Routes ---
route('/goals/{id}/milestones', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/health/goals.php';
    listMilestones($p['id']);
}]);

route('/goals/{id}/milestones', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/health/goals.php';
    createMilestone($p['id']);
}]);

route('/goals/milestones/{id}', ['method' => 'PUT', 'handler' => function($p) {
    require __DIR__ . '/routes/health/goals.php';
    updateMilestone($p['id']);
}]);

route('/goals/milestones/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/health/goals.php';
    deleteMilestone($p['id']);
}]);

// --- FCM Token Route ---
route('/auth/fcm-token', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    saveFcmToken();
}]);

// --- Video Library Routes ---
route('/videos', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/content/videos.php';
    listVideos();
}]);

route('/videos', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/videos.php';
    uploadVideo();
}]);

route('/videos/feedback', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/videos.php';
    createFeedback();
}]);

route('/videos/feedback/{client_id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/content/videos.php';
    getFeedback($p['client_id']);
}]);

route('/videos/{id}', ['method' => 'DELETE', 'handler' => function($p) {
    require __DIR__ . '/routes/content/videos.php';
    deleteVideo($p['id']);
}]);

// --- Strength Tracking Routes ---
route('/workouts/calculate-1rm', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/content/strength.php';
    calculateOneRm();
}]);

route('/workouts/volume', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/content/strength.php';
    getWorkoutVolume();
}]);

route('/workouts/strength-standards', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/content/strength.php';
    getStrengthStandards();
}]);

route('/workouts/suggest-progression/{exercise_id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/content/strength.php';
    suggestProgression($p['exercise_id']);
}]);

// --- Meal Plan Routes ---
route('/coach/meal-plans/{client_id}', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/content/meal_plans.php';
    listClientMealPlans($p['client_id']);
}]);

route('/coach/meal-plans/{client_id}', ['method' => 'POST', 'handler' => function($p) {
    require __DIR__ . '/routes/content/meal_plans.php';
    createMealPlan($p['client_id']);
}]);

route('/meal-plans/current', ['method' => 'GET', 'handler' => function() {
    require __DIR__ . '/routes/content/meal_plans.php';
    getCurrentMealPlan();
}]);

route('/meal-plans/{id}/grocery-list', ['method' => 'GET', 'handler' => function($p) {
    require __DIR__ . '/routes/content/meal_plans.php';
    generateGroceryList($p['id']);
}]);

// --- Uploaded File Routes ---
route('/uploads/{path:*}', ['method' => 'GET', 'handler' => function($p) {
    $relativePath = ltrim($p['path'], '/');
    $file = realpath(UPLOAD_DIR . '/' . $relativePath);
    $uploadDirReal = realpath(UPLOAD_DIR);

    if (!$file || !str_starts_with($file, $uploadDirReal) || !is_file($file)) {
        error('Archivo no encontrado', 404);
    }

    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $mimeTypes = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
        'pdf' => 'application/pdf',
    ];
    $mime = $mimeTypes[$ext] ?? 'application/octet-stream';

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($file));
    header('Cache-Control: public, max-age=86400');
    readfile($file);
    exit;
}]);

// --- 404 ---
error('Ruta no encontrada: ' . $method . ' ' . $uri, 404);
