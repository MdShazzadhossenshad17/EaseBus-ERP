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

    // Creator Account Bypass
    if (strtolower($username) === 'shad@dbms.com' || strtolower($username) === 'shad') {
        if ($password !== '01521582448') {
            jsonError('Invalid password for Creator account.', 401);
        }
        session_regenerate_id(true);
        $_SESSION['user_id'] = 99999;
        $_SESSION['username'] = 'shad@dbms.com';
        $_SESSION['user_role'] = 'creator';

        jsonSuccess('Welcome Creator! Accessing Platform Control Center.', [
            'user' => [
                'id' => 99999,
                'username' => 'shad@dbms.com',
                'full_name' => 'Md Shazzad Hossen Shad (Creator)',
                'business_name' => 'EaseBus Creator Operations',
                'role' => 'creator',
                'must_change_password' => false
            ],
            'csrf_token' => generateCsrfToken()
        ]);
    }

    $user = Database::fetchOne(
        "SELECT u.id, u.username, u.email, u.password_hash, u.full_name, u.status, u.must_change_password, u.login_attempts, u.created_by, u.business_name, r.name as role_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE (u.username = ? OR u.email = ?)",
        [$username, $username]
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
    $_SESSION['created_by'] = $user['created_by'];
    $_SESSION['business_name'] = $user['business_name'] ?? 'eloria';
    
    Database::execute("UPDATE users SET login_attempts = 0, last_login_at = NOW() WHERE id = ?", [$user['id']]);
    auditLog('login', 'user', $user['id']);

    jsonSuccess('Login successful', [
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'role' => $user['role_name'],
            'created_by' => $user['created_by'],
            'business_name' => $user['business_name'] ?? 'eloria',
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
        
        $businessName = !empty($input['business_name']) ? trim($input['business_name']) : ($v->value('full_name') . "'s Store");
        $businessLogo = !empty($input['business_logo']) ? trim($input['business_logo']) : null;

        $userId = Database::insert(
            "INSERT INTO users (username, password_hash, full_name, business_name, business_logo, email, phone, must_change_password, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active')",
            [
                $v->value('username'),
                password_hash($v->value('password'), PASSWORD_BCRYPT),
                $v->value('full_name'),
                $businessName,
                $businessLogo,
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
        Database::insert("INSERT INTO businesses (name, logo_path, currency, currency_symbol) VALUES (?, ?, 'BDT', '৳')", [$businessName, $businessLogo]);

        Database::commit();

        // Auto-login session
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $userId;
        $_SESSION['username'] = $v->value('username');
        $_SESSION['business_name'] = $businessName;
        $_SESSION['business_logo'] = $businessLogo;
        $_SESSION['user_role'] = 'admin';

        jsonSuccess('Account created successfully! Welcome to EaseBus.', [
            'user' => [
                'id' => $userId,
                'username' => $v->value('username'),
                'full_name' => $v->value('full_name'),
                'business_name' => $businessName,
                'business_logo' => $businessLogo,
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
        "SELECT u.id, u.username, u.full_name, u.business_name, u.business_logo, u.email, u.phone, u.status, u.must_change_password, r.name as role_name
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
            'business_name' => $user['business_name'] ?? ($user['full_name'] . "'s Business"),
            'business_logo' => $user['business_logo'] ?? null,
            'email' => $user['email'] ?? '',
            'phone' => $user['phone'] ?? '',
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

if ($method === 'POST' && ($action === 'update-profile' || $action === 'update_profile')) {
    requireAuth();
    verifyCsrf();
    
    $input = getJsonInput();
    $userId = (int) $_SESSION['user_id'];
    
    $fullName = trim($input['full_name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $username = trim($input['username'] ?? '');
    $businessName = trim($input['business_name'] ?? '');
    $newPassword = trim($input['password'] ?? $input['new_password'] ?? '');

    if (empty($fullName)) {
        jsonError('Full name is required.', 400);
    }
    
    if (!empty($username) && strlen($username) < 3) {
        jsonError('Username must be at least 3 characters.', 400);
    }
    
    if (!empty($username)) {
        $dup = Database::fetchOne("SELECT id FROM users WHERE username = ? AND id != ?", [$username, $userId]);
        if ($dup) {
            jsonError('Username is already taken by another account.', 400);
        }
    }

    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Please enter a valid email address.', 400);
    }

    if (!empty($email)) {
        $dupEmail = Database::fetchOne("SELECT id FROM users WHERE email = ? AND id != ?", [$email, $userId]);
        if ($dupEmail) {
            jsonError('Email address is already in use.', 400);
        }
    }

    $setParts = ["full_name = ?", "phone = ?", "email = ?"];
    $params = [$fullName, $phone, $email ?: null];
    
    if (!empty($username)) {
        $setParts[] = "username = ?";
        $params[] = $username;
        $_SESSION['username'] = $username;
    }
    
    if (!empty($businessName)) {
        $setParts[] = "business_name = ?";
        $params[] = $businessName;
        $_SESSION['business_name'] = $businessName;
    }
    
    if (!empty($newPassword)) {
        if (strlen($newPassword) < 4) {
            jsonError('Password must be at least 4 characters long.', 400);
        }
        $setParts[] = "password_hash = ?";
        $setParts[] = "must_change_password = 0";
        $params[] = password_hash($newPassword, PASSWORD_BCRYPT);
    }

    $params[] = $userId;
    $sql = "UPDATE users SET " . implode(', ', $setParts) . " WHERE id = ?";

    Database::execute($sql, $params);
    
    // Fetch updated user state
    $updatedUser = Database::fetchOne(
        "SELECT u.id, u.username, u.full_name, u.business_name, u.business_logo, u.email, u.phone, u.status, r.name as role_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.id = ?",
        [$userId]
    );

    $userPayload = [
        'id' => $updatedUser['id'],
        'username' => $updatedUser['username'],
        'full_name' => $updatedUser['full_name'],
        'business_name' => $updatedUser['business_name'] ?? ($updatedUser['full_name'] . "'s Store"),
        'email' => $updatedUser['email'] ?? '',
        'phone' => $updatedUser['phone'] ?? '',
        'role' => $updatedUser['role_name']
    ];

    auditLog('profile_updated', 'user', $userId);

    jsonSuccess('Profile settings updated successfully!', ['user' => $userPayload]);
}

jsonError('Endpoint not found', 404);
