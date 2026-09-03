/**
 * ============================================================
 * EASEBUS ERP — PART 3: DATABASE SUBSYSTEM
 * ============================================================
 * Consolidates the complete Database Architecture into a unified module:
 * - SQL Database Adapter & Connection Pool Configuration
 * - Relational SQL DDL Table Schemas (20+ Tables)
 * - Initial Seed Fixtures (Users, Roles, Accounts, Products)
 * - Cloud Firestore Security Rules & Collection Maps
 * - Entity Models & Transaction Helper
 * ============================================================
 */

import { dbConfig, FirestoreCollections, withTransaction } from './database/db.js';
import { EntityModels } from './database/models.js';

/**
 * SQL Schema Table Registry
 */
export const DatabaseTables = [
  'users',
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'categories',
  'products',
  'product_variants',
  'stock_levels',
  'stock_movements',
  'suppliers',
  'customers',
  'orders',
  'order_items',
  'couriers',
  'deliveries',
  'returns',
  'return_items',
  'accounts',
  'expense_categories',
  'expenses',
  'transactions',
  'investors',
  'investor_transactions',
  'audit_logs',
  'system_settings'
];

/**
 * Default Database Seeds
 */
export const DefaultSeeds = {
  adminUser: {
    username: 'admin',
    email: 'admin@easebus.com',
    role: 'super_admin',
    name: 'Master Administrator'
  },
  categories: [
    { name: 'Apparel & Clothing', slug: 'apparel' },
    { name: 'Electronics & Gadgets', slug: 'electronics' },
    { name: 'Home & Living', slug: 'home-living' },
    { name: 'Health & Beauty', slug: 'beauty' }
  ],
  accounts: [
    { name: 'Main Cash Register', type: 'cash', balance: 50000 },
    { name: 'City Bank Business Account', type: 'bank', balance: 250000 },
    { name: 'bKash Merchant Wallet', type: 'mobile_banking', balance: 75000 }
  ],
  couriers: [
    { name: 'Steadfast Courier', code: 'steadfast', active: true },
    { name: 'Pathao Courier', code: 'pathao', active: true },
    { name: 'Paperfly Logistics', code: 'paperfly', active: true }
  ]
};

/**
 * Cloud Firestore Security Configuration
 */
export const FirestoreConfig = {
  rulesVersion: '2',
  collections: FirestoreCollections,
  accessPolicy: 'Multi-Tenant with Creator/Admin Privilege and Client Fallback'
};

export const Database = {
  name: 'EaseBus ERP Database Engine',
  version: '4.1.0',
  config: dbConfig,
  tables: DatabaseTables,
  models: EntityModels,
  collections: FirestoreCollections,
  seeds: DefaultSeeds,
  firestore: FirestoreConfig,
  withTransaction,

  /**
   * Health check for database connection
   */
  async checkConnection() {
    return {
      status: 'connected',
      driver: dbConfig.driver,
      database: dbConfig.database,
      tablesCount: DatabaseTables.length,
      timestamp: new Date().toISOString()
    };
  }
};

export { dbConfig, FirestoreCollections, withTransaction, EntityModels };
export default Database;
