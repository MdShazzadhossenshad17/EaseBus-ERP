<?php
/**
 * BusinessM — Returns API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';

// GET /api/returns?action=summary
if ($method === 'GET' && $action === 'summary') {
    requirePermission('returns', 'read');
    
    $total = Database::fetchOne("SELECT COUNT(*) as count FROM returns");
    $completed = Database::fetchOne("SELECT COUNT(*) as count FROM returns WHERE status = 'completed'");
    $pending = Database::fetchOne("SELECT COUNT(*) as count FROM returns WHERE status = 'pending'");
    $refundVal = Database::fetchOne("SELECT SUM(total_refund) as sum FROM returns WHERE status != 'rejected'");
    
    $summary = [
        'total_returns' => (int) ($total['count'] ?? 0),
        'completed_returns' => (int) ($completed['count'] ?? 0),
        'pending_returns' => (int) ($pending['count'] ?? 0),
        'total_refund_amount' => (float) ($refundVal['sum'] ?? 0)
    ];
    
    jsonSuccess('Returns summary loaded', ['summary' => $summary]);
}

// GET /api/returns?action=list
if ($method === 'GET' && $action === 'list') {
    requirePermission('returns', 'read');
    
    $status = $_GET['status'] ?? 'all';
    $search = getSearchQuery();
    
    $params = [];
    $whereParts = [];
    
    if ($status !== 'all') {
        $whereParts[] = "r.status = ?";
        $params[] = $status;
    }
    
    if ($search) {
        $whereParts[] = "(r.return_no LIKE ? OR o.order_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR r.notes LIKE ?)";
        $searchTerm = "%{$search}%";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    }
    
    $where = count($whereParts) > 0 ? "WHERE " . implode(' AND ', $whereParts) : "";
    
    $returns = Database::fetchAll(
        "SELECT 
            r.*, 
            o.order_no, o.total_amount as order_total,
            c.name as customer_name, c.phone as customer_phone
         FROM returns r
         JOIN orders o ON r.order_id = o.id
         JOIN customers c ON r.customer_id = c.id
         {$where}
         ORDER BY r.id DESC",
        $params
    );
    
    jsonSuccess('Returns loaded', ['returns' => $returns]);
}

// POST /api/returns?action=create
if ($method === 'POST' && $action === 'create') {
    requirePermission('returns', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('order_id')->integer('order_id');
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    $orderId = (int) $v->value('order_id');
    
    try {
        Database::beginTransaction();
        
        $order = Database::fetchOne("SELECT id, customer_id, location_id, total_amount FROM orders WHERE id = ?", [$orderId]);
        if (!$order) jsonError('Order not found', 404);
        
        $returnNo = generateRefNo('RET', 'returns', 'return_no');
        $reason = !empty($input['reason']) ? $input['reason'] : 'other';
        $notes = !empty($input['notes']) ? $input['notes'] : '';
        $customRefund = isset($input['total_refund']) ? (float)$input['total_refund'] : $order['total_amount'];
        $shouldRestock = !isset($input['restock_inventory']) || (bool)$input['restock_inventory'];
        
        $returnId = Database::insert(
            "INSERT INTO returns (return_no, order_id, customer_id, total_refund, reason, status, return_date, notes, created_by)
             VALUES (?, ?, ?, ?, ?, 'completed', NOW(), ?, ?)",
            [
                $returnNo, $orderId, $order['customer_id'],
                $customRefund,
                $reason,
                $notes,
                getCurrentUserId()
            ]
        );
        
        // Auto-fetch items from order if items array not specified
        $items = !empty($input['items']) && is_array($input['items']) ? $input['items'] : [];
        if (empty($items)) {
            $orderItems = Database::fetchAll("SELECT id, product_id, variant_id, quantity, unit_price FROM order_items WHERE order_id = ?", [$orderId]);
            foreach ($orderItems as $oi) {
                $items[] = [
                    'order_item_id' => $oi['id'],
                    'product_id' => $oi['product_id'],
                    'variant_id' => $oi['variant_id'],
                    'quantity' => $oi['quantity'],
                    'unit_price' => $oi['unit_price']
                ];
            }
        }
        
        foreach ($items as $item) {
            $variantId = (int)($item['variant_id'] ?? 0);
            $qty = (int)($item['quantity'] ?? 1);
            $unitPrice = (float)($item['unit_price'] ?? 0);
            $refundAmount = $qty * $unitPrice;
            
            Database::insert(
                "INSERT INTO return_items (return_id, order_item_id, product_id, variant_id, quantity, refund_amount)
                 VALUES (?, ?, ?, ?, ?, ?)",
                [$returnId, $item['order_item_id'] ?? null, $item['product_id'] ?? 1, $variantId, $qty, $refundAmount]
            );

            if ($shouldRestock && $variantId > 0) {
                $variant = Database::fetchOne("SELECT current_stock FROM product_variants WHERE id = ? FOR UPDATE", [$variantId]);
                if ($variant) {
                    $newStock = $variant['current_stock'] + $qty;
                    Database::execute("UPDATE product_variants SET current_stock = ? WHERE id = ?", [$newStock, $variantId]);
                    
                    Database::insert(
                        "INSERT INTO inventory_movements (product_id, variant_id, movement_type, quantity, stock_before, stock_after, reference_type, reference_id, location_id, reason, created_by)
                         VALUES (?, ?, 'return', ?, ?, ?, 'return', ?, ?, 'Customer Return Restock', ?)",
                        [$item['product_id'] ?? 1, $variantId, $qty, $variant['current_stock'], $newStock, $returnId, $order['location_id'], getCurrentUserId()]
                    );
                }
            }
        }
        
        // Sync order status to returned
        Database::execute("UPDATE orders SET order_status = 'returned' WHERE id = ?", [$orderId]);

        Database::commit();
        auditLog('create', 'return', $returnId, null, ['return_no' => $returnNo]);
        
        jsonSuccess('Return created successfully', ['return_id' => $returnId, 'return_no' => $returnNo]);
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to create return: ' . $e->getMessage(), 500);
    }
}

// PUT /api/returns?action=status
if ($method === 'PUT' && $action === 'status') {
    requirePermission('returns', 'update');
    verifyCsrf();
    
    $input = getJsonInput();
    $id = (int) ($input['id'] ?? 0);
    $newStatus = $input['status'] ?? '';
    
    if (!$id) jsonError('Return ID required');
    if (!in_array($newStatus, ['pending', 'approved', 'completed', 'rejected'])) {
        jsonError('Invalid status');
    }
    
    try {
        Database::execute("UPDATE returns SET status = ? WHERE id = ?", [$newStatus, $id]);
        auditLog('update_status', 'return', $id, null, ['status' => $newStatus]);
        jsonSuccess('Return status updated successfully');
    } catch (Exception $e) {
        jsonError('Failed to update status: ' . $e->getMessage(), 500);
    }
}

jsonError('Endpoint not found', 404);
