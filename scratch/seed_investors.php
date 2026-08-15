<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/database.php';

try {
    $count = Database::fetchOne("SELECT COUNT(*) as cnt FROM investors");
    if ($count['cnt'] == 0) {
        $id = Database::insert(
            "INSERT INTO investors (name, phone, email, address, investment_date, ownership_percentage, profit_share_percentage, notes, status)
             VALUES ('Sharif Uddin', '01711223344', 'sharif@investor.bd', 'Banani, Dhaka', '2026-01-15', 20.00, 20.00, 'Founding Seed Investor', 'active')"
        );

        Database::insert(
            "INSERT INTO investor_transactions (investor_id, type, amount, description, transaction_date, created_by)
             VALUES (?, 'investment', 500000.00, 'Initial Seed Capital Investment', '2026-01-15 10:00:00', 1)",
            [$id]
        );

        Database::insert(
            "INSERT INTO investor_transactions (investor_id, type, amount, description, transaction_date, created_by)
             VALUES (?, 'profit_distribution', 25000.00, 'Q1 Profit Share Payout', '2026-04-15 14:30:00', 1)",
            [$id]
        );

        echo "Seeded investors successfully!\n";
    } else {
        echo "Investors table already has {$count['cnt']} records.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
