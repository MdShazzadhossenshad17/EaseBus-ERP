<?php
/**
 * BusinessM — Expenses API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';

// GET /api/expenses?action=summary
if ($method === 'GET' && $action === 'summary') {
    requirePermission('expenses', 'read');
    
    $startOfMonth = date('Y-m-01');
    $monthly = Database::fetchOne("SELECT SUM(amount) as sum, COUNT(*) as cnt FROM expenses WHERE expense_date >= ?", [$startOfMonth]);
    $totalAll = Database::fetchOne("SELECT SUM(amount) as sum, COUNT(*) as cnt FROM expenses");
    
    $topCat = Database::fetchOne(
        "SELECT c.name, SUM(e.amount) as total
         FROM expenses e
         JOIN expense_categories c ON e.category_id = c.id
         GROUP BY c.id ORDER BY total DESC LIMIT 1"
    );
    
    $totalCount = (int) ($totalAll['cnt'] ?? 0);
    $totalSum = (float) ($totalAll['sum'] ?? 0);
    $avgExpense = $totalCount > 0 ? $totalSum / $totalCount : 0;
    
    $summary = [
        'monthly_expenses' => (float) ($monthly['sum'] ?? 0),
        'total_expenses' => $totalSum,
        'top_category_name' => $topCat['name'] ?? 'N/A',
        'avg_expense' => $avgExpense
    ];
    
    jsonSuccess('Expenses summary loaded', ['summary' => $summary]);
}

// GET /api/expenses?action=list
if ($method === 'GET' && $action === 'list') {
    requirePermission('expenses', 'read');
    
    $search = getSearchQuery();
    $categoryId = isset($_GET['category_id']) && $_GET['category_id'] !== 'all' ? (int) $_GET['category_id'] : null;
    $categoryName = trim($_GET['category_name'] ?? '');
    
    $params = [];
    $whereParts = [];
    
    if ($search) {
        $whereParts[] = "(e.description LIKE ? OR e.receipt_reference LIKE ? OR c.name LIKE ? OR a.name LIKE ?)";
        $searchTerm = "%{$search}%";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
    }
    
    if ($categoryId) {
        $whereParts[] = "e.category_id = ?";
        $params[] = $categoryId;
    }
    
    if (!empty($categoryName) && $categoryName !== 'all') {
        $whereParts[] = "c.name LIKE ?";
        $params[] = "%{$categoryName}%";
    }
    
    $where = count($whereParts) > 0 ? "WHERE " . implode(' AND ', $whereParts) : "";
    
    $expenses = Database::fetchAll(
        "SELECT e.*, c.name as category_name, a.name as account_name, u.username as created_by_name
         FROM expenses e
         LEFT JOIN expense_categories c ON e.category_id = c.id
         LEFT JOIN financial_accounts a ON e.account_id = a.id
         LEFT JOIN users u ON e.created_by = u.id
         {$where}
         ORDER BY e.expense_date DESC, e.id DESC",
        $params
    );
    
    jsonSuccess('Expenses loaded', ['expenses' => $expenses]);
}

// POST /api/expenses?action=add_category
if ($method === 'POST' && $action === 'add_category') {
    requirePermission('expenses', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $name = trim($input['name'] ?? '');
    if (empty($name)) jsonError('Category name is required', 400);
    
    $existing = Database::fetchOne("SELECT id FROM expense_categories WHERE name = ?", [$name]);
    if ($existing) {
        jsonSuccess('Category already exists', ['id' => $existing['id'], 'name' => $name]);
    }
    
    $id = Database::insert("INSERT INTO expense_categories (name, status) VALUES (?, 'active')", [$name]);
    jsonSuccess('Expense category created successfully', ['id' => $id, 'name' => $name]);
}

// GET /api/expenses?action=categories
if ($method === 'GET' && $action === 'categories') {
    $categories = Database::fetchAll("SELECT id, name FROM expense_categories WHERE status = 'active' ORDER BY name ASC");
    jsonSuccess('Categories loaded', ['categories' => $categories]);
}

// POST /api/expenses?action=create
if ($method === 'POST' && $action === 'create') {
    requirePermission('expenses', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('amount')->numeric('amount')->min('amount', 0.01)
      ->required('account_id')->integer('account_id')
      ->required('expense_date')->date('expense_date')
      ->required('description');
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    $accountId = (int) $v->value('account_id');
    $amount = (float) $v->value('amount');
    
    // Resolve Category (Write-in or ID)
    $categoryId = null;
    $categoryName = trim($input['category_name'] ?? '');
    if (!empty($categoryName)) {
        $existingCat = Database::fetchOne("SELECT id FROM expense_categories WHERE name = ?", [$categoryName]);
        if ($existingCat) {
            $categoryId = (int) $existingCat['id'];
        } else {
            $categoryId = Database::insert("INSERT INTO expense_categories (name, status) VALUES (?, 'active')", [$categoryName]);
        }
    } elseif (!empty($input['category_id'])) {
        $categoryId = (int) $input['category_id'];
    }
    
    if (!$categoryId) {
        jsonError('Please select or write an expense category', 400);
    }
    
    try {
        Database::beginTransaction();
        
        $account = Database::fetchOne("SELECT current_balance FROM financial_accounts WHERE id = ? FOR UPDATE", [$accountId]);
        if (!$account) jsonError('Financial account not found.');
        
        if ((float) $account['current_balance'] < $amount) {
            jsonError('Insufficient balance in selected account.');
        }
        
        $expenseId = Database::insert(
            "INSERT INTO expenses (category_id, amount, account_id, description, receipt_reference, expense_date, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $categoryId,
                $amount,
                $accountId,
                $v->value('description'),
                $v->value('receipt_reference') ?? '',
                $v->value('expense_date'),
                getCurrentUserId()
            ]
        );
        
        // Record cash outflow
        recordCashTransaction($accountId, 'outflow', $amount, "Expense: {$v->value('description')}", 'expense', $expenseId);
        
        Database::commit();
        auditLog('create', 'expense', $expenseId, null, ['amount' => $amount]);
        
        jsonSuccess('Expense recorded successfully', ['id' => $expenseId]);
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to record expense: ' . $e->getMessage(), 500);
    }
}

jsonError('Endpoint not found', 404);
