/**
 * EaseBus ERP — Backend API Routes
 * Modular REST API handlers for ERP Core Operations
 */

import { Router } from 'express';
import { AuthController } from './controllers/authController.js';
import { OrdersController } from './controllers/ordersController.js';
import { InventoryController } from './controllers/inventoryController.js';
import { ReportsController } from './controllers/reportsController.js';

const apiRouter = Router();

// 1. System Health Check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EaseBus ERP API',
    version: '4.1.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    platform: 'production-ready',
    subsystems: {
      frontend: 'online',
      backend: 'online',
      database: 'connected'
    }
  });
});

// 2. Authentication Routes
apiRouter.post('/auth/login', AuthController.login);
apiRouter.get('/auth/session', AuthController.getSession);
apiRouter.post('/auth/logout', AuthController.logout);

// 3. System Configuration & Metadata
apiRouter.get('/config', (req, res) => {
  res.json({
    appName: 'EaseBus ERP',
    version: '4.1.0',
    currency: 'BDT (৳)',
    timezone: 'Asia/Dhaka',
    organization: 'EaseBus Technologies',
    features: {
      orders: true,
      inventory: true,
      logistics: true,
      treasury: true,
      investors: true,
      reports: true,
      offlineSync: true,
      printerFormat: true
    }
  });
});

// 4. Orders Routes
apiRouter.get('/orders/summary', OrdersController.getSummary);
apiRouter.get('/orders', OrdersController.getAll);
apiRouter.post('/orders', OrdersController.create);

// 5. Inventory Routes
apiRouter.get('/inventory/status', InventoryController.getStatus);
apiRouter.get('/inventory', InventoryController.getAll);
apiRouter.post('/inventory/adjust', InventoryController.adjustStock);

// 6. Reports Routes
apiRouter.get('/reports/pl', ReportsController.getProfitAndLoss);

export default apiRouter;
