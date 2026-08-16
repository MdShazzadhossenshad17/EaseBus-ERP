<?php
/** 
 * BusinessM — Application Configuration 
 * Auto-generated from environment or defaults. DO NOT EDIT MANUALLY.
 */
 
// Try to detect the actual URL from the server environment
$actualUrl = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['SCRIPT_NAME']);
if ($actualUrl === '/') $actualUrl = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . '/businessM';

// Database
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'businessm');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
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
