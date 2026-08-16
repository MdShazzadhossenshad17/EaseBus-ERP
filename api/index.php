<?php
/**
 * BusinessM — API Router
 *
 * Routes requests to appropriate module controllers.
 * Note: per-module authentication and CSRF are enforced inside each module
 * (e.g. api/auth.php is public; everything else calls requireAuth()/verifyCsrf()).
 */

require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth_middleware.php';

setCorsHeaders();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$apiPos = strrpos($uri, '/api');
if ($apiPos !== false) {
    $cleanPath = substr($uri, $apiPos + 4);
} else {
    $cleanPath = $uri;
}
$pathParts = explode('/', trim($cleanPath, '/'));

$module = $pathParts[0] ?? '';
$action = !empty($pathParts[1]) ? $pathParts[1] : ($_GET['action'] ?? $_POST['action'] ?? '');

if (empty($module)) {
    jsonError('API endpoint not specified.', 404);
}

$moduleFile = __DIR__ . '/' . $module . '.php';

if (file_exists($moduleFile)) {
    require_once $moduleFile;
} else {
    jsonError("API module '{$module}' not found.", 404);
}
