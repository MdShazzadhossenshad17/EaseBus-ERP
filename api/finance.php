<?php
/**
 * BusinessM — Finance & Accounts API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';

// GET /api/finance?action=summary
if ($method === 'GET' && $action === 'summary') {
    requirePermission('finance', 'read');
    
    $liquidity = Database::fetchOne("SELECT SUM(current_balance) as total FROM financial_accounts WHERE status = 'active'");
    
    $startOfMonth = date('Y-m-01 00:00:00');
    $inflow = Database::fetchOne("SELECT SUM(amount) as sum FROM cash_transactions WHERE type = 'inflow' AND transaction_date >= ?", [$startOfMonth]);
    $outflow = Database::fetchOne("SELECT SUM(amount) as sum FROM cash_transactions WHERE type = 'outflow' AND transaction_date >= ?", [$startOfMonth]);
    
    $totalIn = (float)($inflow['sum'] ?? 0);
    $totalOut = (float)($outflow['sum'] ?? 0);
    
    $summary = [
        'total_liquidity' => (float)($liquidity['total'] ?? 0),
        'monthly_inflow' => $totalIn,
        'monthly_outflow' => $totalOut,
        'net_cash_flow' => $totalIn - $totalOut
    ];
    
    jsonSuccess('Finance summary loaded', ['summary' => $summary]);
}

// GET /api/finance?action=accounts
if ($method === 'GET' && $action === 'accounts') {
    requirePermission('finance', 'read');
    
    $accounts = Database::fetchAll("SELECT * FROM financial_accounts ORDER BY id ASC");
    jsonSuccess('Accounts loaded', ['accounts' => $accounts]);
}

// POST /api/finance?action=create_account
if ($method === 'POST' && $action === 'create_account') {
    requirePermission('finance', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('name')->required('type')->inList('type', ['cash', 'bank', 'mobile_banking', 'other']);
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    $name = trim($v->value('name'));
    $type = $v->value('type');
    $accountNumber = trim($input['account_number'] ?? '');
    $bankName = trim($input['bank_name'] ?? '');
    $initialBalance = max(0, (float)($input['initial_balance'] ?? 0));
    
    try {
        Database::beginTransaction();
        
        $accountId = Database::insert(
            "INSERT INTO financial_accounts (name, type, account_number, bank_name, opening_balance, current_balance, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')",
            [$name, $type, $accountNumber, $bankName, $initialBalance, $initialBalance]
        );
        
        if ($initialBalance > 0) {
            recordCashTransaction($accountId, 'inflow', $initialBalance, "Opening Balance Deposit", 'opening_balance');
        }
        
        Database::commit();
        auditLog('create', 'financial_account', $accountId, null, ['name' => $name]);
        
        jsonSuccess('Account created successfully', ['id' => $accountId]);
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to create account: ' . $e->getMessage(), 500);
    }
}

// GET /api/finance?action=transactions
if ($method === 'GET' && $action === 'transactions') {
    requirePermission('finance', 'read');
    
    $accountId = isset($_GET['account_id']) && $_GET['account_id'] !== 'all' ? (int) $_GET['account_id'] : null;
    $type = isset($_GET['type']) && $_GET['type'] !== 'all' ? $_GET['type'] : null;
    $search = getSearchQuery();
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 100;
    
    $params = [];
    $whereParts = [];
    
    if ($accountId) {
        $whereParts[] = "t.account_id = ?";
        $params[] = $accountId;
    }
    
    if ($type) {
        $whereParts[] = "t.type = ?";
        $params[] = $type;
    }
    
    if ($search) {
        $whereParts[] = "(t.description LIKE ? OR a.name LIKE ? OR t.reference_type LIKE ?)";
        $searchTerm = "%{$search}%";
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
    }
    
    $where = count($whereParts) > 0 ? "WHERE " . implode(' AND ', $whereParts) : "";
    
    $transactions = Database::fetchAll(
        "SELECT t.*, a.name as account_name, u.username as created_by_name
         FROM cash_transactions t
         JOIN financial_accounts a ON t.account_id = a.id
         LEFT JOIN users u ON t.created_by = u.id
         {$where}
         ORDER BY t.id DESC LIMIT {$limit}",
        $params
    );
    
    jsonSuccess('Transactions loaded', ['transactions' => $transactions]);
}

// POST /api/finance?action=deposit_withdraw
if ($method === 'POST' && $action === 'deposit_withdraw') {
    requirePermission('finance', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('account_id')->integer('account_id')
      ->required('type')->inList('type', ['inflow', 'outflow'])
      ->required('amount')->numeric('amount')->min('amount', 0.01)
      ->required('description');
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    $accId = (int) $v->value('account_id');
    $type = $v->value('type');
    $amount = (float) $v->value('amount');
    $desc = trim($v->value('description'));
    
    try {
        Database::beginTransaction();
        
        $account = Database::fetchOne("SELECT current_balance FROM financial_accounts WHERE id = ? FOR UPDATE", [$accId]);
        if (!$account) jsonError('Account not found', 404);
        
        if ($type === 'outflow' && (float)$account['current_balance'] < $amount) {
            jsonError('Insufficient balance in selected account.');
        }
        
        recordCashTransaction($accId, $type, $amount, $desc, 'manual');
        
        Database::commit();
        auditLog('transaction', 'financial_account', $accId, null, ['type' => $type, 'amount' => $amount]);
        
        jsonSuccess('Transaction recorded successfully');
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to record transaction: ' . $e->getMessage(), 500);
    }
}

// POST /api/finance?action=transfer
if ($method === 'POST' && $action === 'transfer') {
    requirePermission('finance', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('from_account_id')->integer('from_account_id')
      ->required('to_account_id')->integer('to_account_id')
      ->required('amount')->numeric('amount')->min('amount', 0.01)
      ->required('description');
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    $fromId = (int) $v->value('from_account_id');
    $toId = (int) $v->value('to_account_id');
    $amount = (float) $v->value('amount');
    $desc = $v->value('description');
    
    if ($fromId === $toId) jsonError('Cannot transfer to the same account.');
    
    try {
        Database::beginTransaction();
        
        $fromAccount = Database::fetchOne("SELECT current_balance FROM financial_accounts WHERE id = ? FOR UPDATE", [$fromId]);
        if (!$fromAccount) jsonError('Source account not found.');
        
        if ((float) $fromAccount['current_balance'] < $amount) {
            jsonError('Insufficient balance in source account.');
        }
        
        recordCashTransaction($fromId, 'outflow', $amount, "Transfer Out: {$desc}", 'transfer');
        recordCashTransaction($toId, 'inflow', $amount, "Transfer In: {$desc}", 'transfer');
        
        Database::commit();
        auditLog('transfer', 'financial_account', $fromId, null, ['to_account_id' => $toId, 'amount' => $amount]);
        
        jsonSuccess('Transfer completed successfully');
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Transfer failed: ' . $e->getMessage(), 500);
    }
}

// POST /api/finance?action=reconcile
if ($method === 'POST' && $action === 'reconcile') {
    requirePermission('finance', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $accountId = (int) ($input['account_id'] ?? 0);
    
    if (!$accountId) jsonError('Account ID required');
    
    try {
        Database::beginTransaction();
        $result = reconcileAccountBalance($accountId);
        Database::commit();
        
        jsonSuccess('Reconciliation complete', ['result' => $result]);
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Reconciliation failed: ' . $e->getMessage(), 500);
    }
}

jsonError('Endpoint not found', 404);
