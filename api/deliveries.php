<?php
/**
 * BusinessM — Deliveries & Logistics API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';

// GET /api/deliveries?action=summary
if ($method === 'GET' && $action === 'summary') {
    requirePermission('deliveries', 'read');
    
    $total = Database::fetchOne("SELECT COUNT(*) as count FROM deliveries");
    $pending = Database::fetchOne("SELECT COUNT(*) as count FROM deliveries WHERE status IN ('pending', 'picked_up')");
    $transit = Database::fetchOne("SELECT COUNT(*) as count FROM deliveries WHERE status IN ('in_transit', 'out_for_delivery')");
    $delivered = Database::fetchOne("SELECT COUNT(*) as count FROM deliveries WHERE status = 'delivered'");
    
    $summary = [
        'total_deliveries' => (int) ($total['count'] ?? 0),
        'pending_pickups' => (int) ($pending['count'] ?? 0),
        'in_transit' => (int) ($transit['count'] ?? 0),
        'delivered_count' => (int) ($delivered['count'] ?? 0)
    ];
    
    jsonSuccess('Deliveries summary loaded', ['summary' => $summary]);
}

// GET /api/deliveries?action=list
if ($method === 'GET' && $action === 'list') {
    requirePermission('deliveries', 'read');
    
    $status = $_GET['status'] ?? 'all';
    $search = getSearchQuery();
    
    $params = [];
    $whereParts = [];
    
    if ($status !== 'all') {
        $whereParts[] = "d.status = ?";
        $params[] = $status;
    }
    
    if ($search) {
        $whereParts[] = "(o.order_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR d.tracking_number LIKE ? OR dc.name LIKE ?)";
        $searchTerm = "%{$search}%";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    }
    
    $where = count($whereParts) > 0 ? "WHERE " . implode(' AND ', $whereParts) : "";
    
    $deliveries = Database::fetchAll(
        "SELECT 
            d.*, 
            o.order_no, o.total_amount, o.order_status,
            c.name as customer_name, c.phone as customer_phone,
            dc.name as courier_name
         FROM deliveries d
         JOIN orders o ON d.order_id = o.id
         JOIN customers c ON d.customer_id = c.id
         LEFT JOIN delivery_couriers dc ON d.courier_id = dc.id
         {$where}
         ORDER BY d.id DESC",
        $params
    );
    
    jsonSuccess('Deliveries loaded', ['deliveries' => $deliveries]);
}

// POST /api/deliveries?action=create
if ($method === 'POST' && $action === 'create') {
    requirePermission('deliveries', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('order_id')->integer('order_id');
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    $orderId = (int) $v->value('order_id');
    
    // Check if delivery exists
    $existing = Database::fetchOne("SELECT id FROM deliveries WHERE order_id = ?", [$orderId]);
    if ($existing) jsonError('A delivery record already exists for this order.');
    
    $order = Database::fetchOne("SELECT customer_id, order_no, total_amount FROM orders WHERE id = ?", [$orderId]);
    if (!$order) jsonError('Order not found', 404);
    
    $cust = Database::fetchOne("SELECT phone, address FROM customers WHERE id = ?", [$order['customer_id']]);
    
    try {
        Database::beginTransaction();
        
        $courierId = null;
        $courierName = trim($input['courier_name'] ?? '');
        if (!empty($courierName)) {
            $existingCourier = Database::fetchOne("SELECT id FROM delivery_couriers WHERE name = ?", [$courierName]);
            if ($existingCourier) {
                $courierId = (int) $existingCourier['id'];
            } else {
                $courierId = Database::insert("INSERT INTO delivery_couriers (name) VALUES (?)", [$courierName]);
            }
        } elseif (!empty($input['courier_id'])) {
            $courierId = (int) $input['courier_id'];
        }

        $trackingNo = !empty($input['tracking_number']) ? $input['tracking_number'] : 'TRK-' . strtoupper(substr(md5($order['order_no'] . time()), 0, 8));
        
        $deliveryId = Database::insert(
            "INSERT INTO deliveries (order_id, customer_id, address, phone, courier_id, tracking_number, delivery_fee, status, expected_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'order_placed', ?, ?)",
            [
                $orderId,
                $order['customer_id'],
                $input['address'] ?? ($cust['address'] ?? 'Customer Delivery Address'),
                $input['phone'] ?? ($cust['phone'] ?? ''),
                $courierId,
                $trackingNo,
                (float) ($input['delivery_fee'] ?? 0),
                $input['expected_date'] ?? date('Y-m-d', strtotime('+3 days')),
                $input['notes'] ?? ''
            ]
        );
        
        Database::commit();
        auditLog('create', 'delivery', $deliveryId, null, ['order_id' => $orderId]);
        
        jsonSuccess('Delivery shipment created successfully', ['id' => $deliveryId]);
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to create delivery: ' . $e->getMessage(), 500);
    }
}

// PUT /api/deliveries?action=status
if ($method === 'PUT' && $action === 'status') {
    requirePermission('deliveries', 'update');
    verifyCsrf();
    
    $input = getJsonInput();
    $id = (int) ($input['id'] ?? 0);
    $newStatus = $input['status'] ?? null;
    
    if (!$id) jsonError('Delivery ID required');
    $validStatuses = ['order_placed', 'processing', 'pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned', 'cancelled'];
    if (!empty($newStatus) && !in_array($newStatus, $validStatuses)) {
        jsonError('Invalid status');
    }
    
    try {
        Database::beginTransaction();
        
        $delivery = Database::fetchOne("SELECT order_id, status FROM deliveries WHERE id = ? FOR UPDATE", [$id]);
        if (!$delivery) jsonError('Delivery not found', 404);
        
        $oldStatus = $delivery['status'];
        $updateFields = [];
        $params = [];

        if (!empty($newStatus) && $newStatus !== $oldStatus) {
            $updateFields[] = "status = ?";
            $params[] = $newStatus;

            if ($newStatus === 'picked_up') {
                $updateFields[] = "shipped_date = NOW()";
            } elseif ($newStatus === 'delivered') {
                $updateFields[] = "delivered_date = NOW()";
                
                // Auto-update order status to delivered & record sale
                $order = Database::fetchOne("SELECT id, order_no, order_status, total_amount, total_cost, customer_id FROM orders WHERE id = ?", [$delivery['order_id']]);
                if ($order && $order['order_status'] !== 'delivered') {
                    $invoiceNo = generateRefNo('INV', 'sales', 'invoice_no');
                    Database::insert(
                        "INSERT INTO sales (invoice_no, order_id, customer_id, total_revenue, total_cogs, gross_profit, sale_date, created_by)
                         VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)",
                        [
                            $invoiceNo, $order['id'], $order['customer_id'],
                            $order['total_amount'], $order['total_cost'],
                            $order['total_amount'] - $order['total_cost'],
                            getCurrentUserId()
                        ]
                    );
                    Database::execute("UPDATE customers SET total_purchased = total_purchased + ? WHERE id = ?", [$order['total_amount'], $order['customer_id']]);
                    Database::execute("UPDATE orders SET order_status = 'delivered', payment_status = 'paid' WHERE id = ?", [$order['id']]);
                }
            } elseif ($newStatus === 'returned') {
                // Auto-create Customer Return entry with initial status 'pending' (Pending Review)
                $existingReturn = Database::fetchOne("SELECT id FROM returns WHERE order_id = ?", [$delivery['order_id']]);
                if (!$existingReturn) {
                    $orderInfo = Database::fetchOne("SELECT id, customer_id, total_amount, location_id FROM orders WHERE id = ?", [$delivery['order_id']]);
                    if ($orderInfo) {
                        $returnNo = generateRefNo('RET', 'returns', 'return_no');
                        $returnId = Database::insert(
                            "INSERT INTO returns (return_no, order_id, customer_id, total_refund, reason, status, return_date, notes, created_by)
                             VALUES (?, ?, ?, ?, 'other', 'pending', NOW(), 'Delivery Shipment Returned by Courier Partner (Pending Review)', ?)",
                            [
                                $returnNo, $orderInfo['id'], $orderInfo['customer_id'],
                                $orderInfo['total_amount'], getCurrentUserId()
                            ]
                        );

                        $orderItems = Database::fetchAll("SELECT id, product_id, variant_id, quantity, unit_price FROM order_items WHERE order_id = ?", [$orderInfo['id']]);
                        foreach ($orderItems as $item) {
                            Database::insert(
                                "INSERT INTO return_items (return_id, order_item_id, product_id, variant_id, quantity, refund_amount)
                                 VALUES (?, ?, ?, ?, ?, ?)",
                                [$returnId, $item['id'], $item['product_id'], $item['variant_id'], $item['quantity'], $item['quantity'] * $item['unit_price']]
                            );
                        }

                        Database::execute("UPDATE orders SET order_status = 'returned' WHERE id = ?", [$orderInfo['id']]);
                    }
                }
            }
        }

        if (isset($input['tracking_number'])) {
            $updateFields[] = "tracking_number = ?";
            $params[] = trim($input['tracking_number']);
        }

        if (isset($input['delivery_fee'])) {
            $updateFields[] = "delivery_fee = ?";
            $params[] = (float)$input['delivery_fee'];
        }

        if (count($updateFields) > 0) {
            $updateFieldsStr = implode(', ', $updateFields);
            $params[] = $id;
            Database::execute("UPDATE deliveries SET {$updateFieldsStr} WHERE id = ?", $params);
        }
        
        // Also update courier assignment if passed (write-in or ID)
        $cName = trim($input['courier_name'] ?? '');
        if (!empty($cName)) {
            $existingC = Database::fetchOne("SELECT id FROM delivery_couriers WHERE name = ?", [$cName]);
            $cId = $existingC ? (int)$existingC['id'] : Database::insert("INSERT INTO delivery_couriers (name) VALUES (?)", [$cName]);
            Database::execute("UPDATE deliveries SET courier_id = ? WHERE id = ?", [$cId, $id]);
        } elseif (!empty($input['courier_id'])) {
            Database::execute("UPDATE deliveries SET courier_id = ? WHERE id = ?", [(int)$input['courier_id'], $id]);
        }
        
        Database::commit();
        auditLog('update_status', 'delivery', $id, ['status' => $oldStatus], ['status' => $newStatus]);
        
        jsonSuccess('Delivery status updated successfully');
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to update status: ' . $e->getMessage(), 500);
    }
}

// GET /api/deliveries?action=couriers
if ($method === 'GET' && $action === 'couriers') {
    $couriers = Database::fetchAll("SELECT id, name, phone FROM delivery_couriers WHERE status = 'active'");
    jsonSuccess('Couriers loaded', ['couriers' => $couriers]);
}

// DELETE /api/deliveries?action=delete&id=123
if ($method === 'DELETE' && $action === 'delete') {
    requirePermission('deliveries', 'delete');
    verifyCsrf();

    $id = (int) ($_GET['id'] ?? $_POST['id'] ?? 0);
    if (!$id) jsonError('Delivery ID required');

    $delivery = Database::fetchOne("SELECT id, tracking_number, status FROM deliveries WHERE id = ?", [$id]);
    if (!$delivery) jsonError('Delivery not found', 404);

    try {
        Database::execute("DELETE FROM deliveries WHERE id = ?", [$id]);
        auditLog('delete', 'delivery', $id, ['tracking' => $delivery['tracking_number'], 'status' => $delivery['status']], null);
        jsonSuccess('Delivery deleted successfully');
    } catch (Exception $e) {
        jsonError('Failed to delete delivery: ' . $e->getMessage(), 500);
    }
}

jsonError('Endpoint not found', 404);
