<?php
/** 
 * BusinessM — Application Configuration 
 * Auto-generated from environment or defaults. DO NOT EDIT MANUALLY.
 */
 
$scheme = $_SERVER['REQUEST_SCHEME'] ?? (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http');
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '');
$actualUrl = "{$scheme}://{$host}{$scriptDir}";
if ($scriptDir === '/' || $scriptDir === '\\' || $scriptDir === '.' || empty($scriptDir)) {
    $actualUrl = "{$scheme}://{$host}/businessM";
}

// Database & Vercel Storage Config
$dbHost = getenv('DB_HOST') ?: getenv('POSTGRES_HOST') ?: getenv('POSTGRES_HOST_UNPOOLED') ?: 'localhost';
$dbPort = getenv('DB_PORT') ?: getenv('POSTGRES_PORT') ?: '3306';
$dbName = getenv('DB_NAME') ?: getenv('POSTGRES_DATABASE') ?: 'businessm';
$dbUser = getenv('DB_USER') ?: getenv('POSTGRES_USER') ?: 'root';
$dbPass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : (getenv('POSTGRES_PASSWORD') !== false ? getenv('POSTGRES_PASSWORD') : '');
$dbDriver = (getenv('POSTGRES_HOST') || getenv('POSTGRES_URL') || getenv('DATABASE_URL')) ? 'pgsql' : 'mysql';

define('DB_HOST', $dbHost);
define('DB_PORT', $dbPort);
define('DB_NAME', $dbName);
define('DB_USER', $dbUser);
define('DB_PASS', $dbPass);
define('DB_DRIVER', $dbDriver);
define('DB_CHARSET', getenv('DB_CHARSET') ?: 'utf8mb4');

// App
define('APP_NAME', 'EaseBus');
define('APP_VERSION', '1.0.0');
define('APP_URL', getenv('APP_URL') ?: $actualUrl);
define('APP_ROOT', __DIR__);

// Session
define('SESSION_LIFETIME', 86400);
define('SESSION_NAME', 'easebus_session');

// Security
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_DURATION', 900);
define('CSRF_TOKEN_NAME', 'csrf_token');

// Uploads
define('UPLOAD_DIR', APP_ROOT . '/uploads');
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024);
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Timezone
date_default_timezone_set('Asia/Dhaka');
