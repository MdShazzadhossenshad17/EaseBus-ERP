<?php
/**
 * BusinessM — Orders & Sales API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';

// GET /api/orders?action=summary
if ($method === 'GET' && $action === 'summary') {
    requirePermission('orders', 'read');
    
    $totalOrders = Database::fetchOne("SELECT COUNT(*) as count FROM orders");
    $totalRev = Database::fetchOne("SELECT SUM(total_amount) as rev FROM orders WHERE order_status != 'cancelled'");
    $pendingOrders = Database::fetchOne("SELECT COUNT(*) as count FROM orders WHERE order_status = 'pending'");
    $deliveredOrders = Database::fetchOne("SELECT COUNT(*) as count FROM orders WHERE order_status = 'delivered'");
    
    $summary = [
        'total_orders' => (int) ($totalOrders['count'] ?? 0),
        'total_revenue' => (float) ($totalRev['rev'] ?? 0),
        'pending_orders' => (int) ($pendingOrders['count'] ?? 0),
        'delivered_orders' => (int) ($deliveredOrders['count'] ?? 0)
    ];
    
    jsonSuccess('Orders summary loaded', ['summary' => $summary]);
}

// GET /api/orders?action=list
if ($method === 'GET' && $action === 'list') {
    requirePermission('orders', 'read');
    
    $search = getSearchQuery();
    $status = $_GET['status'] ?? 'all';
    
    $params = [];
    $whereParts = [];
    
    if ($status !== 'all') {
        $whereParts[] = "o.order_status = ?";
        $params[] = $status;
    }
    
    if ($search) {
        $whereParts[] = "(o.order_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)";
        $searchTerm = "%{$search}%";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
    }
    
    $where = count($whereParts) > 0 ? "WHERE " . implode(' AND ', $whereParts) : "";
    
    $orders = Database::fetchAll(
        "SELECT 
            o.*, 
            c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         {$where}
         ORDER BY o.id DESC",
        $params
    );
    
    jsonSuccess('Orders loaded', ['orders' => $orders]);
}

// GET /api/orders?action=detail
if ($method === 'GET' && $action === 'detail') {
    requirePermission('orders', 'read');
    
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) jsonError('Order ID required');
    
    $order = Database::fetchOne(
        "SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         WHERE o.id = ?",
        [$id]
    );
    
    if (!$order) jsonError('Order not found', 404);
    
    $items = Database::fetchAll(
        "SELECT oi.*, COALESCE(v.variant_name, p.name) as product_name, v.sku as variant_sku, v.variant_name
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN product_variants v ON oi.variant_id = v.id
         WHERE oi.order_id = ?",
        [$id]
    );
    
    $biz = Database::getBusinessSettings();
    
    jsonSuccess('Order detail loaded', [
        'order' => $order,
        'items' => $items,
        'business' => $biz
    ]);
}

// POST /api/orders?action=create (Supports Write System)
if ($method === 'POST' && $action === 'create') {
    requirePermission('orders', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    
    if (empty($input['items']) || !is_array($input['items'])) {
        jsonError('Order must contain at least one product item');
    }
    
    $discount = (float) ($input['discount_amount'] ?? 0);
    $deliveryCharge = (float) ($input['delivery_charge'] ?? 0);
    $paymentStatus = in_array($input['payment_status'] ?? '', ['paid', 'unpaid', 'partial']) ? $input['payment_status'] : 'unpaid';
    $expDate = !empty($input['expected_delivery_date']) ? $input['expected_delivery_date'] : date('Y-m-d', strtotime('+3 days'));
    $notes = $input['notes'] ?? '';
    
    $locationId = Database::getDefaultLocationId();
    $biz = Database::getBusinessSettings();
    
    try {
        Database::beginTransaction();
        
        // 1. Resolve Customer (Write System or ID)
        $customerId = (int) ($input['customer_id'] ?? 0);
        $customerName = trim($input['customer_name'] ?? '');
        $customerPhone = trim($input['customer_phone'] ?? '');
        $customerAddress = trim($input['customer_address'] ?? '');

        if (!$customerId) {
            if (empty($customerName) || empty($customerPhone)) {
                jsonError('Please write customer name and phone number', 400);
            }
            
            $existingCust = Database::fetchOne("SELECT id FROM customers WHERE phone = ?", [$customerPhone]);
            if ($existingCust) {
                $customerId = (int) $existingCust['id'];
                if (!empty($customerAddress)) {
                    Database::execute("UPDATE customers SET address = ? WHERE id = ?", [$customerAddress, $customerId]);
                }
            } else {
                $customerId = Database::insert(
                    "INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)",
                    [$customerName, $customerPhone, $customerAddress]
                );
            }
        }
        
        $subtotal = 0;
        $totalCost = 0;
        $orderItems = [];
        
        // 2. Resolve Items (Write System or Variant ID)
        foreach ($input['items'] as $index => $item) {
            $variantId = (int) ($item['variant_id'] ?? 0);
            $itemName = trim($item['item_name'] ?? '');
            $sku = trim($item['variant_sku'] ?? '');
            $qty = (int) ($item['quantity'] ?? 1);
            $unitPrice = (float) ($item['unit_price'] ?? 0);
            
            if ($qty <= 0) jsonError("Quantity must be at least 1 for line item " . ($index + 1));
            
            if ($variantId > 0) {
                $variant = Database::fetchOne(
                    "SELECT v.id, v.product_id, v.selling_price as v_price, p.selling_price as p_price, v.avg_cost_price, v.current_stock
                     FROM product_variants v
                     JOIN products p ON v.product_id = p.id
                     WHERE v.id = ? FOR UPDATE",
                    [$variantId]
                );
                if ($variant) {
                    $costPrice = (float)$variant['avg_cost_price'];
                    $effectivePrice = $unitPrice > 0 ? $unitPrice : ($variant['v_price'] !== null ? (float)$variant['v_price'] : (float)$variant['p_price']);
                    $totalPrice = ($effectivePrice * $qty) - (float)($item['discount'] ?? 0);
                    
                    $subtotal += $totalPrice;
                    $totalCost += ($costPrice * $qty);
                    
                    $orderItems[] = [
                        'product_id' => $variant['product_id'],
                        'variant_id' => $variant['id'],
                        'quantity' => $qty,
                        'unit_price' => $effectivePrice,
                        'cost_price' => $costPrice,
                        'discount' => (float)($item['discount'] ?? 0),
                        'total_price' => $totalPrice
                    ];
                    continue;
                }
            }
            
            // Custom typed item (Write System)
            if (empty($itemName)) {
                jsonError("Please write product item name for line " . ($index + 1));
            }
            
            $defaultProd = Database::fetchOne("SELECT id FROM products WHERE name = 'General Sales Item'");
            if (!$defaultProd) {
                $prodId = Database::insert(
                    "INSERT INTO products (name, sku, description, selling_price, created_by) VALUES ('General Sales Item', 'GEN-001', 'Standard item for write-in sales', 0.00, ?)",
                    [getCurrentUserId()]
                );
            } else {
                $prodId = (int) $defaultProd['id'];
            }
            
            $itemSku = !empty($sku) ? $sku : generateRefNo('SKU', 'product_variants', 'sku');
            $variant = Database::fetchOne("SELECT id FROM product_variants WHERE sku = ?", [$itemSku]);
            if (!$variant) {
                $vId = Database::insert(
                    "INSERT INTO product_variants (product_id, sku, variant_name, selling_price, avg_cost_price, current_stock, location_id) VALUES (?, ?, ?, ?, ?, 1000, ?)",
                    [$prodId, $itemSku, $itemName, $unitPrice, 0.00, $locationId]
                );
            } else {
                $vId = (int) $variant['id'];
            }
            
            $totalPrice = ($unitPrice * $qty) - (float)($item['discount'] ?? 0);
            $subtotal += $totalPrice;
            
            $orderItems[] = [
                'product_id' => $prodId,
                'variant_id' => $vId,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'cost_price' => 0.00,
                'discount' => (float)($item['discount'] ?? 0),
                'total_price' => $totalPrice
            ];
        }
        
        $taxAmount = 0;
        if ((int)$biz['tax_enabled'] === 1 && (float)$biz['tax_rate'] > 0) {
            $taxAmount = ($subtotal - $discount) * ((float)$biz['tax_rate'] / 100);
        }
        
        $totalAmount = ($subtotal - $discount) + $taxAmount + $deliveryCharge;
        $profit = ($subtotal - $discount) - $totalCost;
        
        $orderNo = generateRefNo('ORD', 'orders', 'order_no');
        
        // Create Order
        $orderId = Database::insert(
            "INSERT INTO orders (
                order_no, customer_id, subtotal, discount_amount, tax_amount, delivery_charge,
                total_amount, total_cost, profit, payment_status, location_id, created_by, order_date, expected_delivery_date, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)",
            [
                $orderNo, $customerId, $subtotal, $discount, $taxAmount, $deliveryCharge,
                $totalAmount, $totalCost, $profit, $paymentStatus, $locationId, getCurrentUserId(),
                $expDate, $notes
            ]
        );
        
        // Insert Order Items & Record Movement
        foreach ($orderItems as $item) {
            Database::insert(
                "INSERT INTO order_items (order_id, product_id, variant_id, quantity, unit_price, cost_price, discount, total_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [$orderId, $item['product_id'], $item['variant_id'], $item['quantity'], $item['unit_price'], $item['cost_price'], $item['discount'], $item['total_price']]
            );
            
            $variantStock = Database::fetchOne("SELECT current_stock FROM product_variants WHERE id = ?", [$item['variant_id']]);
            $stockBefore = (int)($variantStock['current_stock'] ?? 100);
            $newStock = max(0, $stockBefore - $item['quantity']);
            
            Database::execute("UPDATE product_variants SET current_stock = ? WHERE id = ?", [$newStock, $item['variant_id']]);
            
            Database::insert(
                "INSERT INTO inventory_movements (product_id, variant_id, movement_type, quantity, stock_before, stock_after, reference_type, reference_id, location_id, created_by)
                 VALUES (?, ?, 'sale', ?, ?, ?, 'order', ?, ?, ?)",
                [$item['product_id'], $item['variant_id'], -$item['quantity'], $stockBefore, $newStock, $orderId, $locationId, getCurrentUserId()]
            );
        }
        
        Database::execute("UPDATE customers SET total_orders = total_orders + 1, last_order_date = NOW() WHERE id = ?", [$customerId]);
        
        // Auto-create delivery shipment tracking entry
        $trackingNo = 'TRK-' . strtoupper(substr(md5($orderNo . time()), 0, 8));
        $custInfo = Database::fetchOne("SELECT phone, address FROM customers WHERE id = ?", [$customerId]);
        Database::insert(
            "INSERT INTO deliveries (order_id, customer_id, address, phone, tracking_number, delivery_fee, status, expected_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, 'order_placed', ?, ?)",
            [
                $orderId, $customerId, 
                $custInfo['address'] ?? $customerAddress, 
                $custInfo['phone'] ?? $customerPhone, 
                $trackingNo, $deliveryCharge, $expDate, $notes
            ]
        );
        
        Database::commit();
        auditLog('create', 'order', $orderId, null, ['order_no' => $orderNo]);
        
        jsonSuccess('Order created successfully', ['order_id' => $orderId, 'order_no' => $orderNo]);
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to create order: ' . $e->getMessage(), 500);
    }
}

// PUT /api/orders?action=status
if ($method === 'PUT' && $action === 'status') {
    requirePermission('orders', 'update');
    verifyCsrf();
    
    $input = getJsonInput();
    $id = (int) ($input['order_id'] ?? 0);
    $newStatus = $input['status'] ?? '';
    
    if (!$id) jsonError('Order ID required');
    if (!in_array($newStatus, ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'])) {
        jsonError('Invalid status');
    }
    
    try {
        Database::beginTransaction();
        
        $order = Database::fetchOne("SELECT order_no, order_status, total_amount, total_cost, customer_id FROM orders WHERE id = ? FOR UPDATE", [$id]);
        if (!$order) jsonError('Order not found', 404);
        
        $oldStatus = $order['order_status'];
        if ($oldStatus === $newStatus) jsonError('Order is already in this status');
        
        if ($newStatus === 'delivered' && $oldStatus !== 'delivered') {
            $invoiceNo = generateRefNo('INV', 'sales', 'invoice_no');
            
            Database::insert(
                "INSERT INTO sales (invoice_no, order_id, customer_id, total_revenue, total_cogs, gross_profit, sale_date, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)",
                [
                    $invoiceNo, $id, $order['customer_id'], 
                    $order['total_amount'], $order['total_cost'], 
                    $order['total_amount'] - $order['total_cost'],
                    getCurrentUserId()
                ]
            );
            
            Database::execute("UPDATE customers SET total_purchased = total_purchased + ?, outstanding_amount = outstanding_amount + ? WHERE id = ?", 
                [$order['total_amount'], $order['total_amount'], $order['customer_id']]
            );

            Database::execute("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [$id]);
        }
        
        if ($newStatus === 'cancelled' && $oldStatus !== 'cancelled') {
            $items = Database::fetchAll("SELECT * FROM order_items WHERE order_id = ?", [$id]);
            foreach ($items as $item) {
                $variant = Database::fetchOne("SELECT current_stock, location_id FROM product_variants WHERE id = ? FOR UPDATE", [$item['variant_id']]);
                if ($variant) {
                    $newStock = $variant['current_stock'] + $item['quantity'];
                    Database::execute("UPDATE product_variants SET current_stock = ? WHERE id = ?", [$newStock, $item['variant_id']]);
                    
                    Database::insert(
                        "INSERT INTO inventory_movements (product_id, variant_id, movement_type, quantity, stock_before, stock_after, reference_type, reference_id, location_id, reason, created_by)
                         VALUES (?, ?, 'return', ?, ?, ?, 'order', ?, ?, 'Order Cancelled', ?)",
                        [$item['product_id'], $item['variant_id'], $item['quantity'], $variant['current_stock'], $newStock, $id, $variant['location_id'], getCurrentUserId()]
                    );
                }
            }
        }
        
        Database::execute("UPDATE orders SET order_status = ? WHERE id = ?", [$newStatus, $id]);
        
        Database::commit();
        auditLog('update_status', 'order', $id, ['status' => $oldStatus], ['status' => $newStatus]);
        
        jsonSuccess('Order status updated successfully');
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to update status: ' . $e->getMessage(), 500);
    }
}

// PUT /api/orders?action=payment_status
if ($method === 'PUT' && $action === 'payment_status') {
    requirePermission('orders', 'update');
    verifyCsrf();
    
    $input = getJsonInput();
    $id = (int) ($input['order_id'] ?? 0);
    $payStatus = $input['payment_status'] ?? '';
    
    if (!$id) jsonError('Order ID required');
    if (!in_array($payStatus, ['unpaid', 'partial', 'paid', 'refunded'])) {
        jsonError('Invalid payment status');
    }
    
    Database::execute("UPDATE orders SET payment_status = ? WHERE id = ?", [$payStatus, $id]);
    jsonSuccess('Payment status updated successfully');
}

jsonError('Endpoint not found', 404);
