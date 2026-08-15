<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth_middleware.php';

$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'admin';

require_once __DIR__ . '/../api/customers.php';
