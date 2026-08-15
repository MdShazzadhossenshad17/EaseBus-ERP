<?php
/**
 * BusinessM — Helper Functions
 */

require_once __DIR__ . '/database.php';

/**
 * Format amount with currency symbol
 */
function formatMoney(float $amount, bool $showSymbol = true): string {
    $biz = Database::getBusinessSettings();
    $formatted = number_format(abs($amount), 2);
    $prefix = $amount < 0 ? '-' : '';
    $symbol = $biz['currency_symbol'] ?? '৳';
    return $showSymbol ? $prefix . $symbol . ' ' . $formatted : $prefix . $formatted;
}

/**
 * Format date for display
 */
function formatDate(string $date, string $format = 'd M Y'): string {
    return date($format, strtotime($date));
}

/**
 * Format datetime for display
 */
function formatDateTime(string $datetime, string $format = 'd M Y, h:i A'): string {
    return date($format, strtotime($datetime));
}

/**
 * Generate unique reference number
 * Format: PREFIX-YYYYMMDD-XXX
 */
function generateRefNo(string $prefix, string $table, string $column): string {
    $date = date('Ymd');
    $base = strtoupper($prefix) . '-' . $date . '-';

    $last = Database::fetchOne(
        "SELECT {$column} FROM {$table} WHERE {$column} LIKE ? ORDER BY id DESC LIMIT 1",
        [$base . '%']
    );

    if ($last) {
        $num = (int) substr($last[$column], -3);
        $next = $num + 1;
    } else {
        $next = 1;
    }

    return $base . str_pad($next, 3, '0', STR_PAD_LEFT);
}

/**
 * Escape HTML output
 */
function esc(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

/**
 * Send JSON response and exit
 */
function jsonResponse(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send success response
 */
function jsonSuccess(string $message = 'Success', array $extra = []): void {
    jsonResponse(array_merge(['success' => true, 'message' => $message, 'data' => $extra], $extra));
}

/**
 * Send error response
 */
function jsonError(string $message, int $code = 400, array $extra = []): void {
    jsonResponse(array_merge(['success' => false, 'message' => $message], $extra), $code);
}

/**
 * Get pagination parameters from request
 */
function getPagination(): array {
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $perPage = min(100, max(1, (int) ($_GET['per_page'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    return ['page' => $page, 'per_page' => $perPage, 'offset' => $offset];
}

/**
 * Build paginated response
 */
function paginatedResponse(array $data, int $total, array $pagination): void {
    jsonSuccess('Success', [
        'data' => $data,
        'pagination' => [
            'page' => $pagination['page'],
            'per_page' => $pagination['per_page'],
            'total' => $total,
            'total_pages' => ceil($total / $pagination['per_page'])
        ]
    ]);
}

/**
 * Get search query from request
 */
function getSearchQuery(): string {
    return trim($_GET['search'] ?? '');
}

/**
 * Get current user ID from session
 */
function getCurrentUserId(): ?int {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current user role from session
 */
function getCurrentUserRole(): ?string {
    return $_SESSION['user_role'] ?? null;
}

/**
 * Log an audit entry
 */
function auditLog(string $action, string $entity, ?int $entityId = null, $oldValue = null, $newValue = null): void {
    try {
        Database::insert(
            "INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            [
                getCurrentUserId(),
                $action,
                $entity,
                $entityId,
                $oldValue !== null ? json_encode($oldValue) : null,
                $newValue !== null ? json_encode($newValue) : null,
                $_SERVER['REMOTE_ADDR'] ?? null,
                substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255)
            ]
        );
    } catch (Exception $e) {
        // Audit logging should never break the main operation
        error_log('Audit log failed: ' . $e->getMessage());
    }
}

/**
 * Create a notification
 */
function createNotification(string $type, string $title, ?string $message = null, ?int $userId = null, ?string $refType = null, ?int $refId = null): void {
    try {
        Database::insert(
            "INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)",
            [$userId, $type, $title, $message, $refType, $refId]
        );
    } catch (Exception $e) {
        error_log('Notification failed: ' . $e->getMessage());
    }
}

/**
 * Record a cash transaction and update account balance
 * Returns the reconciled balance
 */
function recordCashTransaction(int $accountId, string $type, float $amount, string $description, ?string $refType = null, ?int $refId = null): float {
    $account = Database::fetchOne("SELECT current_balance FROM financial_accounts WHERE id = ?", [$accountId]);
    if (!$account) throw new RuntimeException('Financial account not found.');

    $balanceBefore = (float) $account['current_balance'];
    $balanceAfter = $type === 'inflow'
        ? $balanceBefore + $amount
        : $balanceBefore - $amount;

    Database::insert(
        "INSERT INTO cash_transactions (account_id, type, amount, balance_before, balance_after, reference_type, reference_id, description, transaction_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)",
        [$accountId, $type, $amount, $balanceBefore, $balanceAfter, $refType, $refId, $description, getCurrentUserId()]
    );

    // Update cached balance
    Database::execute("UPDATE financial_accounts SET current_balance = ? WHERE id = ?", [$balanceAfter, $accountId]);

    return $balanceAfter;
}

/**
 * Reconcile an account's cached balance against its transaction history.
 * Returns the reconciliation result.
 */
function reconcileAccountBalance(int $accountId): array {
    $account = Database::fetchOne("SELECT id, name, opening_balance, current_balance FROM financial_accounts WHERE id = ?", [$accountId]);
    if (!$account) throw new RuntimeException('Account not found.');

    $calculated = Database::fetchOne(
        "SELECT
            COALESCE(SUM(CASE WHEN type = 'inflow' THEN amount ELSE 0 END), 0) AS total_inflow,
            COALESCE(SUM(CASE WHEN type = 'outflow' THEN amount ELSE 0 END), 0) AS total_outflow
         FROM cash_transactions WHERE account_id = ?",
        [$accountId]
    );

    $expectedBalance = (float) $account['opening_balance']
        + (float) $calculated['total_inflow']
        - (float) $calculated['total_outflow'];

    $storedBalance = (float) $account['current_balance'];
    $difference = round($expectedBalance - $storedBalance, 2);

    $result = [
        'account_id' => $accountId,
        'account_name' => $account['name'],
        'stored_balance' => $storedBalance,
        'calculated_balance' => $expectedBalance,
        'difference' => $difference,
        'discrepancy_found' => $difference != 0
    ];

    if ($difference != 0) {
        // Auto-correct
        Database::execute("UPDATE financial_accounts SET current_balance = ? WHERE id = ?", [$expectedBalance, $accountId]);
        $result['auto_corrected'] = true;

        // Log discrepancy
        auditLog('reconciliation', 'financial_account', $accountId,
            ['balance' => $storedBalance],
            ['balance' => $expectedBalance, 'difference' => $difference]
        );
    }

    return $result;
}

/**
 * Calculate weighted-average cost for a variant after a new purchase
 */
function updateWeightedAvgCost(int $variantId, int $newQty, float $newUnitPrice): void {
    $variant = Database::fetchOne(
        "SELECT current_stock, avg_cost_price FROM product_variants WHERE id = ?",
        [$variantId]
    );
    if (!$variant) return;

    $existingStock = (int) $variant['current_stock'];
    $oldAvgCost = (float) $variant['avg_cost_price'];

    if ($existingStock + $newQty > 0) {
        $newAvgCost = (($existingStock * $oldAvgCost) + ($newQty * $newUnitPrice))
                    / ($existingStock + $newQty);
    } else {
        $newAvgCost = $newUnitPrice;
    }

    Database::execute(
        "UPDATE product_variants SET avg_cost_price = ? WHERE id = ?",
        [round($newAvgCost, 2), $variantId]
    );
}

/**
 * Get input JSON body
 */
function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Get request method
 */
function getRequestMethod(): string {
    return strtoupper($_SERVER['REQUEST_METHOD']);
}
