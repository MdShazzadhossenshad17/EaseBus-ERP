<?php
/**
 * BusinessM — Application Configuration
 */

// Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'businessm');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// App
define('APP_NAME', 'EaseBus');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'http://localhost/EaseBus');
define('APP_ROOT', __DIR__);

// Session
define('SESSION_LIFETIME', 86400); // 24 hours
define('SESSION_NAME', 'easebus_session');

// Security
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_DURATION', 900); // 15 minutes
define('CSRF_TOKEN_NAME', 'csrf_token');

// Uploads
define('UPLOAD_DIR', APP_ROOT . '/uploads');
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Timezone
date_default_timezone_set('Asia/Dhaka');
