/**
 * ============================================================
 * EASEBUS ERP — PART 2: BACKEND SUBSYSTEM
 * ============================================================
 * Consolidates the complete Backend Architecture into a unified module:
 * - Express Server Factory
 * - Security, Compression & Cache Headers Middleware
 * - RESTful API Routers & Controllers (Auth, Orders, Inventory, Reports)
 * ============================================================
 */

import { createServer } from './backend/server.js';
import apiRouter from './backend/routes.js';
import * as middleware from './backend/middleware.js';
import { AuthController } from './backend/controllers/authController.js';
import { OrdersController } from './backend/controllers/ordersController.js';
import { InventoryController } from './backend/controllers/inventoryController.js';
import { ReportsController } from './backend/controllers/reportsController.js';

export const Backend = {
  name: 'EaseBus ERP Backend Engine',
  version: '4.1.0',
  port: 3000,

  // Server Factory
  createServer,

  // API Router
  apiRouter,

  // Middleware Pipeline
  middleware: {
    compression: middleware.compressionMiddleware,
    securityHeaders: middleware.securityHeadersMiddleware,
    staticCacheHeaders: middleware.staticCacheHeaders,
    errorHandler: middleware.errorHandler
  },

  // Subsystem Controllers
  controllers: {
    auth: AuthController,
    orders: OrdersController,
    inventory: InventoryController,
    reports: ReportsController
  },

  /**
   * Quick start backend listener
   */
  listen(port = 3000, host = '0.0.0.0') {
    const app = this.createServer();
    return app.listen(port, host, () => {
      console.log(`[EaseBus Backend] Server listening at http://${host}:${port}`);
    });
  }
};

export {
  createServer,
  apiRouter,
  middleware,
  AuthController,
  OrdersController,
  InventoryController,
  ReportsController
};

export default Backend;
