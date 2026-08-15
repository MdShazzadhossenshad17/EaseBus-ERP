<?php
/**
 * BusinessM — API Router
 * 
 * Routes requests to appropriate module controllers.
 */

require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth_middleware.php';

setCorsHeaders();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$cleanPath = preg_replace('#^/(EaseBus|businessM)?/api#i', '', $uri);
$pathParts = explode('/', trim($cleanPath, '/'));

$module = $pathParts[0] ?? '';
$action = $pathParts[1] ?? '';

if (empty($module)) {
    jsonError('API endpoint not specified.', 404);
}

$moduleFile = __DIR__ . '/' . $module . '.php';

if (file_exists($moduleFile)) {
    require_once $moduleFile;
} else {
    jsonError("API module '{$module}' not found.", 404);
}
