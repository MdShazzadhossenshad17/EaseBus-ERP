<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/database.php';

try {
    Database::execute("SET FOREIGN_KEY_CHECKS = 0;");

    $tablesToTruncate = [
        'order_items',
        'sales_orders',
        'orders',
        'deliveries',
        'customer_returns',
        'returns',
        'inventory_movements',
        'financial_transactions',
        'transactions',
        'expense_vouchers',
        'expenses',
        'investor_transactions',
        'investors',
        'product_variants',
        'products',
        'categories',
        'suppliers',
        'customers',
        'audit_logs'
    ];

    foreach ($tablesToTruncate as $table) {
        try {
            Database::execute("TRUNCATE TABLE {$table}");
            echo "Truncated table: {$table}\n";
        } catch (Exception $e) {
            // Table might not exist or empty
        }
    }

    Database::execute("SET FOREIGN_KEY_CHECKS = 1;");
    echo "\nAll sample transactions & test data successfully removed from database!\n";

} catch (Exception $e) {
    echo "Error cleaning data: " . $e->getMessage() . "\n";
}
