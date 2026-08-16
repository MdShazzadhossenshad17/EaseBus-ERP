<?php
/**
 * BusinessM — Customers API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';


if ($method === 'GET' && ($action === 'list' || $action === 'summary' || empty($action))) {
    requirePermission('customers', 'read');

    $search = getSearchQuery();
    $params = [];
    $where = "";

    if ($search) {
        $where = "WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.address LIKE ?";
        $searchTerm = "%{$search}%";
        $params = [$searchTerm, $searchTerm, $searchTerm, $searchTerm];
    }

    $customers = Database::fetchAll(
        "SELECT c.*,
            (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as total_orders,
            (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = c.id AND order_status != 'cancelled') as total_purchased
         FROM customers c
         {$where}
         ORDER BY c.name ASC",
        $params
    );

    $totalSpent = 0;
    $totalOrders = 0;

    foreach ($customers as &$cust) {
        $cust['total_orders'] = (int) ($cust['total_orders'] ?? 0);
        $cust['total_purchased'] = (float) ($cust['total_purchased'] ?? 0);
        $totalSpent += $cust['total_purchased'];
        $totalOrders += $cust['total_orders'];
    }

    $summary = [
        'total_customers' => count($customers),
        'total_spent' => $totalSpent,
        'total_orders' => $totalOrders,
        'avg_spent' => count($customers) > 0 ? ($totalSpent / count($customers)) : 0
    ];

    jsonSuccess('Customers loaded', ['customers' => $customers, 'summary' => $summary]);
}

if ($method === 'POST' && $action === 'create') {
    requirePermission('customers', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('name')->maxLength('name', 100)
      ->required('phone')->maxLength('phone', 20)
      ->email('email');
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    // Check if phone exists
    $existing = Database::fetchOne("SELECT id FROM customers WHERE phone = ?", [$v->value('phone')]);
    if ($existing) jsonError('A customer with this phone number already exists.');
    
    try {
        $id = Database::insert(
            "INSERT INTO customers (name, phone, email, address, notes)
             VALUES (?, ?, ?, ?, ?)",
            [
                $v->value('name'),
                $v->value('phone'),
                $v->value('email'),
                $v->value('address'),
                $v->value('notes')
            ]
        );
        
        auditLog('create', 'customer', $id, null, ['name' => $v->value('name')]);
        jsonSuccess('Customer created successfully', ['id' => $id]);
        
    } catch (Exception $e) {
        jsonError('Failed to create customer: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PUT' && $action === 'update') {
    requirePermission('customers', 'update');
    verifyCsrf();
    
    $input = getJsonInput();
    $id = (int) ($input['id'] ?? 0);
    if (!$id) jsonError('Customer ID required');
    
    $v = new Validator($input);
    $v->required('name')->maxLength('name', 100)
      ->required('phone')->maxLength('phone', 20)
      ->email('email');
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    // Check phone uniqueness ignoring self
    $existing = Database::fetchOne("SELECT id FROM customers WHERE phone = ? AND id != ?", [$v->value('phone'), $id]);
    if ($existing) jsonError('Another customer with this phone number already exists.');
    
    try {
        Database::execute(
            "UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?",
            [
                $v->value('name'),
                $v->value('phone'),
                $v->value('email'),
                $v->value('address'),
                $v->value('notes'),
                $id
            ]
        );
        
        auditLog('update', 'customer', $id, null, ['name' => $v->value('name')]);
        jsonSuccess('Customer updated successfully');

    } catch (Exception $e) {
        jsonError('Failed to update customer: ' . $e->getMessage(), 500);
    }
}

if ($method === 'DELETE' && $action === 'delete') {
    requirePermission('customers', 'delete');
    verifyCsrf();

    $id = (int) ($_GET['id'] ?? $_POST['id'] ?? 0);
    if (!$id) jsonError('Customer ID required');

    $customer = Database::fetchOne("SELECT id, name FROM customers WHERE id = ?", [$id]);
    if (!$customer) jsonError('Customer not found', 404);

    try {
        Database::beginTransaction();

        // Delete associated deliveries first (foreign key constraint)
        Database::execute("DELETE FROM deliveries WHERE customer_id = ?", [$id]);

        // Delete the customer
        Database::execute("DELETE FROM customers WHERE id = ?", [$id]);

        Database::commit();
        auditLog('delete', 'customer', $id, ['name' => $customer['name']], null);
        jsonSuccess('Customer deleted successfully');
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to delete customer: ' . $e->getMessage(), 500);
    }
}

jsonError('Endpoint not found', 404);
