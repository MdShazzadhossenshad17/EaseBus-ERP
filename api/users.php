<?php
/**
 * BusinessM — Users API
 */

requirePermission('users', 'read');

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';


if ($method === 'GET' && $action === 'list') {
    $search = getSearchQuery();
    $params = [];
    $where = "";

    if ($search) {
        $where = "WHERE u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?";
        $searchTerm = "%{$search}%";
        $params = [$searchTerm, $searchTerm, $searchTerm];
    }

    $users = Database::fetchAll(
        "SELECT u.id, u.username, u.full_name, u.email, u.phone, u.status, u.last_login_at, r.name as role_name
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
    $v = new Validator($input);
    $v->required('username')->minLength('username', 3)->unique('username', 'users', 'username')
      ->required('password')->minLength('password', 8)
      ->required('full_name')
      ->email('email')->unique('email', 'users', 'email')
      ->required('phone')
      ->required('role_id')->integer('role_id');

    if ($v->fails()) {
        jsonError('Validation failed', 400, ['errors' => $v->errors()]);
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

    $v = new Validator($input);
    $v->required('full_name')
      ->email('email')->unique('email', 'users', 'email', $id)
      ->required('phone')
      ->required('role_id')->integer('role_id')
      ->inList('status', ['active', 'inactive', 'locked']);

    if ($v->fails()) {
        jsonError('Validation failed', 400, ['errors' => $v->errors()]);
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

jsonError('Endpoint not found', 404);
