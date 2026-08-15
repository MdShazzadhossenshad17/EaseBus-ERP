-- ============================================================
-- BusinessM — Seed Data
-- Run AFTER schema.sql
-- ============================================================

USE `businessm`;

-- Roles
INSERT INTO `roles` (`name`, `description`) VALUES
('admin', 'Full access to everything'),
('manager', 'Business operations and analytics, restricted system settings'),
('staff', 'Limited access: products, sales, orders, inventory, delivery');

-- Permissions (module.action pairs)
INSERT INTO `permissions` (`module`, `action`, `description`) VALUES
('dashboard', 'read', 'View dashboard'),
('products', 'create', 'Create products'),
('products', 'read', 'View products'),
('products', 'update', 'Edit products'),
('products', 'delete', 'Delete/archive products'),
('inventory', 'create', 'Add stock'),
('inventory', 'read', 'View inventory'),
('inventory', 'update', 'Adjust stock'),
('sales', 'create', 'Record sales'),
('sales', 'read', 'View sales'),
('orders', 'create', 'Create orders'),
('orders', 'read', 'View orders'),
('orders', 'update', 'Update order status'),
('orders', 'delete', 'Cancel orders'),
('customers', 'create', 'Add customers'),
('customers', 'read', 'View customers'),
('customers', 'update', 'Edit customers'),
('suppliers', 'create', 'Add suppliers'),
('suppliers', 'read', 'View suppliers'),
('suppliers', 'update', 'Edit suppliers'),
('investors', 'create', 'Add investors'),
('investors', 'read', 'View investors'),
('investors', 'update', 'Edit investors'),
('finance', 'read', 'View finance'),
('finance', 'create', 'Record financial transactions'),
('expenses', 'create', 'Add expenses'),
('expenses', 'read', 'View expenses'),
('deliveries', 'create', 'Create deliveries'),
('deliveries', 'read', 'View deliveries'),
('deliveries', 'update', 'Update delivery status'),
('returns', 'create', 'Process returns'),
('returns', 'read', 'View returns'),
('analytics', 'read', 'View analytics'),
('reports', 'read', 'View/export reports'),
('notifications', 'read', 'View notifications'),
('users', 'create', 'Add users'),
('users', 'read', 'View users'),
('users', 'update', 'Edit users'),
('users', 'delete', 'Deactivate users'),
('settings', 'read', 'View settings'),
('settings', 'update', 'Modify settings'),
('backup', 'create', 'Create backups');

-- Admin gets ALL permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT (SELECT `id` FROM `roles` WHERE `name` = 'admin'), `id` FROM `permissions`;

-- Manager gets most permissions except users.delete, settings.update, backup
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT (SELECT `id` FROM `roles` WHERE `name` = 'manager'), `id` FROM `permissions`
WHERE CONCAT(`module`, '.', `action`) NOT IN ('users.delete', 'settings.update', 'backup.create');

-- Staff gets limited permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT (SELECT `id` FROM `roles` WHERE `name` = 'staff'), `id` FROM `permissions`
WHERE `module` IN ('dashboard', 'products', 'inventory', 'sales', 'orders', 'customers', 'deliveries', 'notifications')
AND `action` IN ('read', 'create', 'update');

-- Default business
INSERT INTO `businesses` (`name`, `currency`, `currency_symbol`) VALUES
('BusinessM', 'BDT', '৳');

-- Default location
INSERT INTO `locations` (`name`, `type`, `is_default`, `status`) VALUES
('Main Store', 'store', 1, 'active');

-- Payment methods
INSERT INTO `payment_methods` (`name`) VALUES
('Cash'), ('bKash'), ('Nagad'), ('Rocket'), ('Bank'), ('Card'), ('Other');

-- Financial accounts
INSERT INTO `financial_accounts` (`name`, `type`, `opening_balance`, `current_balance`) VALUES
('Cash', 'cash', 0.00, 0.00),
('bKash', 'mobile_banking', 0.00, 0.00),
('Nagad', 'mobile_banking', 0.00, 0.00),
('Rocket', 'mobile_banking', 0.00, 0.00),
('Bank Account', 'bank', 0.00, 0.00);

-- Product categories
INSERT INTO `categories` (`name`, `description`) VALUES
('Clothing', 'Apparel and garments'),
('Jewelry', 'Rings, necklaces, bracelets, earrings'),
('Accessories', 'Bags, belts, watches, sunglasses');

-- Subcategories
INSERT INTO `subcategories` (`category_id`, `name`) VALUES
((SELECT id FROM categories WHERE name='Clothing'), 'T-Shirts'),
((SELECT id FROM categories WHERE name='Clothing'), 'Shirts'),
((SELECT id FROM categories WHERE name='Clothing'), 'Pants'),
((SELECT id FROM categories WHERE name='Clothing'), 'Dresses'),
((SELECT id FROM categories WHERE name='Clothing'), 'Jackets'),
((SELECT id FROM categories WHERE name='Jewelry'), 'Rings'),
((SELECT id FROM categories WHERE name='Jewelry'), 'Necklaces'),
((SELECT id FROM categories WHERE name='Jewelry'), 'Bracelets'),
((SELECT id FROM categories WHERE name='Jewelry'), 'Earrings'),
((SELECT id FROM categories WHERE name='Accessories'), 'Bags'),
((SELECT id FROM categories WHERE name='Accessories'), 'Belts'),
((SELECT id FROM categories WHERE name='Accessories'), 'Watches');

-- Income categories
INSERT INTO `income_categories` (`name`) VALUES
('Sales'), ('Investment'), ('Other Income');

-- Expense categories
INSERT INTO `expense_categories` (`name`) VALUES
('Product Purchase'), ('Delivery'), ('Packaging'), ('Marketing'),
('Advertising'), ('Salary'), ('Rent'), ('Electricity'),
('Internet'), ('Transportation'), ('Platform Fees'),
('Payment Gateway Fees'), ('Miscellaneous');

-- Delivery couriers
INSERT INTO `delivery_couriers` (`name`, `phone`) VALUES
('Pathao', '09678-100800'),
('Steadfast', '09678-200200'),
('SA Paribahan', '09612-000000'),
('Sundarban', '09612-111111'),
('Self Delivery', NULL);

-- Default settings
INSERT INTO `settings` (`setting_key`, `setting_value`, `setting_group`) VALUES
('low_stock_threshold', '5', 'notification'),
('order_alerts', '1', 'notification'),
('financial_alerts', '1', 'notification'),
('invoice_prefix', 'INV', 'business'),
('order_prefix', 'ORD', 'business'),
('return_prefix', 'RET', 'business'),
('purchase_prefix', 'PUR', 'business'),
('payment_prefix', 'PAY', 'business');
