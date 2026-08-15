<?php
/**
 * BusinessM — Dashboard & Command Center API
 */

requireAuth();

$method = getRequestMethod();
$action = $action ?? $_GET['action'] ?? $_POST['action'] ?? '';

// GET /api/dashboard?action=summary
if ($method === 'GET' && $action === 'summary') {
    requirePermission('dashboard', 'read');
    
    $startOfMonth = date('Y-m-01 00:00:00');
       // Sales Today
    $salesToday = Database::fetchOne("SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as cnt FROM orders WHERE DATE(created_at) = CURDATE() AND order_status != 'cancelled'");
    // Deliveries In Transit / Active
    $activeDeliveries = Database::fetchOne("SELECT COUNT(*) as count FROM deliveries WHERE status IN ('order_placed', 'processing', 'pending', 'picked_up', 'in_transit', 'out_for_delivery')");
    // Pending Orders
    $pendingOrders = Database::fetchOne("SELECT COUNT(*) as count FROM orders WHERE order_status IN ('pending', 'confirmed', 'processing')");
    // Low Stock
    $lowStock = Database::fetchOne("SELECT COUNT(*) as count FROM product_variants WHERE current_stock <= 5");
    // Total Liquidity Cash
    $totalCash = Database::fetchOne("SELECT COALESCE(SUM(current_balance), 0) as total FROM financial_accounts WHERE status = 'active'");
    
    // Monthly MTD Metrics
    $monthlyRev = Database::fetchOne("SELECT COALESCE(SUM(total_amount), 0) as sum, COALESCE(SUM(profit), 0) as profit FROM orders WHERE created_at >= ? AND order_status != 'cancelled'", [$startOfMonth]);
    $monthlyExp = Database::fetchOne("SELECT COALESCE(SUM(amount), 0) as sum FROM expenses WHERE expense_date >= ?", [date('Y-m-01')]);
    
    $revVal = (float) ($monthlyRev['sum'] ?? 0);
    $profVal = (float) ($monthlyRev['profit'] ?? 0);
    $expVal = (float) ($monthlyExp['sum'] ?? 0);
    
    // Recent 5 Sales Orders
    $recentOrders = Database::fetchAll(
        "SELECT o.id, o.order_no, o.total_amount, o.order_status, o.payment_status, o.created_at, c.name as customer_name
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         ORDER BY o.id DESC LIMIT 5"
    );

    // System Health Alerts
    $alerts = [];
    if ((int)$pendingOrders['count'] > 0) {
        $alerts[] = ['type' => 'warning', 'icon' => 'pending_actions', 'text' => "You have " . $pendingOrders['count'] . " orders waiting for delivery dispatch.", 'color' => 'text-amber-500'];
    }
    if ((int)$activeDeliveries['count'] > 0) {
        $alerts[] = ['type' => 'info', 'icon' => 'local_shipping', 'text' => $activeDeliveries['count'] . " delivery shipments are out for delivery & transit.", 'color' => 'text-blue-500'];
    }
    if ((int)$lowStock['count'] > 0) {
        $alerts[] = ['type' => 'danger', 'icon' => 'warning', 'text' => $lowStock['count'] . " product SKUs require stock replenishment.", 'color' => 'text-red-500'];
    }
    if (empty($alerts)) {
        $alerts[] = ['type' => 'success', 'icon' => 'verified', 'text' => "All business operations & logistics are running smoothly.", 'color' => 'text-emerald-500'];
    }

    $summary = [
        'total_sales_today' => (float) ($salesToday['total'] ?? 0),
        'sales_today_count' => (int) ($salesToday['cnt'] ?? 0),
        'active_deliveries' => (int) ($activeDeliveries['count'] ?? 0),
        'orders_pending' => (int) ($pendingOrders['count'] ?? 0),
        'low_stock_items' => (int) ($lowStock['count'] ?? 0),
        'total_cash' => (float) ($totalCash['total'] ?? 0),
        'monthly_revenue' => $revVal,
        'monthly_expenses' => $expVal,
        'monthly_net_profit' => $profVal - $expVal,
        'recent_orders' => $recentOrders,
        'alerts' => $alerts
    ];
    
    jsonSuccess('Dashboard summary loaded', ['summary' => $summary]);
}

// GET /api/dashboard?action=revenue_chart
if ($method === 'GET' && $action === 'revenue_chart') {
    requirePermission('reports', 'read');
    
    $days = isset($_GET['days']) ? (int) $_GET['days'] : 30;
    
    $chartData = Database::fetchAll(
        "SELECT DATE(created_at) as date, SUM(total_amount) as revenue, SUM(profit) as profit 
         FROM orders 
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND order_status != 'cancelled'
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at) ASC",
        [$days]
    );
    
    $formattedData = [];
    $startDate = new DateTime("-{$days} days");
    $endDate = new DateTime("today");
    
    while ($startDate <= $endDate) {
        $dateStr = $startDate->format('Y-m-d');
        $found = array_filter($chartData, fn($d) => $d['date'] === $dateStr);
        if (!empty($found)) {
            $row = reset($found);
            $formattedData[] = [
                'date' => $dateStr,
                'revenue' => (float) ($row['revenue'] ?? 0),
                'profit' => (float) ($row['profit'] ?? 0)
            ];
        } else {
            $formattedData[] = [
                'date' => $dateStr,
                'revenue' => 0,
                'profit' => 0
            ];
        }
        $startDate->modify('+1 day');
    }
    
    jsonSuccess('Chart data loaded', ['chart' => $formattedData]);
}
}

jsonError('Endpoint not found', 404);
