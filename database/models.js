/**
 * EaseBus ERP — Database Models & Data Access Layer
 * Schema metadata, relation definitions, and entity managers
 */

export const EntityModels = {
  User: {
    table: 'users',
    fields: ['id', 'username', 'email', 'password_hash', 'role_id', 'status', 'created_at']
  },
  Customer: {
    table: 'customers',
    fields: ['id', 'name', 'phone', 'email', 'address', 'district', 'balance', 'created_at']
  },
  Product: {
    table: 'products',
    fields: ['id', 'sku', 'name', 'category_id', 'cost_price', 'selling_price', 'stock_quantity', 'status']
  },
  Order: {
    table: 'orders',
    fields: ['id', 'order_number', 'customer_id', 'total_amount', 'paid_amount', 'payment_status', 'delivery_status', 'courier_id']
  },
  OrderItem: {
    table: 'order_items',
    fields: ['id', 'order_id', 'product_id', 'quantity', 'unit_price', 'total_price']
  },
  Delivery: {
    table: 'deliveries',
    fields: ['id', 'order_id', 'courier_name', 'tracking_code', 'status', 'dispatched_at', 'delivered_at']
  },
  Expense: {
    table: 'expenses',
    fields: ['id', 'category_id', 'account_id', 'amount', 'expense_date', 'description', 'created_by']
  },
  Account: {
    table: 'accounts',
    fields: ['id', 'name', 'type', 'balance', 'account_number', 'status']
  }
};

export default EntityModels;
