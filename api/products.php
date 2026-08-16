<?php
/**
 * BusinessM — Products API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';


// GET /api/products?action=summary
if ($method === 'GET' && $action === 'summary') {
    requirePermission('products', 'read');
    
    $totalProds = Database::fetchOne("SELECT COUNT(*) as count FROM products WHERE status = 'active'");
    $totalSkus = Database::fetchOne("SELECT COUNT(*) as count FROM product_variants");
    $totalStock = Database::fetchOne("SELECT SUM(current_stock) as sum FROM product_variants");
    $lowStock = Database::fetchOne("SELECT COUNT(*) as count FROM product_variants WHERE current_stock <= 5");
    
    $summary = [
        'total_products' => (int) ($totalProds['count'] ?? 0),
        'total_skus' => (int) ($totalSkus['count'] ?? 0),
        'total_stock' => (int) ($totalStock['sum'] ?? 0),
        'low_stock_count' => (int) ($lowStock['count'] ?? 0)
    ];
    
    jsonSuccess('Products summary loaded', ['summary' => $summary]);
}

// GET /api/products?action=list
if ($method === 'GET' && $action === 'list') {
    requirePermission('products', 'read');
    
    $search = getSearchQuery();
    $categoryId = isset($_GET['category_id']) ? (int) $_GET['category_id'] : null;
    $status = $_GET['status'] ?? 'active';
    
    $params = [];
    $whereParts = ["p.status = ?"];
    $params[] = $status;
    
    if ($search) {
        $whereParts[] = "(p.name LIKE ? OR p.sku LIKE ?)";
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
    }
    
    if ($categoryId) {
        $whereParts[] = "p.category_id = ?";
        $params[] = $categoryId;
    }
    
    $where = implode(' AND ', $whereParts);
    
    $products = Database::fetchAll(
        "SELECT 
            p.id, p.sku, p.name, p.brand, p.selling_price, p.status,
            c.name as category_name, s.name as supplier_name,
            (SELECT SUM(current_stock) FROM product_variants WHERE product_id = p.id) as total_stock
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN suppliers s ON p.supplier_id = s.id
         WHERE {$where}
         ORDER BY p.id DESC",
        $params
    );
    
    jsonSuccess('Products loaded', ['products' => $products]);
}

// GET /api/products?action=details&id=123
if ($method === 'GET' && $action === 'details') {
    requirePermission('products', 'read');
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    
    if (!$id) jsonError('Product ID required');
    
    $product = Database::fetchOne(
        "SELECT p.*, c.name as category_name, sub.name as subcategory_name, s.name as supplier_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN subcategories sub ON p.subcategory_id = sub.id
         LEFT JOIN suppliers s ON p.supplier_id = s.id
         WHERE p.id = ?",
        [$id]
    );
    
    if (!$product) jsonError('Product not found', 404);
    
    // Get variants
    $variants = Database::fetchAll(
        "SELECT v.*, l.name as location_name 
         FROM product_variants v
         LEFT JOIN locations l ON v.location_id = l.id
         WHERE v.product_id = ?",
        [$id]
    );
    
    jsonSuccess('Product loaded', [
        'product' => $product,
        'variants' => $variants
    ]);
}

// POST /api/products?action=create
if ($method === 'POST' && $action === 'create') {
    requirePermission('products', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('name')->maxLength('name', 200)
      ->required('sku')->unique('sku', 'products', 'sku')
      ->numeric('purchase_price')->min('purchase_price', 0)
      ->required('selling_price')->numeric('selling_price')->min('selling_price', 0)
      ->integer('min_stock_level');
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    // Ensure we have at least one location for the default variant
    $defaultLocationId = Database::getDefaultLocationId();
    
    try {
        Database::beginTransaction();
        
        // Resolve Category (Write-in or ID)
        $categoryId = null;
        if (!empty($input['category_name'])) {
            $catName = trim($input['category_name']);
            $existing = Database::fetchOne("SELECT id FROM categories WHERE name = ?", [$catName]);
            if ($existing) {
                $categoryId = (int) $existing['id'];
            } else {
                $categoryId = Database::insert("INSERT INTO categories (name, status) VALUES (?, 'active')", [$catName]);
            }
        } elseif (!empty($input['category_id'])) {
            $categoryId = (int) $input['category_id'];
        }

        $productId = Database::insert(
            "INSERT INTO products (
                sku, name, category_id, subcategory_id, brand, description, 
                purchase_price, selling_price, min_stock_level, supplier_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $v->value('sku'),
                $v->value('name'),
                $categoryId,
                !empty($input['subcategory_id']) ? (int) $input['subcategory_id'] : null,
                $v->value('brand'),
                $v->value('description'),
                (float) $v->value('purchase_price', 0),
                (float) $v->value('selling_price'),
                (int) $v->value('min_stock_level', 5),
                !empty($input['supplier_id']) ? (int) $input['supplier_id'] : null,
                getCurrentUserId()
            ]
        );
        
        // Handle variants
        if (!empty($input['variants']) && is_array($input['variants'])) {
            foreach ($input['variants'] as $index => $variant) {
                if (empty($variant['sku'])) jsonError("Variant at index {$index} missing SKU");
                
                // Check variant SKU uniqueness
                $existingSku = Database::fetchOne("SELECT id FROM product_variants WHERE sku = ?", [$variant['sku']]);
                if ($existingSku) jsonError("Variant SKU '{$variant['sku']}' already exists.");

                Database::insert(
                    "INSERT INTO product_variants (
                        product_id, sku, variant_name, size, color, material, weight, 
                        purchase_price, selling_price, location_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        $productId,
                        $variant['sku'],
                        trim($variant['variant_name'] ?? 'Default'),
                        $variant['size'] ?? null,
                        $variant['color'] ?? null,
                        $variant['material'] ?? null,
                        $variant['weight'] ?? null,
                        isset($variant['purchase_price']) && $variant['purchase_price'] !== '' ? (float) $variant['purchase_price'] : null,
                        isset($variant['selling_price']) && $variant['selling_price'] !== '' ? (float) $variant['selling_price'] : null,
                        $defaultLocationId
                    ]
                );
            }
        } else {
            // Create default variant
            Database::insert(
                "INSERT INTO product_variants (product_id, sku, variant_name, location_id) VALUES (?, ?, 'Default', ?)",
                [$productId, $v->value('sku') . '-DEF', $defaultLocationId]
            );
        }
        
        Database::commit();
        auditLog('create', 'product', $productId, null, ['name' => $v->value('name')]);
        
        jsonSuccess('Product created successfully', ['product_id' => $productId]);
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to create product: ' . $e->getMessage(), 500);
    }
}

// PUT /api/products?action=update
if ($method === 'PUT' && $action === 'update') {
    requirePermission('products', 'update');
    verifyCsrf();
    
    $input = getJsonInput();
    $id = (int) ($input['id'] ?? 0);
    if (!$id) jsonError('Product ID required');
    
    $v = new Validator($input);
    $v->required('name')->maxLength('name', 200)
      ->required('sku')->unique('sku', 'products', 'sku', $id)
      ->numeric('purchase_price')->min('purchase_price', 0)
      ->required('selling_price')->numeric('selling_price')->min('selling_price', 0)
      ->integer('min_stock_level')
      ->inList('status', ['active', 'inactive', 'archived']);
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    try {
        Database::beginTransaction();
        
        // Resolve Category (Write-in or ID)
        $categoryId = null;
        if (!empty($input['category_name'])) {
            $catName = trim($input['category_name']);
            $existing = Database::fetchOne("SELECT id FROM categories WHERE name = ?", [$catName]);
            if ($existing) {
                $categoryId = (int) $existing['id'];
            } else {
                $categoryId = Database::insert("INSERT INTO categories (name, status) VALUES (?, 'active')", [$catName]);
            }
        } elseif (!empty($input['category_id'])) {
            $categoryId = (int) $input['category_id'];
        }

        Database::execute(
            "UPDATE products SET 
                sku = ?, name = ?, category_id = ?, subcategory_id = ?, 
                brand = ?, description = ?, purchase_price = ?, selling_price = ?, 
                min_stock_level = ?, supplier_id = ?, status = ?
             WHERE id = ?",
            [
                $v->value('sku'),
                $v->value('name'),
                $categoryId,
                !empty($input['subcategory_id']) ? (int) $input['subcategory_id'] : null,
                $v->value('brand'),
                $v->value('description'),
                (float) $v->value('purchase_price', 0),
                (float) $v->value('selling_price'),
                (int) $v->value('min_stock_level', 5),
                !empty($input['supplier_id']) ? (int) $input['supplier_id'] : null,
                $v->value('status'),
                $id
            ]
        );
        
        Database::commit();
        auditLog('update', 'product', $id, null, ['name' => $v->value('name'), 'status' => $v->value('status')]);
        
        jsonSuccess('Product updated successfully');
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to update product: ' . $e->getMessage(), 500);
    }
}

// GET /api/products?action=categories
if ($method === 'GET' && $action === 'categories') {
    $categories = Database::fetchAll("SELECT id, name FROM categories WHERE status = 'active' ORDER BY name ASC");
    $subcategories = Database::fetchAll("SELECT id, category_id, name FROM subcategories WHERE status = 'active' ORDER BY name ASC");

    jsonSuccess('Categories loaded', [
        'categories' => $categories,
        'subcategories' => $subcategories
    ]);
}

// DELETE /api/products?action=delete&id=123
if ($method === 'DELETE' && $action === 'delete') {
    requirePermission('products', 'delete');
    verifyCsrf();

    $id = (int) ($_GET['id'] ?? $_POST['id'] ?? 0);
    if (!$id) jsonError('Product ID required');

    $product = Database::fetchOne("SELECT id, sku, name FROM products WHERE id = ?", [$id]);
    if (!$product) jsonError('Product not found', 404);

    try {
        Database::beginTransaction();

        // Delete variants first (foreign key constraint)
        Database::execute("DELETE FROM product_variants WHERE product_id = ?", [$id]);

        // Delete the product
        Database::execute("DELETE FROM products WHERE id = ?", [$id]);

        Database::commit();
        auditLog('delete', 'product', $id, ['sku' => $product['sku'], 'name' => $product['name']], null);

        jsonSuccess('Product deleted successfully');
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to delete product: ' . $e->getMessage(), 500);
    }
}

jsonError('Endpoint not found', 404);
