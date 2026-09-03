/**
 * EaseBus ERP — Backend Inventory Controller
 * Handles stock evaluation, replenishment alerts, warehouse movements
 */

export const InventoryController = {
  getStatus(req, res) {
    res.json({
      status: 'success',
      data: {
        total_skus: 84,
        total_valuation: 1450000,
        low_stock_count: 5,
        out_of_stock_count: 2,
        warehouses_count: 3
      }
    });
  },

  getAll(req, res) {
    res.json({
      status: 'success',
      data: [
        { sku: 'PRD-101', name: 'Cotton Polo T-Shirt', category: 'Apparel', stock: 45, unit_cost: 350, selling_price: 650 },
        { sku: 'PRD-102', name: 'Wireless Bluetooth Mouse', category: 'Electronics', stock: 8, unit_cost: 420, selling_price: 850 },
        { sku: 'PRD-103', name: 'Ceramic Coffee Mug 350ml', category: 'Home Goods', stock: 0, unit_cost: 110, selling_price: 250 },
        { sku: 'PRD-104', name: 'Mechanical Keyboard RGB', category: 'Electronics', stock: 12, unit_cost: 1800, selling_price: 2900 },
        { sku: 'PRD-105', name: 'Leather Slim Wallet', category: 'Accessories', stock: 24, unit_cost: 450, selling_price: 950 }
      ]
    });
  },

  adjustStock(req, res) {
    const { sku, adjustment_type, quantity, reason } = req.body || {};
    if (!sku || !quantity) {
      return res.status(400).json({ status: 'error', message: 'SKU and quantity are required' });
    }

    res.json({
      status: 'success',
      message: `Stock for ${sku} updated (${adjustment_type}: ${quantity})`,
      adjustment: {
        sku,
        type: adjustment_type || 'adjustment',
        quantity,
        reason: reason || 'Manual audit',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export default InventoryController;
