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
        Database::beginTransaction();

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

        $orderCreated = false;
        $productName = trim($input['product_name'] ?? '');
        $qty = (int) ($input['quantity'] ?? 1);
        $unitPrice = (float) ($input['unit_price'] ?? 0);
        $soldPrice = (float) ($input['sold_price'] ?? 0);

        if (!empty($productName) && $qty > 0 && ($unitPrice > 0 || $soldPrice > 0)) {
            $discountVal = (float) ($input['discount_amount'] ?? 0);
            $deliveryCharge = (float) ($input['delivery_charge'] ?? 60);
            $paymentStatus = in_array($input['payment_status'] ?? '', ['paid', 'unpaid']) ? $input['payment_status'] : 'unpaid';

            $effectivePrice = $soldPrice > 0 ? $soldPrice : $unitPrice;
            $itemsSubtotal = $effectivePrice * $qty;
            $totalAmount = max(0, $itemsSubtotal - $discountVal + $deliveryCharge);

            $orderNo = generateRefNo('ORD', 'orders', 'order_no');
            $locationId = Database::getDefaultLocationId();

            $orderId = Database::insert(
                "INSERT INTO orders (order_no, customer_id, location_id, subtotal, discount_amount, delivery_charge, total_amount, total_cost, payment_status, order_status, notes, order_date, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), ?)",
                [
                    $orderNo, $id, $locationId, $itemsSubtotal, $discountVal, $deliveryCharge, $totalAmount, 0,
                    $paymentStatus, 'Customer Initial Purchase', getCurrentUserId()
                ]
            );

            // Find variant if available, or create dummy variant SKU
            $variantSku = 'SKU-' . strtoupper(substr(md5($productName), 0, 6));
            $variantId = 1;
            $prodId = 1;
            $matchedVar = Database::fetchOne("SELECT pv.id, pv.product_id, pv.cost_price FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE p.name LIKE ? OR pv.sku LIKE ? LIMIT 1", ["%{$productName}%", "%{$variantSku}%"]);
            if ($matchedVar) {
                $variantId = $matchedVar['id'];
                $prodId = $matchedVar['product_id'];
            }

            Database::insert(
                "INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_sku, quantity, unit_price, total_price, cost_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)",
                [$orderId, $prodId, $variantId, $productName, $variantSku, $qty, $effectivePrice, $itemsSubtotal]
            );

            // Create initial delivery record
            $trackingNo = 'TRK-' . strtoupper(substr(md5($orderNo . time()), 0, 8));
            Database::insert(
                "INSERT INTO deliveries (order_id, customer_id, address, phone, courier_id, tracking_number, delivery_fee, status, expected_date, notes)
                 VALUES (?, ?, ?, ?, NULL, ?, ?, 'order_placed', ?, 'Initial Customer Purchase Delivery')",
                [
                    $orderId, $id,
                    $v->value('address') ?: 'Customer Delivery Address',
                    $v->value('phone'),
                    $trackingNo,
                    $deliveryCharge,
                    date('Y-m-d', strtotime('+3 days'))
                ]
            );

            // Update total purchased on customer
            if ($paymentStatus === 'paid') {
                Database::execute("UPDATE customers SET total_purchased = total_purchased + ? WHERE id = ?", [$totalAmount, $id]);
            }

            $orderCreated = true;
        }

        Database::commit();
        auditLog('create', 'customer', $id, null, ['name' => $v->value('name'), 'order_created' => $orderCreated]);
        jsonSuccess('Customer created successfully' . ($orderCreated ? ' with initial purchase order' : ''), ['id' => $id, 'order_created' => $orderCreated]);

    } catch (Exception $e) {
        Database::rollback();
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
