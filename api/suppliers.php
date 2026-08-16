<?php
/**
 * BusinessM — Suppliers API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';

// GET /api/suppliers?action=summary
if ($method === 'GET' && $action === 'summary') {
    requirePermission('suppliers', 'read');
    
    $active = Database::fetchOne("SELECT COUNT(*) as count FROM suppliers WHERE status = 'active'");
    $totalProds = Database::fetchOne("SELECT COUNT(*) as count FROM products WHERE supplier_id IS NOT NULL");
    $totalPurchases = Database::fetchOne("SELECT COUNT(*) as count FROM purchases");
    $procurementVal = Database::fetchOne("SELECT SUM(total_amount) as sum FROM purchases");
    
    $summary = [
        'active_suppliers' => (int) ($active['count'] ?? 0),
        'total_products' => (int) ($totalProds['count'] ?? 0),
        'total_purchases' => (int) ($totalPurchases['count'] ?? 0),
        'procurement_value' => (float) ($procurementVal['sum'] ?? 0)
    ];
    
    jsonSuccess('Suppliers summary loaded', ['summary' => $summary]);
}

// GET /api/suppliers?action=list
if ($method === 'GET' && $action === 'list') {
    requirePermission('suppliers', 'read');
    
    $search = getSearchQuery();
    $status = $_GET['status'] ?? 'all';
    
    $params = [];
    $whereParts = [];
    
    if ($status !== 'all') {
        $whereParts[] = "s.status = ?";
        $params[] = $status;
    }
    
    if ($search) {
        $whereParts[] = "(s.name LIKE ? OR s.company LIKE ? OR s.phone LIKE ? OR s.email LIKE ? OR s.address LIKE ?)";
        $searchTerm = "%{$search}%";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    }
    
    $where = count($whereParts) > 0 ? "WHERE " . implode(' AND ', $whereParts) : "";
    
    $suppliers = Database::fetchAll(
        "SELECT s.*, 
            (SELECT COUNT(*) FROM products WHERE supplier_id = s.id) as total_products,
            (SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id) as total_purchases
         FROM suppliers s
         {$where}
         ORDER BY s.name ASC",
        $params
    );
    
    jsonSuccess('Suppliers loaded', ['suppliers' => $suppliers]);
}

// POST /api/suppliers?action=create
if ($method === 'POST' && $action === 'create') {
    requirePermission('suppliers', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('name')->maxLength('name', 100)
      ->maxLength('company', 100)
      ->maxLength('phone', 20);
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    try {
        $id = Database::insert(
            "INSERT INTO suppliers (name, company, phone, email, address, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')",
            [
                $v->value('name'),
                $v->value('company') ?? '',
                $v->value('phone') ?? '',
                $input['email'] ?? '',
                $input['address'] ?? '',
                $input['notes'] ?? ''
            ]
        );
        
        auditLog('create', 'supplier', $id, null, ['name' => $v->value('name')]);
        jsonSuccess('Supplier created successfully', ['id' => $id]);
        
    } catch (Exception $e) {
        jsonError('Failed to create supplier: ' . $e->getMessage(), 500);
    }
}

// PUT /api/suppliers?action=update
if ($method === 'PUT' && $action === 'update') {
    requirePermission('suppliers', 'update');
    verifyCsrf();
    
    $input = getJsonInput();
    $id = (int) ($input['id'] ?? 0);
    if (!$id) jsonError('Supplier ID required');
    
    $v = new Validator($input);
    $v->required('name')->maxLength('name', 100)
      ->maxLength('company', 100)
      ->maxLength('phone', 20)
      ->inList('status', ['active', 'inactive']);
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    try {
        Database::execute(
            "UPDATE suppliers SET name = ?, company = ?, phone = ?, email = ?, address = ?, notes = ?, status = ? WHERE id = ?",
            [
                $v->value('name'),
                $v->value('company') ?? '',
                $v->value('phone') ?? '',
                $input['email'] ?? '',
                $input['address'] ?? '',
                $input['notes'] ?? '',
                $v->value('status'),
                $id
            ]
        );
        
        auditLog('update', 'supplier', $id, null, ['name' => $v->value('name'), 'status' => $v->value('status')]);
        jsonSuccess('Supplier updated successfully');

    } catch (Exception $e) {
        jsonError('Failed to update supplier: ' . $e->getMessage(), 500);
    }
}

if ($method === 'DELETE' && $action === 'delete') {
    requirePermission('suppliers', 'delete');
    verifyCsrf();

    $id = (int) ($_GET['id'] ?? $_POST['id'] ?? 0);
    if (!$id) jsonError('Supplier ID required');

    $supplier = Database::fetchOne("SELECT id, name FROM suppliers WHERE id = ?", [$id]);
    if (!$supplier) jsonError('Supplier not found', 404);

    try {
        Database::execute("DELETE FROM suppliers WHERE id = ?", [$id]);
        auditLog('delete', 'supplier', $id, ['name' => $supplier['name']], null);
        jsonSuccess('Supplier deleted successfully');
    } catch (Exception $e) {
        jsonError('Failed to delete supplier: ' . $e->getMessage(), 500);
    }
}

jsonError('Endpoint not found', 404);
