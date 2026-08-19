<?php
/**
 * BusinessM — Users API
 */

requirePermission('users', 'read');

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';

// Helper to verify if session belongs to Store Owner (hisham)
function isStoreOwnerSession(): bool {
    $uname = strtolower($_SESSION['username'] ?? '');
    return $uname === 'hisham' || $uname === 'shad@dbms.com' || ($_SESSION['user_role'] ?? '') === 'creator';
}

if (in_array($action, ['create', 'update', 'delete', 'toggle-status', 'reset-password'])) {
    if (!isStoreOwnerSession()) {
        jsonError('Permission Denied: Modifying staff credentials or adding employee accounts requires Store Owner (hisham) permission.', 403);
    }
}


if ($method === 'GET' && $action === 'list') {
    $search = getSearchQuery();
    $currentUserId = (int)($_SESSION['user_id'] ?? 0);
    $params = [];

    // Exclude Creator account and system demo accounts
    $where = "WHERE LOWER(u.username) NOT IN ('shad@dbms.com', 'shad', 'system_admin') 
              AND LOWER(COALESCE(u.email, '')) NOT IN ('shad@dbms.com', 'admin@easebus.com') 
              AND u.id != 99999";

    if ($search) {
        $where .= " AND (u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
        $searchTerm = "%{$search}%";
        $params = [$searchTerm, $searchTerm, $searchTerm];
    }

    $users = Database::fetchAll(
        "SELECT u.id, u.username, u.full_name, u.email, u.phone, u.status, u.last_login_at, u.updated_at as last_activity_at, u.created_at, r.name as role_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         {$where}
         ORDER BY u.id DESC",
        $params
    );

    jsonSuccess('Users loaded', ['users' => $users]);
}

if ($method === 'POST' && $action === 'create') {
    requirePermission('users', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    
    // Auto-resolve role_id from role_name or role if missing
    $roleName = trim($input['role_name'] ?? $input['role'] ?? '');
    if (empty($input['role_id']) && !empty($roleName)) {
        $r = Database::fetchOne("SELECT id FROM roles WHERE name = ?", [$roleName]);
        if (!$r) {
            $roleId = Database::insert("INSERT INTO roles (name, description) VALUES (?, ?)", [$roleName, ucfirst($roleName) . ' role']);
            $input['role_id'] = $roleId;
        } else {
            $input['role_id'] = (int)$r['id'];
        }
    }

    // Treat empty or blank email string as null
    if (isset($input['email']) && trim((string)$input['email']) === '') {
        $input['email'] = null;
    }

    $v = new Validator($input);
    $v->required('username', 'Username')->minLength('username', 3, 'Username')->unique('username', 'users', 'username', null, 'Username')
      ->required('password', 'Password')->minLength('password', 4, 'Password')
      ->required('full_name', 'Full Name')
      ->required('phone', 'Phone Number')
      ->required('role_id', 'Staff Role');

    if (!empty($input['email'])) {
        $v->email('email', 'Email Address')->unique('email', 'users', 'email', null, 'Email Address');
    }

    if ($v->fails()) {
        $errList = array_values($v->errors());
        jsonError(!empty($errList) ? implode(' ', $errList) : 'Validation failed', 400, ['errors' => $v->errors()]);
    }

    try {
        Database::beginTransaction();
        
        $userId = Database::insert(
            "INSERT INTO users (username, password_hash, full_name, email, phone, must_change_password, status)
             VALUES (?, ?, ?, ?, ?, 1, 'active')",
            [
                $v->value('username'),
                password_hash($v->value('password'), PASSWORD_BCRYPT),
                $v->value('full_name'),
                $v->value('email'),
                $v->value('phone')
            ]
        );

        Database::insert("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [$userId, $v->value('role_id')]);

        Database::commit();
        auditLog('create', 'user', $userId, null, ['username' => $v->value('username'), 'role_id' => $v->value('role_id')]);

        jsonSuccess('User created successfully.');

    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to create user: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PUT' && $action === 'update') {
    requirePermission('users', 'update');
    verifyCsrf();
    
    $input = getJsonInput();
    $id = (int) ($input['id'] ?? 0);
    
    if (!$id) jsonError('User ID is required');

    $roleName = trim($input['role_name'] ?? $input['role'] ?? '');
    if (empty($input['role_id']) && !empty($roleName)) {
        $r = Database::fetchOne("SELECT id FROM roles WHERE name = ?", [$roleName]);
        if ($r) $input['role_id'] = (int)$r['id'];
    }

    if (isset($input['email']) && trim((string)$input['email']) === '') {
        $input['email'] = null;
    }

    $v = new Validator($input);
    $v->required('full_name', 'Full Name')
      ->required('phone', 'Phone Number')
      ->required('role_id', 'Staff Role')
      ->inList('status', ['active', 'inactive', 'locked'], 'Account Status');

    if (!empty($input['email'])) {
        $v->email('email', 'Email Address')->unique('email', 'users', 'email', $id, 'Email Address');
    }

    if ($v->fails()) {
        $errList = array_values($v->errors());
        jsonError(!empty($errList) ? implode(' ', $errList) : 'Validation failed', 400, ['errors' => $v->errors()]);
    }

    $oldUser = Database::fetchOne("SELECT * FROM users WHERE id = ?", [$id]);
    if (!$oldUser) jsonError('User not found', 404);

    try {
        Database::beginTransaction();
        
        Database::execute(
            "UPDATE users SET full_name = ?, email = ?, phone = ?, status = ? WHERE id = ?",
            [$v->value('full_name'), $v->value('email'), $v->value('phone'), $v->value('status'), $id]
        );

        Database::execute("DELETE FROM user_roles WHERE user_id = ?", [$id]);
        Database::insert("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [$id, $v->value('role_id')]);

        if (!empty($input['password'])) {
            if (strlen($input['password']) < 8) jsonError('Password must be at least 8 characters');
            Database::execute(
                "UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?",
                [password_hash($input['password'], PASSWORD_BCRYPT), $id]
            );
        }

        Database::commit();
        auditLog('update', 'user', $id, ['status' => $oldUser['status']], ['status' => $v->value('status')]);

        jsonSuccess('User updated successfully.');

    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to update user: ' . $e->getMessage(), 500);
    }
}

if ($method === 'GET' && $action === 'roles') {
    $roles = Database::fetchAll("SELECT id, name, description FROM roles ORDER BY id ASC");
    jsonSuccess('Roles loaded', ['roles' => $roles]);
}

if ($method === 'GET' && $action === 'creator_summary') {
    requirePermission('users', 'read');
    
    $users = Database::fetchAll(
        "SELECT u.id, u.username, u.full_name, u.email, u.phone, u.status, u.created_at, 
                COALESCE(r.name, 'admin') as role, u.full_name as business_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         ORDER BY u.id DESC"
    );

    foreach ($users as &$u) {
        $u['total_products'] = (int)(Database::fetchOne("SELECT COUNT(*) as c FROM products")['c'] ?? 0);
        $u['total_orders'] = (int)(Database::fetchOne("SELECT COUNT(*) as c FROM orders WHERE order_status != 'cancelled'")['c'] ?? 0);
        $u['total_revenue'] = (float)(Database::fetchOne("SELECT SUM(total_amount) as s FROM orders WHERE order_status != 'cancelled'")['s'] ?? 0);
    }
    unset($u);

    $totalStores = count($users);
    $totalOrders = (int)(Database::fetchOne("SELECT COUNT(*) as c FROM orders WHERE order_status != 'cancelled'")['c'] ?? 0);
    $totalProducts = (int)(Database::fetchOne("SELECT COUNT(*) as c FROM products")['c'] ?? 0);
    $totalRevenue = (float)(Database::fetchOne("SELECT SUM(total_amount) as s FROM orders WHERE order_status != 'cancelled'")['s'] ?? 0);

    jsonSuccess('Creator summary loaded', [
        'users' => $users,
        'platform_totals' => [
            'total_stores' => $totalStores,
            'total_orders' => $totalOrders,
            'total_products' => $totalProducts,
            'total_revenue' => $totalRevenue
        ]
    ]);
}

if ($method === 'GET' && $action === 'inspect_user') {
    requirePermission('users', 'read');
    
    $userId = (int) ($_GET['user_id'] ?? 0);
    $targetUser = Database::fetchOne("SELECT id, username, full_name, email, phone, status FROM users WHERE id = ?", [$userId]);
    if (!$targetUser) jsonError('User not found', 404);

    $products = Database::fetchAll("SELECT p.*, c.name as category FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.id DESC LIMIT 50");
    $orders = Database::fetchAll("SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id ORDER BY o.id DESC LIMIT 50");
    $expenses = Database::fetchAll("SELECT e.*, c.name as category FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id ORDER BY e.id DESC LIMIT 50");

    $totalRevenue = (float)(Database::fetchOne("SELECT SUM(total_amount) as s FROM orders WHERE order_status != 'cancelled'")['s'] ?? 0);
    $totalExpenses = (float)(Database::fetchOne("SELECT SUM(amount) as s FROM expenses")['s'] ?? 0);

    jsonSuccess('User inspected', [
        'user' => [
            'id' => $targetUser['id'],
            'username' => $targetUser['username'],
            'full_name' => $targetUser['full_name'],
            'email' => $targetUser['email'],
            'business_name' => $targetUser['full_name'] . "'s Store"
        ],
        'metrics' => [
            'total_products' => count($products),
            'total_orders' => count($orders),
            'total_revenue' => $totalRevenue,
            'net_profit' => $totalRevenue - $totalExpenses
        ],
        'products' => $products,
        'orders' => $orders,
        'expenses' => $expenses
    ]);
}

jsonError('Endpoint not found', 404);
