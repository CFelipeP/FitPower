<?php

error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

set_exception_handler(function (Throwable $e) {
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

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers/response.php';
require_once __DIR__ . '/helpers/auth.php';
require_once __DIR__ . '/helpers/validator.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/');

// Rate limiting for write operations
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    rateLimit();
}

// Strip script directory from URI so routing works under subfolders (e.g. /FitPower/api)
$scriptDir = dirname($_SERVER['SCRIPT_NAME']);
$scriptDir = rtrim(str_replace('\\', '/', $scriptDir), '/');
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

    $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $path);
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

route('/auth/forgot', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    forgotPassword();
}]);

route('/auth/reset', ['method' => 'POST', 'handler' => function() {
    require __DIR__ . '/routes/auth/auth.php';
    resetPassword();
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

// --- 404 ---
error('Ruta no encontrada: ' . $method . ' ' . $uri, 404);
