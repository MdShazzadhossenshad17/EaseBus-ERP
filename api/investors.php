<?php
/**
 * BusinessM — Investors API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';


if ($method === 'GET' && ($action === 'list' || $action === 'summary' || empty($action))) {
    requirePermission('investors', 'read');

    $search = getSearchQuery();
    $params = [];
    $where = "";

    if ($search) {
        $where = "WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?";
        $searchTerm = "%{$search}%";
        $params = [$searchTerm, $searchTerm, $searchTerm];
    }

    $investors = Database::fetchAll(
        "SELECT i.*, 
            (SELECT SUM(amount) FROM investor_transactions WHERE investor_id = i.id AND type IN ('investment', 'additional_investment')) as total_invested,
            (SELECT SUM(amount) FROM investor_transactions WHERE investor_id = i.id AND type = 'withdrawal') as total_withdrawn,
            (SELECT SUM(amount) FROM investor_transactions WHERE investor_id = i.id AND type = 'profit_distribution') as total_profit
         FROM investors i
         {$where}
         ORDER BY i.name ASC",
        $params
    );

    $totalCapital = 0;
    $totalDistributed = 0;
    $totalOwnership = 0;

    foreach ($investors as $inv) {
        $totalCapital += (float) ($inv['total_invested'] ?? 0);
        $totalDistributed += (float) ($inv['total_profit'] ?? 0);
        $totalOwnership += (float) ($inv['ownership_percentage'] ?? 0);
    }

    $summary = [
        'total_investors' => count($investors),
        'total_capital' => $totalCapital,
        'total_returns_paid' => $totalDistributed,
        'total_ownership' => $totalOwnership
    ];

    jsonSuccess('Investors loaded', ['investors' => $investors, 'summary' => $summary]);
}

if ($method === 'POST' && $action === 'create') {
    requirePermission('investors', 'create');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('name')->maxLength('name', 100)
      ->required('phone')->maxLength('phone', 20)
      ->email('email')
      ->numeric('ownership_percentage')->min('ownership_percentage', 0)->max('ownership_percentage', 100)
      ->numeric('profit_share_percentage')->min('profit_share_percentage', 0)->max('profit_share_percentage', 100)
      ->date('investment_date');
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    try {
        Database::beginTransaction();
        
        $id = Database::insert(
            "INSERT INTO investors (name, phone, email, address, investment_date, ownership_percentage, profit_share_percentage, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')",
            [
                $v->value('name'),
                $v->value('phone'),
                $v->value('email'),
                $v->value('address'),
                $v->value('investment_date'),
                $v->value('ownership_percentage') !== '' ? (float) $v->value('ownership_percentage') : null,
                $v->value('profit_share_percentage') !== '' ? (float) $v->value('profit_share_percentage') : null,
                $v->value('notes')
            ]
        );
        
        // Initial investment amount if provided
        if (!empty($input['initial_investment']) && is_numeric($input['initial_investment']) && $input['initial_investment'] > 0) {
            $amount = (float) $input['initial_investment'];
            Database::insert(
                "INSERT INTO investor_transactions (investor_id, type, amount, description, transaction_date, created_by)
                 VALUES (?, 'investment', ?, 'Initial Investment', NOW(), ?)",
                [$id, $amount, getCurrentUserId()]
            );
            
            // Note: In a full system we would prompt to select a financial account to debit this investment into cash.
            // For V6 simplicity, we just record the ledger entry.
        }
        
        Database::commit();
        auditLog('create', 'investor', $id, null, ['name' => $v->value('name')]);
        jsonSuccess('Investor created successfully', ['id' => $id]);
        
    } catch (Exception $e) {
        Database::rollback();
        jsonError('Failed to create investor: ' . $e->getMessage(), 500);
    }
}

if ($method === 'POST' && $action === 'transaction') {
    requirePermission('investors', 'update');
    verifyCsrf();
    
    $input = getJsonInput();
    $v = new Validator($input);
    
    $v->required('investor_id')->integer('investor_id')
      ->required('type')->inList('type', ['additional_investment', 'withdrawal', 'profit_distribution', 'adjustment'])
      ->required('amount')->numeric('amount')->min('amount', 0.01)
      ->required('transaction_date')->date('transaction_date');
      
    if ($v->fails()) jsonError('Validation failed', 400, ['errors' => $v->errors()]);
    
    try {
        $txnId = Database::insert(
            "INSERT INTO investor_transactions (investor_id, type, amount, description, reference, transaction_date, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $v->value('investor_id'),
                $v->value('type'),
                (float) $v->value('amount'),
                $v->value('description'),
                $v->value('reference'),
                $v->value('transaction_date'),
                getCurrentUserId()
            ]
        );
        
        auditLog('transaction', 'investor', $v->value('investor_id'), null, ['type' => $v->value('type'), 'amount' => $v->value('amount')]);
        jsonSuccess('Transaction recorded successfully');
        
    } catch (Exception $e) {
        jsonError('Failed to record transaction: ' . $e->getMessage(), 500);
    }
}

jsonError('Endpoint not found', 404);
