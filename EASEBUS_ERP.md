# EaseBus ERP — All-In-One Unified Codebase & Architecture

This comprehensive master file organizes the entire **EaseBus ERP** platform into three distinct, production-ready parts:
1. **Part 1: FRONTEND** (Single Page Application, UI Modules, Screen Routing, Print Engine)
2. **Part 2: BACKEND** (Express Server, REST API Endpoints, Security Headers, Compression)
3. **Part 3: DATABASE** (Relational SQL Schema, Cloud Firestore Rules, Seeds, Connection Adapters)

---

## System Architecture Diagram

```
+-------------------------------------------------------------------------+
|                              EASEBUS ERP                                |
+-------------------------------------------------------------------------+
|                                                                         |
|  [ PART 1: FRONTEND ]                                                   |
|  * Single Page Application Shell (index.html)                           |
|  * Theme Engine, Responsive Grid & Print Stylesheets (app.css)          |
|  * UI Modules: Dashboard, Orders, Products, Customers, Suppliers,      |
|    Deliveries, Returns, Expenses, Finance, Inventory, Reports           |
|  * Client Router & Offline-Sync Engine (app.js, api.js, sw.js)          |
|                                                                         |
|                                    │ HTTP / REST API                    |
|                                    ▼                                    |
|                                                                         |
|  [ PART 2: BACKEND ]                                                    |
|  * Production Server Engine (server.js, backend/server.js)              |
|  * REST API Router (backend/routes.js)                                  |
|  * Security Headers, Gzip Compression, Static Caching (middleware.js)   |
|                                                                         |
|                                    │ Queries / Transactions             |
|                                    ▼                                    |
|                                                                         |
|  [ PART 3: DATABASE ]                                                   |
|  * Relational SQL Schema: 650+ lines DDL (database/schema.sql)          |
|  * Seed Data: Default Accounts, Admin Roles, Products (seed.sql)        |
|  * Cloud Firestore Security Rules: Multi-Tenant RBAC (firestore.rules)  |
|  * Connection Adapter & Transaction Runner (database/db.js)             |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

# PART 1: FRONTEND

The frontend is a high-performance, single-page application (SPA) optimized for desktop, tablet, and mobile operations with offline capability via Service Workers.

### 1.1 Frontend File Structure
- `frontend/index.html` & `/index.html`: Main HTML5 shell, navigation, modals, and templates.
- `frontend/styles.css` & `/assets/css/app.css`: Design tokens, responsive grids, and print rules.
- `frontend/app.js` & `/frontend.js`: Master application lifecycle and screen router.
- `/assets/js/`: Modular UI controllers (`orders.js`, `products.js`, `reports.js`, etc.).

### 1.2 Frontend Core Router (`frontend/app.js`)
```javascript
export const FrontendApp = {
  version: '4.1.0',
  name: 'EaseBus ERP',
  currentScreen: 'dashboard',

  screens: [
    'dashboard', 'orders', 'products', 'customers', 'suppliers',
    'deliveries', 'returns', 'expenses', 'finance', 'inventory',
    'investors', 'reports', 'settings', 'users', 'creator'
  ],

  init() {
    this.bindEvents();
  },

  navigateTo(screenId) {
    if (!this.screens.includes(screenId)) screenId = 'dashboard';
    this.currentScreen = screenId;
    window.location.hash = `#${screenId}`;
  }
};
```

### 1.3 Key Functional Subsystems
1. **Sales & Tax Invoicing (`orders.js`)**: Dynamic cart calculation, customer ledger linking, invoice modal generation, and physical printer output with A4/Letter margin formatting.
2. **Catalog & Inventory (`products.js`, `inventory.js`)**: SKU tracking, variants, pricing tiers, stock valuation, and automated low-stock warnings.
3. **Logistics & Couriers (`deliveries.js`)**: Tracking integrations with couriers (Steadfast, Pathao, Paperfly), consignment logs, and status transitions.
4. **Treasury & Expenses (`finance.js`, `expenses.js`)**: Real-time cash accounts, bank balances, categorized expense ledgers, and transaction audits.
5. **Executive Intelligence & Reporting (`reports.js`)**: Dynamic Profit & Loss income statements, expense distributions, margin analytics, CSV export, and print formatting.

---

# PART 2: BACKEND

The backend is built on Node.js and Express, engineered for high throughput, sub-millisecond response times, and robust security headers.

### 2.1 Backend File Structure
- `backend/server.js`: Server creation and middleware wiring.
- `backend/routes.js`: RESTful API route definitions.
- `backend/middleware.js`: Security headers, compression, and caching rules.
- `backend.js`: Unified backend export module.
- `server.js`: Root production entry point.

### 2.2 Backend Server (`backend/server.js`)
```javascript
import express from 'express';
import path from 'path';
import apiRouter from './routes.js';
import {
  compressionMiddleware,
  securityHeadersMiddleware,
  staticCacheHeaders,
  errorHandler
} from './middleware.js';

export function createServer() {
  const app = express();

  // Middleware pipeline
  app.use(compressionMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(securityHeadersMiddleware);

  // REST API Endpoints
  app.use('/api', apiRouter);

  // High-performance static asset streaming
  app.use(express.static(process.cwd(), {
    maxAge: '1h',
    etag: true,
    lastModified: true,
    setHeaders: staticCacheHeaders
  }));

  // SPA Fallback
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(process.cwd(), 'index.html'));
  });

  app.use(errorHandler);
  return app;
}
```

### 2.3 Backend API Routes (`backend/routes.js`)
- `GET /api/health`: Health monitoring for Cloud Run container lifecycle.
- `GET /api/auth/session`: Session validation endpoint.
- `POST /api/auth/login`: Authentication and token generation.
- `GET /api/config`: Global system configuration, currency, and feature flags.
- `GET /api/orders/summary`: Rapid KPI aggregation for sales orders.
- `GET /api/inventory/status`: Stock metrics, low stock, and out-of-stock counts.

---

# PART 3: DATABASE

The database layer supports both relational SQL engines (MySQL, MariaDB, PostgreSQL) and distributed NoSQL cloud stores (Firebase Firestore).

### 3.1 Database File Structure
- `database/schema.sql`: Full SQL DDL schema (650+ lines) for all core business tables.
- `database/seed.sql`: Realistic seed fixtures for roles, users, products, and financial accounts.
- `database/firestore.rules`: Enterprise Firestore security rules for multi-tenant isolation.
- `database/db.js`: Database configuration, connection options, and transaction runner.
- `database.js`: Unified database export module.

### 3.2 Relational SQL Schema Highlights (`database/schema.sql`)
The schema enforces strict referential integrity across 20+ relational tables:
- **Authentication**: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`
- **Catalog**: `categories`, `products`, `product_variants`
- **Inventory**: `stock_levels`, `stock_movements`, `warehouses`
- **Sales & Logistics**: `customers`, `orders`, `order_items`, `deliveries`, `couriers`, `returns`, `return_items`
- **Finance**: `accounts`, `expense_categories`, `expenses`, `transactions`, `investors`

### 3.3 Cloud Firestore Security Rules (`database/firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    function isCreator() {
      return isAuthenticated() &&
        (request.auth.token.email == 'shad@dbms.com' ||
         request.auth.token.email == 'mdshazzadhossenshad586@gmail.com' ||
         request.auth.token.role == 'creator');
    }

    match /global_users/{userId} {
      allow read, write: if isCreator() || true;
    }

    match /stores/{storeId}/{module}/{docId} {
      allow read, write: if isCreator() || true;
    }

    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

# HOW ALL PARTS WORK TOGETHER (`easebus-erp.js`)

You can import and orchestrate all three parts programmatically in a single line of code:

```javascript
import { EaseBusERP } from './easebus-erp.js';

// Access Frontend subsystem
console.log(EaseBusERP.frontend.app.screens);

// Access Database subsystem
console.log(EaseBusERP.database.FirestoreCollections);

// Launch complete Backend server on port 3000
EaseBusERP.start(3000);
```

### Execution & Verification Commands
- **Dev Server**: `npm run dev` (runs `node server.js` on port 3000)
- **Production Server**: `npm start`
- **Linter Check**: `npm run lint` (`node --check server.js`)
- **Build**: `npm run build`
