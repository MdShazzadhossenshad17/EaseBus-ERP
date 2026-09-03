# EaseBus ERP — Database Architecture

The database layer of EaseBus ERP is architected to support both relational SQL engines (MySQL 8.0+, MariaDB 10.4+, PostgreSQL) and distributed NoSQL cloud stores (Firebase Cloud Firestore).

## Directory Structure
- `schema.sql`: Comprehensive SQL DDL (650+ lines) defining tables for users, roles, permissions, customers, suppliers, products, categories, stock, orders, order items, deliveries, return items, expenses, accounts, and audit ledgers.
- `seed.sql`: Initial seed data including system administrator credentials, default product categories, sample inventory items, demo customers, and financial ledger accounts.
- `firestore.rules`: Security rules for Google Cloud Firestore governing multi-tenant stores, creator authorizations, audit logs, and telemetry collections.
- `db.js`: Database configuration, connection pooling options, collection enumerations, and transaction runner.

## Primary Entities
1. **Identity & RBAC**: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`
2. **Catalog & Inventory**: `categories`, `products`, `product_variants`, `stock_levels`, `stock_movements`, `suppliers`
3. **Sales & Fulfillment**: `customers`, `orders`, `order_items`, `deliveries`, `couriers`, `returns`, `return_items`
4. **Treasury & Accounting**: `accounts`, `expenses`, `expense_categories`, `transactions`, `investors`
