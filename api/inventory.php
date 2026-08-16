<?php
/**
 * BusinessM — Inventory API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';

// GET /api/inventory?action=summary
if ($method === 'GET' && $action === 'summary') {
    requirePermission('inventory', 'read');
    
    $summary = [
        'total_items' => 0,
        'low_stock_count' => 0,
        'out_of_stock_count' => 0,
        'total_asset_value' => 0
    ];
    
    $totals = Database::fetchOne(
        "SELECT 
            SUM(v.current_stock) as total_items, 
            SUM(v.current_stock * v.avg_cost_price) as total_asset_value 
         FROM product_variants v WHERE v.status = 'active'"
    );
    
    $lowStock = Database::fetchOne(
        "SELECT COUNT(*) as count 
         FROM product_variants v 
         JOIN products p ON v.product_id = p.id 
         WHERE v.current_stock > 0 AND v.current_stock <= p.min_stock_level AND v.status = 'active'"
    );
    
    $outOfStock = Database::fetchOne(
        "SELECT COUNT(*) as count 
         FROM product_variants v 
         WHERE v.current_stock = 0 AND v.status = 'active'"
    );
    
    $summary['total_items'] = (int) ($totals['total_items'] ?? 0);
    $summary['total_asset_value'] = (float) ($totals['total_asset_value'] ?? 0);
    $summary['low_stock_count'] = (int) ($lowStock['count'] ?? 0);
    $summary['out_of_stock_count'] = (int) ($outOfStock['count'] ?? 0);
    
    jsonSuccess('Inventory summary loaded', ['summary' => $summary]);
}

// GET /api/inventory?action=list
if ($method === 'GET' && $action === 'list') {
    requirePermission('inventory', 'read');
    
    $search = getSearchQuery();
    $params = [];
    $where = "";
    
    if ($search) {
        $where = "WHERE p.name LIKE ? OR p.sku LIKE ? OR v.sku LIKE ?";
        $searchTerm = "%{$search}%";
        $params = [$searchTerm, $searchTerm, $searchTerm];
    }
    
    $inventory = Database::fetchAll(
        "SELECT 
            v.id as variant_id, v.sku as variant_sku, v.variant_name, v.current_stock, v.avg_cost_price,
            p.id as product_id, p.name as product_name, p.sku as product_sku, p.min_stock_level,
            l.name as location_name
         FROM product_variants v
         JOIN products p ON v.product_id = p.id
         JOIN locations l ON v.location_id = l.id
         {$where}
         ORDER BY p.name ASC, v.variant_name ASC",
        $params
    );
    
    jsonSuccess('Inventory loaded', ['inventory' => $inventory]);
}

// POST /api/inventory?action=adjust
if ($method === 'POST' && $action === 'adjust') {
    requirePermission('inventory', 'update');
    verifyCsrf();
    
    $input = getJsonInput();

    // Flexible resolution of variant_id
    $variantId = (int) ($input['variant_id'] ?? 0);
    $productId = (int) ($input['product_id'] ?? 0);
    $sku = trim($input['sku'] ?? '');

    if (!$variantId && $productId) {
        $vRow = Database::fetchOne("SELECT id FROM product_variants WHERE product_id = ? LIMIT 1", [$productId]);
        if ($vRow) $variantId = (int) $vRow['id'];
    }

    if (!$variantId && $sku) {
        $vRow = Database::fetchOne(
            "SELECT id FROM product_variants WHERE sku = ? OR product_id = (SELECT id FROM products WHERE sku = ? LIMIT 1) LIMIT 1",
            [$sku, $sku]
        );
        if ($vRow) $variantId = (int) $vRow['id'];
    }

    if (!$variantId) {
        $vRow = Database::fetchOne("SELECT id FROM product_variants WHERE status = 'active' ORDER BY id ASC LIMIT 1");
        if ($vRow) $variantId = (int) $vRow['id'];
    }

    if (!$variantId) jsonError('Product variant not found for stock adjustment', 400);

    // Normalize adjustment type
    $rawType = strtolower(trim($input['adjustment_type'] ?? 'manual_add'));
    $adjType = 'manual_add';
    if (strpos($rawType, 'remove') !== false || strpos($rawType, 'outflow') !== false) {
        $adjType = 'manual_remove';
    } elseif (strpos($rawType, 'damage') !== false) {
        $adjType = 'damage';
    } elseif (strpos($rawType, 'lost') !== false) {
        $adjType = 'lost';
    } elseif (strpos($rawType, 'adjustment') !== false) {
        $adjType = 'adjustment';
    }

    $qty = max(1, (int) ($input['quantity'] ?? 1));
    $reason = !empty($input['reason']) ? trim($input['reason']) : 'Stock Adjustment';

    try {
        Database::beginTransaction();
        
        $variant = Database::fetchOne(
            "SELECT product_id, current_stock, location_id FROM product_variants WHERE id = ? FOR UPDATE",
            [$variantId]
        );
        
        if (!$variant) jsonError('Variant not found', 404);
        
        $stockBefore = (int) $variant['current_stock'];
        $stockAfter = $stockBefore;
        
        if ($adjType === 'manual_add' || $adjType === 'adjustment') {
            $stockAfter = $stockBefore + $qty;
        } else {
            $stockAfter = max(0, $stockBefore - $qty);
        }
        
        Database::execute(
            "UPDATE product_variants SET current_stock = ? WHERE id = ?",
            [$stockAfter, $variantId]
        );
        
        Database::insert(
            "INSERT INTO inventory_movements (
                product_id, variant_id, movement_type, quantity, 
                stock_before, stock_after, location_id, reason, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $variant['product_id'],
                $variantId,
                $adjType,
                $adjType === 'manual_add' || $adjType === 'adjustment' ? $qty : -$qty,
                $stockBefore,
                $stockAfter,
                $variant['location_id'],
                $reason,
                getCurrentUserId()
            ]
        );
        
        Database::commit();
        auditLog('inventory_adjust', 'variant', $variantId, ['stock' => $stockBefore], ['stock' => $stockAfter, 'reason' => $reason]);
        
        jsonSuccess('Stock adjusted successfully', [
            'variant_id' => $variantId,
            'stock_before' => $stockBefore,
            'stock_after' => $stockAfter
        ]);
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to adjust inventory: ' . $e->getMessage(), 500);
    }
}

// GET /api/inventory?action=movements
if ($method === 'GET' && $action === 'movements') {
    requirePermission('inventory', 'read');
    $variantId = isset($_GET['variant_id']) ? (int) $_GET['variant_id'] : null;
    
    $where = "";
    $params = [];
    if ($variantId) {
        $where = "WHERE m.variant_id = ?";
        $params[] = $variantId;
    }
    
    $movements = Database::fetchAll(
        "SELECT 
            m.*, 
            u.username as created_by_name,
            v.sku as variant_sku, v.variant_name,
            p.name as product_name
         FROM inventory_movements m
         LEFT JOIN users u ON m.created_by = u.id
         JOIN product_variants v ON m.variant_id = v.id
         JOIN products p ON m.product_id = p.id
         {$where}
         ORDER BY m.id DESC LIMIT 100",
        $params
    );
    
    jsonSuccess('Movements loaded', ['movements' => $movements]);
}

jsonError('Endpoint not found', 404);
