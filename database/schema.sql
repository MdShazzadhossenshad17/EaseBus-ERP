-- ============================================================
-- BusinessM — Complete Database Schema
-- Version: 1.0.0
-- Engine: MariaDB 10.4+ / MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS `businessm` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `businessm`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. AUTHENTICATION & USERS
-- ============================================================

CREATE TABLE `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `module` VARCHAR(50) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    UNIQUE KEY `uq_perm` (`module`, `action`)
) ENGINE=InnoDB;

CREATE TABLE `role_permissions` (
    `role_id` INT NOT NULL,
    `permission_id` INT NOT NULL,
    PRIMARY KEY (`role_id`, `permission_id`),
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) DEFAULT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
    `status` ENUM('active','inactive','locked') NOT NULL DEFAULT 'active',
    `last_login_at` DATETIME DEFAULT NULL,
    `login_attempts` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `user_roles` (
    `user_id` INT NOT NULL,
    `role_id` INT NOT NULL,
    PRIMARY KEY (`user_id`, `role_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 2. BUSINESS & LOCATIONS
-- ============================================================

CREATE TABLE `businesses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL DEFAULT 'BusinessM',
    `logo_path` VARCHAR(255) DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'BDT',
    `currency_symbol` VARCHAR(5) NOT NULL DEFAULT '৳',
    `tax_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `tax_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `locations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('store','warehouse','online') NOT NULL DEFAULT 'store',
    `address` TEXT DEFAULT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `is_default` TINYINT(1) NOT NULL DEFAULT 0,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 3. PRODUCTS & VARIANTS
-- ============================================================

CREATE TABLE `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT DEFAULT NULL,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `subcategories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_id` INT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_subcat` (`category_id`, `name`),
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `suppliers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `company` VARCHAR(100) DEFAULT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sku` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(200) NOT NULL,
    `category_id` INT DEFAULT NULL,
    `subcategory_id` INT DEFAULT NULL,
    `brand` VARCHAR(100) DEFAULT NULL,
    `description` TEXT DEFAULT NULL,
    `purchase_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `selling_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_price` DECIMAL(12,2) DEFAULT NULL,
    `min_stock_level` INT NOT NULL DEFAULT 5,
    `supplier_id` INT DEFAULT NULL,
    `status` ENUM('active','inactive','archived') NOT NULL DEFAULT 'active',
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_prod_category` (`category_id`),
    INDEX `idx_prod_status` (`status`),
    INDEX `idx_prod_name` (`name`)
) ENGINE=InnoDB;

CREATE TABLE `product_variants` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `sku` VARCHAR(50) NOT NULL UNIQUE,
    `variant_name` VARCHAR(100) NOT NULL DEFAULT 'Default',
    `size` VARCHAR(50) DEFAULT NULL,
    `color` VARCHAR(50) DEFAULT NULL,
    `material` VARCHAR(100) DEFAULT NULL,
    `weight` VARCHAR(50) DEFAULT NULL,
    `stone_type` VARCHAR(100) DEFAULT NULL,
    `gender` VARCHAR(20) DEFAULT NULL,
    `collection` VARCHAR(100) DEFAULT NULL,
    `purchase_price` DECIMAL(12,2) DEFAULT NULL,
    `selling_price` DECIMAL(12,2) DEFAULT NULL,
    `avg_cost_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `current_stock` INT NOT NULL DEFAULT 0,
    `location_id` INT NOT NULL,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`),
    INDEX `idx_pv_product` (`product_id`),
    INDEX `idx_pv_stock` (`current_stock`),
    INDEX `idx_pv_location` (`location_id`)
) ENGINE=InnoDB;

CREATE TABLE `product_images` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `image_path` VARCHAR(255) NOT NULL,
    `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 4. PURCHASES
-- ============================================================

CREATE TABLE `purchases` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `reference_no` VARCHAR(50) NOT NULL UNIQUE,
    `supplier_id` INT NOT NULL,
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `payment_status` ENUM('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
    `purchase_date` DATE NOT NULL,
    `location_id` INT NOT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`),
    FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_purch_date` (`purchase_date`),
    INDEX `idx_purch_supplier` (`supplier_id`)
) ENGINE=InnoDB;

CREATE TABLE `purchase_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `purchase_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `variant_id` INT NOT NULL,
    `quantity` INT NOT NULL,
    `unit_price` DECIMAL(12,2) NOT NULL,
    `total_price` DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
    FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
) ENGINE=InnoDB;

-- ============================================================
-- 5. CUSTOMERS
-- ============================================================

CREATE TABLE `customers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `total_orders` INT NOT NULL DEFAULT 0,
    `total_purchased` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `outstanding_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `last_order_date` DATE DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_cust_name` (`name`),
    INDEX `idx_cust_phone` (`phone`)
) ENGINE=InnoDB;

-- ============================================================
-- 6. ORDERS & SALES
-- ============================================================

CREATE TABLE `payment_methods` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_no` VARCHAR(50) NOT NULL UNIQUE,
    `customer_id` INT NOT NULL,
    `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `delivery_charge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `profit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `payment_status` ENUM('unpaid','partial','paid','refunded') NOT NULL DEFAULT 'unpaid',
    `order_status` ENUM('pending','confirmed','processing','packed','shipped','delivered','cancelled','returned','partially_returned') NOT NULL DEFAULT 'pending',
    `order_date` DATETIME NOT NULL,
    `expected_delivery_date` DATE DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `location_id` INT NOT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
    FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_ord_date` (`order_date`),
    INDEX `idx_ord_status` (`order_status`),
    INDEX `idx_ord_payment` (`payment_status`),
    INDEX `idx_ord_customer` (`customer_id`)
) ENGINE=InnoDB;

CREATE TABLE `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `variant_id` INT NOT NULL,
    `quantity` INT NOT NULL,
    `unit_price` DECIMAL(12,2) NOT NULL,
    `cost_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_price` DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
    FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
) ENGINE=InnoDB;

CREATE TABLE `sales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `invoice_no` VARCHAR(50) NOT NULL UNIQUE,
    `order_id` INT NOT NULL UNIQUE,
    `customer_id` INT NOT NULL,
    `total_revenue` DECIMAL(12,2) NOT NULL,
    `total_cogs` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `gross_profit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `payment_method_id` INT DEFAULT NULL,
    `sale_date` DATETIME NOT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
    FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_sale_date` (`sale_date`),
    INDEX `idx_sale_customer` (`customer_id`)
) ENGINE=InnoDB;

-- ============================================================
-- 7. PAYMENTS
-- ============================================================

CREATE TABLE `financial_accounts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('cash','bank','mobile_banking','other') NOT NULL DEFAULT 'cash',
    `opening_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `payment_no` VARCHAR(50) NOT NULL UNIQUE,
    `order_id` INT DEFAULT NULL,
    `customer_id` INT DEFAULT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_method_id` INT DEFAULT NULL,
    `account_id` INT DEFAULT NULL,
    `payment_type` ENUM('received','refund') NOT NULL DEFAULT 'received',
    `payment_date` DATETIME NOT NULL,
    `reference` VARCHAR(100) DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`account_id`) REFERENCES `financial_accounts`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_pay_date` (`payment_date`),
    INDEX `idx_pay_order` (`order_id`)
) ENGINE=InnoDB;

CREATE TABLE `cash_transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `type` ENUM('inflow','outflow') NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `balance_before` DECIMAL(12,2) NOT NULL,
    `balance_after` DECIMAL(12,2) NOT NULL,
    `reference_type` VARCHAR(50) DEFAULT NULL,
    `reference_id` INT DEFAULT NULL,
    `description` TEXT DEFAULT NULL,
    `transaction_date` DATETIME NOT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`account_id`) REFERENCES `financial_accounts`(`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_ct_account` (`account_id`),
    INDEX `idx_ct_date` (`transaction_date`),
    INDEX `idx_ct_ref` (`reference_type`, `reference_id`)
) ENGINE=InnoDB;

-- ============================================================
-- 8. INVENTORY
-- ============================================================

CREATE TABLE `inventory_movements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `variant_id` INT NOT NULL,
    `movement_type` ENUM('purchase','sale','return','damage','lost','adjustment','transfer','manual_add','manual_remove') NOT NULL,
    `quantity` INT NOT NULL,
    `stock_before` INT NOT NULL,
    `stock_after` INT NOT NULL,
    `reference_type` VARCHAR(50) DEFAULT NULL,
    `reference_id` INT DEFAULT NULL,
    `location_id` INT NOT NULL,
    `reason` TEXT DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
    FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`),
    FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_im_variant` (`variant_id`),
    INDEX `idx_im_type` (`movement_type`),
    INDEX `idx_im_date` (`created_at`),
    INDEX `idx_im_ref` (`reference_type`, `reference_id`)
) ENGINE=InnoDB;

-- ============================================================
-- 9. INVESTORS
-- ============================================================

CREATE TABLE `investors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `investment_date` DATE DEFAULT NULL,
    `ownership_percentage` DECIMAL(5,2) DEFAULT NULL,
    `profit_share_percentage` DECIMAL(5,2) DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_inv_name` (`name`)
) ENGINE=InnoDB;

CREATE TABLE `investor_transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `investor_id` INT NOT NULL,
    `type` ENUM('investment','additional_investment','withdrawal','profit_distribution','adjustment') NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `reference` VARCHAR(100) DEFAULT NULL,
    `transaction_date` DATE NOT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`investor_id`) REFERENCES `investors`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_it_investor` (`investor_id`),
    INDEX `idx_it_date` (`transaction_date`)
) ENGINE=InnoDB;

-- ============================================================
-- 10. FINANCE (INCOME & EXPENSES)
-- ============================================================

CREATE TABLE `income_categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `expense_categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `income` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_id` INT DEFAULT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_method_id` INT DEFAULT NULL,
    `account_id` INT DEFAULT NULL,
    `reference_type` VARCHAR(50) DEFAULT NULL,
    `reference_id` INT DEFAULT NULL,
    `description` TEXT DEFAULT NULL,
    `income_date` DATE NOT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `income_categories`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`account_id`) REFERENCES `financial_accounts`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_inc_date` (`income_date`),
    INDEX `idx_inc_ref` (`reference_type`, `reference_id`)
) ENGINE=InnoDB;

CREATE TABLE `expenses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_id` INT DEFAULT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_method_id` INT DEFAULT NULL,
    `account_id` INT DEFAULT NULL,
    `description` TEXT DEFAULT NULL,
    `receipt_reference` VARCHAR(100) DEFAULT NULL,
    `expense_date` DATE NOT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`account_id`) REFERENCES `financial_accounts`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_exp_date` (`expense_date`),
    INDEX `idx_exp_category` (`category_id`)
) ENGINE=InnoDB;

-- ============================================================
-- 11. DELIVERIES & RETURNS
-- ============================================================

CREATE TABLE `delivery_couriers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `deliveries` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `customer_id` INT NOT NULL,
    `address` TEXT DEFAULT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `courier_id` INT DEFAULT NULL,
    `tracking_number` VARCHAR(100) DEFAULT NULL,
    `delivery_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('pending','picked_up','in_transit','out_for_delivery','delivered','failed','returned') NOT NULL DEFAULT 'pending',
    `shipped_date` DATE DEFAULT NULL,
    `expected_date` DATE DEFAULT NULL,
    `delivered_date` DATE DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
    FOREIGN KEY (`courier_id`) REFERENCES `delivery_couriers`(`id`) ON DELETE SET NULL,
    INDEX `idx_del_order` (`order_id`),
    INDEX `idx_del_status` (`status`)
) ENGINE=InnoDB;

CREATE TABLE `returns` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `return_no` VARCHAR(50) NOT NULL UNIQUE,
    `order_id` INT NOT NULL,
    `customer_id` INT NOT NULL,
    `total_refund` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `reason` ENUM('wrong_product','damaged','size_issue','changed_mind','defect','other') NOT NULL DEFAULT 'other',
    `status` ENUM('pending','approved','completed','rejected') NOT NULL DEFAULT 'pending',
    `return_date` DATE NOT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_ret_order` (`order_id`),
    INDEX `idx_ret_date` (`return_date`)
) ENGINE=InnoDB;

CREATE TABLE `return_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `return_id` INT NOT NULL,
    `order_item_id` INT DEFAULT NULL,
    `product_id` INT NOT NULL,
    `variant_id` INT NOT NULL,
    `quantity` INT NOT NULL,
    `refund_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
    FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`)
) ENGINE=InnoDB;

-- ============================================================
-- 12. SYSTEM
-- ============================================================

CREATE TABLE `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT DEFAULT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT DEFAULT NULL,
    `reference_type` VARCHAR(50) DEFAULT NULL,
    `reference_id` INT DEFAULT NULL,
    `is_read` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_notif_user` (`user_id`, `is_read`),
    INDEX `idx_notif_type` (`type`)
) ENGINE=InnoDB;

CREATE TABLE `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT DEFAULT NULL,
    `action` VARCHAR(50) NOT NULL,
    `entity` VARCHAR(50) NOT NULL,
    `entity_id` INT DEFAULT NULL,
    `old_value` JSON DEFAULT NULL,
    `new_value` JSON DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `user_agent` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_entity` (`entity`, `entity_id`),
    INDEX `idx_audit_date` (`created_at`)
) ENGINE=InnoDB;

CREATE TABLE `settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL UNIQUE,
    `setting_value` TEXT DEFAULT NULL,
    `setting_group` VARCHAR(50) NOT NULL DEFAULT 'general',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 13. FUTURE ACCOUNTING FOUNDATION (RESERVED — EMPTY IN V1)
-- ============================================================

CREATE TABLE `chart_of_accounts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('asset','liability','equity','revenue','expense') NOT NULL,
    `parent_id` INT DEFAULT NULL,
    `is_system` TINYINT(1) NOT NULL DEFAULT 0,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`parent_id`) REFERENCES `chart_of_accounts`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE `journal_entries` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `entry_no` VARCHAR(50) NOT NULL UNIQUE,
    `entry_date` DATE NOT NULL,
    `description` TEXT DEFAULT NULL,
    `reference_type` VARCHAR(50) DEFAULT NULL,
    `reference_id` INT DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE `journal_entry_lines` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `journal_entry_id` INT NOT NULL,
    `account_id` INT NOT NULL,
    `debit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `credit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `description` VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts`(`id`)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
