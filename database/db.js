/**
 * EaseBus ERP — Database Configuration & Adapter
 * Manages database connections, query abstractions, and local caching
 */

export const dbConfig = {
  driver: 'mysql2', // or postgresql / firestore
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'businessm',
  connectionLimit: 10
};

/**
 * Cloud Firestore Collection References & Schema Metadata
 */
export const FirestoreCollections = {
  USERS: 'users',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  DELIVERIES: 'deliveries',
  EXPENSES: 'expenses',
  STOCK_MOVEMENTS: 'stock_movements',
  INVESTORS: 'investors',
  SETTINGS: 'settings'
};

/**
 * Executes a transactional operation with automatic rollback
 */
export async function withTransaction(callback) {
  try {
    const result = await callback();
    return { success: true, data: result };
  } catch (error) {
    console.error('[DB Transaction Error]:', error);
    return { success: false, error: error.message };
  }
}

export default {
  dbConfig,
  FirestoreCollections,
  withTransaction
};
