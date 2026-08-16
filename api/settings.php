<?php
/**
 * BusinessM — Settings API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';


if ($method === 'GET' && ($action === 'business' || $action === 'profile')) {
    $userId = $_SESSION['user_id'] ?? 0;
    $user = Database::fetchOne("SELECT id, username, full_name, business_name, business_logo, email, phone FROM users WHERE id = ?", [$userId]);
    $biz = Database::fetchOne("SELECT * FROM businesses ORDER BY id LIMIT 1");

    jsonSuccess('Business settings loaded', [
        'business' => $biz,
        'profile' => [
            'id' => $user['id'] ?? $userId,
            'username' => $user['username'] ?? '',
            'full_name' => $user['full_name'] ?? '',
            'business_name' => $user['business_name'] ?? ($biz['name'] ?? 'My Business'),
            'business_logo' => $user['business_logo'] ?? ($biz['logo_path'] ?? ''),
            'email' => $user['email'] ?? ($biz['email'] ?? ''),
            'phone' => $user['phone'] ?? ($biz['phone'] ?? ''),
            'currency_symbol' => $biz['currency_symbol'] ?? '৳',
            'address' => $biz['address'] ?? ''
        ]
    ]);
}

if (($action === 'profile' || $action === 'update_profile') && ($method === 'POST' || $method === 'PUT')) {
    $input = getJsonInput();
    $userId = $_SESSION['user_id'] ?? 0;
    
    $bizName = trim($input['business_name'] ?? $input['name'] ?? '');
    $bizLogo = trim($input['business_logo'] ?? $input['logo_path'] ?? '');
    $fullName = trim($input['full_name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $symbol = trim($input['currency_symbol'] ?? '৳');
    $address = trim($input['address'] ?? '');

    try {
        Database::beginTransaction();

        Database::execute(
            "UPDATE users SET 
                full_name = COALESCE(NULLIF(?, ''), full_name),
                business_name = COALESCE(NULLIF(?, ''), business_name),
                business_logo = COALESCE(NULLIF(?, ''), business_logo),
                email = COALESCE(NULLIF(?, ''), email),
                phone = COALESCE(NULLIF(?, ''), phone)
             WHERE id = ?",
            [$fullName, $bizName, $bizLogo, $email, $phone, $userId]
        );

        $biz = Database::fetchOne("SELECT id FROM businesses ORDER BY id LIMIT 1");
        if ($biz) {
            Database::execute(
                "UPDATE businesses SET 
                    name = COALESCE(NULLIF(?, ''), name),
                    logo_path = COALESCE(NULLIF(?, ''), logo_path),
                    email = COALESCE(NULLIF(?, ''), email),
                    phone = COALESCE(NULLIF(?, ''), phone),
                    currency_symbol = COALESCE(NULLIF(?, ''), currency_symbol),
                    address = COALESCE(NULLIF(?, ''), address)
                 WHERE id = ?",
                [$bizName, $bizLogo, $email, $phone, $symbol, $address, $biz['id']]
            );
        }

        Database::commit();

        if (!empty($bizName)) $_SESSION['business_name'] = $bizName;
        if (!empty($bizLogo)) $_SESSION['business_logo'] = $bizLogo;

        jsonSuccess('Business profile and logo updated successfully', [
            'user' => [
                'id' => $userId,
                'username' => $_SESSION['username'] ?? '',
                'full_name' => $fullName,
                'business_name' => $bizName,
                'business_logo' => $bizLogo,
                'email' => $email,
                'phone' => $phone
            ]
        ]);
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to update profile: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PUT' && $action === 'business') {
    requirePermission('settings', 'update');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('name')
      ->required('currency')
      ->required('currency_symbol')
      ->numeric('tax_rate')->min('tax_rate', 0);
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    $biz = Database::fetchOne("SELECT id FROM businesses ORDER BY id LIMIT 1");
    if (!$biz) jsonError('Business settings not found');
    
    try {
        Database::execute(
            "UPDATE businesses SET 
                name = ?, address = ?, phone = ?, email = ?, 
                currency = ?, currency_symbol = ?, tax_enabled = ?, tax_rate = ?
             WHERE id = ?",
            [
                $v->value('name'),
                $v->value('address'),
                $v->value('phone'),
                $v->value('email'),
                $v->value('currency'),
                $v->value('currency_symbol'),
                $input['tax_enabled'] ? 1 : 0,
                (float) $v->value('tax_rate', 0),
                $biz['id']
            ]
        );
        
        auditLog('update', 'business_settings', $biz['id']);
        jsonSuccess('Business settings updated successfully');
        
    } catch (Exception $e) {
        jsonError('Failed to update business settings: ' . $e->getMessage(), 500);
    }
}

if ($method === 'GET' && $action === 'system') {
    requirePermission('settings', 'read');
    
    $settings = Database::fetchAll("SELECT setting_key, setting_value, setting_group FROM settings");
    $formatted = [];
    foreach ($settings as $s) {
        $formatted[$s['setting_key']] = $s['setting_value'];
    }
    
    jsonSuccess('System settings loaded', ['settings' => $formatted]);
}

if ($method === 'PUT' && $action === 'system') {
    requirePermission('settings', 'update');
    verifyCsrf();
    
    $input = getJsonInput();
    if (empty($input) || !is_array($input)) jsonError('Invalid input');
    
    try {
        Database::beginTransaction();
        
        foreach ($input as $key => $value) {
            // Only update existing keys to prevent junk data
            Database::execute(
                "UPDATE settings SET setting_value = ? WHERE setting_key = ?",
                [(string) $value, (string) $key]
            );
        }
        
        Database::commit();
        auditLog('update', 'system_settings');
        jsonSuccess('System settings updated successfully');
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to update system settings: ' . $e->getMessage(), 500);
    }
}

jsonError('Endpoint not found', 404);
