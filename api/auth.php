<?php
/**
 * BusinessM — Auth API
 */

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';

// Handle preflight
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($method === 'POST' && $action === 'login') {
    $input = getJsonInput();
    $v = new Validator($input);
    $v->required('username')->required('password');

    if ($v->fails()) {
        jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    }

    $username = $v->value('username');
    $password = $v->value('password');

    $user = Database::fetchOne(
        "SELECT u.id, u.username, u.password_hash, u.full_name, u.status, u.must_change_password, u.login_attempts, r.name as role_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.username = ?",
        [$username]
    );

    if (!$user) {
        auditLog('login_failed', 'user', null, null, ['username' => $username, 'reason' => 'user_not_found']);
        jsonError('Invalid username or password.', 401);
    }

    if ($user['status'] === 'locked') {
        jsonError('Account is locked due to too many failed attempts. Please contact admin.', 403);
    }
    
    if ($user['status'] === 'inactive') {
        jsonError('Account is inactive.', 403);
    }

    if (!password_verify($password, $user['password_hash'])) {
        $attempts = (int)$user['login_attempts'] + 1;
        if ($attempts >= MAX_LOGIN_ATTEMPTS) {
            Database::execute("UPDATE users SET status = 'locked', login_attempts = ? WHERE id = ?", [$attempts, $user['id']]);
            auditLog('account_locked', 'user', $user['id']);
            jsonError('Account locked due to too many failed attempts.', 403);
        } else {
            Database::execute("UPDATE users SET login_attempts = ? WHERE id = ?", [$attempts, $user['id']]);
            auditLog('login_failed', 'user', $user['id'], null, ['reason' => 'invalid_password']);
            jsonError('Invalid username or password.', 401);
        }
    }

    // Login success
    session_regenerate_id(true); // Prevent session fixation
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['user_role'] = $user['role_name'] ?? 'guest';
    
    Database::execute("UPDATE users SET login_attempts = 0, last_login_at = NOW() WHERE id = ?", [$user['id']]);
    auditLog('login', 'user', $user['id']);

    jsonSuccess('Login successful', [
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'role' => $user['role_name'],
            'must_change_password' => (bool) $user['must_change_password']
        ],
        'csrf_token' => generateCsrfToken()
    ]);
}

if ($method === 'POST' && $action === 'register') {
    $input = getJsonInput();
    $v = new Validator($input);
    $v->required('username')->minLength('username', 3)->unique('username', 'users', 'username')
      ->required('password')->minLength('password', 6)
      ->required('full_name');

    if (isset($input['email']) && !empty($input['email'])) {
        $v->email('email')->unique('email', 'users', 'email');
    }

    if ($v->fails()) {
        jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    }

    try {
        Database::beginTransaction();
        
        $userId = Database::insert(
            "INSERT INTO users (username, password_hash, full_name, email, phone, must_change_password, status)
             VALUES (?, ?, ?, ?, ?, 0, 'active')",
            [
                $v->value('username'),
                password_hash($v->value('password'), PASSWORD_BCRYPT),
                $v->value('full_name'),
                $v->value('email') ?? ($v->value('username') . '@easebus.com'),
                $v->value('phone') ?? '01700000000'
            ]
        );

        // Assign role: Admin for their own business workspace
        $role = Database::fetchOne("SELECT id FROM roles WHERE name = 'admin'");
        if (!$role) {
            $roleId = Database::insert("INSERT INTO roles (name, description) VALUES ('admin', 'Full store owner access')");
        } else {
            $roleId = $role['id'];
        }
        
        Database::insert("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [$userId, $roleId]);

        // Create default business for user
        $businessName = !empty($input['business_name']) ? trim($input['business_name']) : ($v->value('full_name') . "'s Store");
        Database::insert("INSERT INTO businesses (name, currency, currency_symbol) VALUES (?, 'BDT', '৳')", [$businessName]);

        Database::commit();

        // Auto-login session
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $userId;
        $_SESSION['username'] = $v->value('username');
        $_SESSION['user_role'] = 'admin';

        jsonSuccess('Account created successfully! Welcome to EaseBus.', [
            'user' => [
                'id' => $userId,
                'username' => $v->value('username'),
                'full_name' => $v->value('full_name'),
                'role' => 'admin',
                'must_change_password' => false
            ],
            'csrf_token' => generateCsrfToken()
        ]);

    } catch (Exception $e) {
        Database::rollback();
        jsonError('Registration failed: ' . $e->getMessage(), 500);
    }
}

if ($method === 'POST' && ($action === 'logout' || pathinfo($_SERVER['PHP_SELF'], PATHINFO_FILENAME) === 'logout')) {
    $userId = $_SESSION['user_id'] ?? null;
    if ($userId) {
        try { auditLog('logout', 'user', $userId); } catch (Exception $e) {}
    }
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    @session_destroy();
    jsonSuccess('Logged out successfully');
}

if ($method === 'GET' && $action === 'session') {
    if (empty($_SESSION['user_id'])) {
        jsonError('Not logged in', 401);
    }
    
    $user = Database::fetchOne(
        "SELECT u.id, u.username, u.full_name, u.status, u.must_change_password, r.name as role_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.id = ?",
        [$_SESSION['user_id']]
    );

    if (!$user || $user['status'] !== 'active') {
        session_destroy();
        jsonError('Account inactive', 401);
    }

    jsonSuccess('Session active', [
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'role' => $user['role_name'],
            'must_change_password' => (bool) $user['must_change_password']
        ],
        'csrf_token' => generateCsrfToken()
    ]);
}

if ($method === 'POST' && $action === 'change-password') {
    requireAuth();
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    $v->required('current_password')
      ->required('new_password')->minLength('new_password', 8)
      ->required('confirm_password')->match('confirm_password', 'new_password');

    if ($v->fails()) {
        jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    }

    $user = Database::fetchOne("SELECT password_hash FROM users WHERE id = ?", [$_SESSION['user_id']]);
    
    if (!password_verify($v->value('current_password'), $user['password_hash'])) {
        jsonError('Incorrect current password.', 400);
    }

    Database::execute(
        "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
        [password_hash($v->value('new_password'), PASSWORD_BCRYPT), $_SESSION['user_id']]
    );

    auditLog('password_changed', 'user', $_SESSION['user_id']);
    jsonSuccess('Password changed successfully.');
}

jsonError('Endpoint not found', 404);
