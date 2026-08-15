<?php
/**
 * BusinessM — Entry Point
 */

require_once __DIR__ . '/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_start();
}

// If user is logged in, send them to the app
if (!empty($_SESSION['user_id'])) {
    header('Location: pages/app.php');
    exit;
}

// Otherwise, send them to login
header('Location: pages/login.php');
exit;
