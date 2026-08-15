<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/database.php';

try {
    Database::execute("SET FOREIGN_KEY_CHECKS = 0;");

    $extraTables = ['sales', 'orders', 'order_items', 'expenses', 'deliveries', 'returns', 'customer_returns'];

    foreach ($extraTables as $table) {
        try {
            Database::execute("TRUNCATE TABLE {$table}");
            echo "Truncated: {$table}\n";
        } catch (Exception $e) {}
    }

    Database::execute("SET FOREIGN_KEY_CHECKS = 1;");
    echo "Sales and transaction tables completely truncated!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
