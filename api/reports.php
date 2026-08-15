<?php
/**
 * BusinessM — Intelligence & Analytics API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'GET' && $action === 'profit_loss') {
    requirePermission('reports', 'read');
    
    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $endDate = $_GET['end_date'] ?? date('Y-m-d');
    
    // 1. Total Revenue, Order Count from orders
    $ordersData = Database::fetchOne(
        "SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as rev 
         FROM orders WHERE created_at BETWEEN ? AND ? AND order_status != 'cancelled'", 
        [$startDate . ' 00:00:00', $endDate . ' 23:59:59']
    );
    
    // 2. Total Expenses
    $expenses = Database::fetchOne(
        "SELECT COALESCE(SUM(amount), 0) as exp FROM expenses WHERE expense_date BETWEEN ? AND ?",
        [$startDate, $endDate]
    );

    // 3. Expense Breakdown by Category
    $expenseCategories = Database::fetchAll(
        "SELECT COALESCE(c.name, 'General Expenses') as category_name, SUM(e.amount) as total_amount
         FROM expenses e
         LEFT JOIN expense_categories c ON e.category_id = c.id
         WHERE e.expense_date BETWEEN ? AND ?
         GROUP BY c.id, c.name
         ORDER BY total_amount DESC",
        [$startDate, $endDate]
    );
    
    // 4. Inventory Value
    $invVal = Database::fetchOne("SELECT COALESCE(SUM(v.current_stock * COALESCE(v.selling_price, 0)), 0) as val FROM product_variants v WHERE v.status = 'active'");
    
    // 5. Top Performing Products
    $topProducts = Database::fetchAll(
        "SELECT p.name as product_name, COALESCE(c.name, 'General') as category_name, SUM(oi.quantity) as total_units, SUM(oi.total_price) as total_sales
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN products p ON oi.product_id = p.id
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE o.created_at BETWEEN ? AND ? AND o.order_status != 'cancelled'
         GROUP BY p.id, p.name, c.name
         ORDER BY total_sales DESC
         LIMIT 5",
        [$startDate . ' 00:00:00', $endDate . ' 23:59:59']
    );

    // 6. Daily Trend
    $dailyTrend = Database::fetchAll(
        "SELECT DATE(created_at) as date, SUM(total_amount) as rev
         FROM orders
         WHERE created_at BETWEEN ? AND ? AND order_status != 'cancelled'
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at) ASC",
        [$startDate . ' 00:00:00', $endDate . ' 23:59:59']
    );
    
    $revenue = (float) ($ordersData['rev'] ?? 0);
    $cogs = round($revenue * 0.5, 2);
    $grossProfit = $revenue - $cogs;
    $operatingExpenses = (float) ($expenses['exp'] ?? 0);
    $netProfit = $grossProfit - $operatingExpenses;
    $orderCount = (int) ($ordersData['order_count'] ?? 0);
    $aov = $orderCount > 0 ? round($revenue / $orderCount, 2) : 0;
    $grossMarginPercent = $revenue > 0 ? round(($grossProfit / $revenue) * 100, 1) : 0;
    $netMarginPercent = $revenue > 0 ? round(($netProfit / $revenue) * 100, 1) : 0;

    $report = [
        'period' => ['start' => $startDate, 'end' => $endDate],
        'revenue' => $revenue,
        'cogs' => $cogs,
        'gross_profit' => $grossProfit,
        'operating_expenses' => $operatingExpenses,
        'net_profit' => $netProfit,
        'order_count' => $orderCount,
        'avg_order_value' => $aov,
        'gross_margin_percent' => $grossMarginPercent,
        'net_margin_percent' => $netMarginPercent,
        'current_inventory_value' => (float) ($invVal['val'] ?? 0),
        'expense_breakdown' => $expenseCategories,
        'top_products' => $topProducts,
        'daily_trend' => $dailyTrend
    ];
    
    jsonSuccess('P&L Report generated', ['report' => $report]);
}

if ($method === 'GET' && $action === 'inventory_valuation') {
    requirePermission('reports', 'read');
    
    $valuation = Database::fetchAll(
        "SELECT p.name as product_name, COALESCE(c.name, 'Uncategorized') as category_name, SUM(v.current_stock) as total_qty, SUM(v.current_stock * v.avg_cost_price) as total_value
         FROM product_variants v
         JOIN products p ON v.product_id = p.id
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE v.current_stock > 0
         GROUP BY p.id, p.name, c.name
         ORDER BY total_value DESC"
    );
    
    jsonSuccess('Inventory valuation generated', ['valuation' => $valuation]);
}

jsonError('Endpoint not found', 404);
