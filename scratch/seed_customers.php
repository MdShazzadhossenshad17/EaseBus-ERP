<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/database.php';

try {
    $count = Database::fetchOne("SELECT COUNT(*) as cnt FROM customers");
    if ($count['cnt'] == 0) {
        Database::insert(
            "INSERT INTO customers (name, phone, email, address, notes, created_at)
             VALUES ('Tanvir Ahmed', '01700112233', 'tanvir@domain.com', 'Gulshan 2, Dhaka', 'VIP Customer', NOW())"
        );

        Database::insert(
            "INSERT INTO customers (name, phone, email, address, notes, created_at)
             VALUES ('Rahim Chowdhury', '01811223344', 'rahim@domain.com', 'Dhanmondi 32, Dhaka', 'Regular Client', NOW())"
        );

        Database::insert(
            "INSERT INTO customers (name, phone, email, address, notes, created_at)
             VALUES ('Nusrat Jahan', '01922334455', 'nusrat@domain.com', 'Uttara Sector 7, Dhaka', 'New Client', NOW())"
        );

        echo "Seeded customers successfully!\n";
    } else {
        echo "Customers table already has {$count['cnt']} records.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
