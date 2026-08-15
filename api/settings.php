<?php
/**
 * BusinessM — Settings API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';


if ($method === 'GET' && $action === 'business') {
    requirePermission('settings', 'read');
    
    $biz = Database::fetchOne("SELECT * FROM businesses ORDER BY id LIMIT 1");
    if (!$biz) jsonError('Business settings not found');
    
    jsonSuccess('Business settings loaded', ['business' => $biz]);
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
