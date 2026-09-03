# 🚀 EaseBus ERP — Modern Multi-Store Business Management & Enterprise Operations Platform

![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Database](https://img.shields.io/badge/Database-Firestore%20%26%20SQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Ready-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Offline_Sync_Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**EaseBus ERP** is an enterprise-grade, high-performance Business Resource Management, Point of Sale (POS), and Multi-Branch Operations Suite. Designed for high-volume retail chains, e-commerce merchants, and wholesale distributors, EaseBus unites sales pipelines, courier logistics, inventory movements, treasury accounts, investor equity, and employee attendance into a cohesive, lightning-fast application.

---

## 🏗️ Clean 3-Tier Architecture

The EaseBus ERP codebase is partitioned into three organized, dedicated layers with an all-in-one unified master controller:

```
+-------------------------------------------------------------------------------+
|                            EASEBUS ERP SUITE                                  |
+-------------------------------------------------------------------------------+
|                                                                               |
|  [ 1. FRONTEND ]                                                              |
|  * Location: /frontend/ & /frontend.js                                        |
|  * 15 Enterprise Screens: Dashboard, Orders, Inventory, CRM, Logistics, etc.  |
|  * Client-side SPA Router, Theme Design Tokens & Printable Invoice Engine     |
|  * Service Worker (sw.js) for Offline Caching & Background Sync               |
|                                                                               |
|                                     │ HTTP / REST API                         |
|                                     ▼                                         |
|                                                                               |
|  [ 2. BACKEND ]                                                               |
|  * Location: /backend/ & /backend.js & server.js                              |
|  * Express.js HTTP Engine with Gzip / Deflate compression                     |
|  * RESTful API Controllers: Auth, Orders, Inventory, Reports, System Config   |
|  * Enterprise Security Headers (Nosniff, Frame-Options, Strict-Origin)        |
|                                                                               |
|                                     │ Queries / Transactions                  |
|                                     ▼                                         |
|                                                                               |
|  [ 3. DATABASE ]                                                              |
|  * Location: /database/ & /database.js                                        |
|  * Relational SQL Schema: 650+ lines DDL with 20+ Normalized Tables          |
|  * Cloud Firestore Security Rules: Multi-Tenant RBAC & Creator Isolation      |
|  * Production Seed Data: Admin Accounts, Categories, Ledgers & Products       |
|                                                                               |
+-------------------------------------------------------------------------------+
|  [ UNIFIED MASTER CONTROLLER ]                                                |
|  * easebus-erp.js: Master module mounting and exporting all 3 subsystems      |
|  * EASEBUS_ERP.md: Complete architecture and unified technical specification  |
+-------------------------------------------------------------------------------+
```

---

## 📁 Repository Directory Structure

```
EaseBus-ERP/
├── easebus-erp.js           # 🌟 Master All-In-One Unified Controller (Frontend + Backend + DB)
├── EASEBUS_ERP.md           # 📘 Master Architecture & System Technical Reference
│
├── frontend/                # 🎨 Part 1: Frontend Subsystem
│   ├── index.html           # Main Single Page Application (SPA) Shell
│   ├── app.js               # Application Lifecycle & Screen Router
│   ├── css/                 # Design System, Breakpoints & Print Stylesheets
│   ├── js/
│   │   ├── core/            # Core UI, API Client, Telemetry & Global Search
│   │   ├── modules/         # 15 Operational Screen Controllers (Orders, POS, Inventory, etc.)
│   │   └── firebase/        # Cloud Firestore & Real-Time Sync Adapters
│   ├── img/                 # Application Brand Assets & Icons
│   └── README.md            # Frontend Architecture & Component Documentation
│
├── backend/                 # ⚙️ Part 2: Backend Subsystem
│   ├── server.js            # Express Server Factory & Static Asset Streamer
│   ├── routes.js            # Modular RESTful API Route Definitions
│   ├── middleware.js        # Gzip Compression, Security Headers & Cache Policies
│   ├── controllers/
│   │   ├── authController.js       # Login, Session Tokens & RBAC Verification
│   │   ├── ordersController.js     # Orders Aggregation, Summary KPIs & Invoicing
│   │   ├── inventoryController.js  # Stock Evaluation & Warehouse Adjustments
│   │   └── reportsController.js    # Profit & Loss (P&L) & Expense Analytics
│   └── README.md            # Backend Engine Documentation
│
├── database/                # 🗄️ Part 3: Database Subsystem
│   ├── schema.sql           # 650+ lines Relational SQL DDL (20+ normalized tables)
│   ├── seed.sql             # Production Seed Fixtures (Admin, Categories, Ledgers)
│   ├── firestore.rules      # Cloud Firestore Security Rules (Multi-Tenant RBAC)
│   ├── db.js                # Database Connection Pooling & Transaction Helpers
│   ├── models.js            # Entity Schemas & Data Access Layer
│   └── README.md            # Database Architecture Documentation
│
├── frontend.js              # Frontend Root Export Adapter
├── backend.js               # Backend Root Export Adapter
├── database.js              # Database Root Export Adapter
│
├── server.js                # Root Application Entry Point (Port 3000)
├── sw.js                    # Progressive Web App Service Worker
├── manifest.json            # Web App Install Manifest
├── package.json             # Node.js Dependencies & Run Scripts
└── README.md                # Project Overview & Operational Guide
```

---

## 🌟 Core Modules & Operational Features

### 1. 🛡️ Multi-Tiered Role-Based Access Control (RBAC)
- **Platform Creator (`shad@dbms.com` / `mdshazzadhossenshad586@gmail.com`)**: Full diagnostic observability, cloud database health, real-time telemetry, and store-level support tickets.
- **Store Owner & Super Admin**: Complete administrative oversight over sales, personnel directories, accounting ledgers, and inventory pricing.
- **Operations & Warehouse Manager**: Inventory batch movements, low-stock adjustments, and purchase orders.
- **Sales Representative**: Accelerated Point of Sale (POS) checkout, customer directory, and order tracking.
- **Accountant**: Double-entry financial ledgers, expense categorization, and investor equity tracking.

### 2. 🛒 Point of Sale (POS) & Tax Invoicing
- Fast barcode & SKU search with real-time stock availability verification.
- Dynamic cart calculations with customizable discounts, tax brackets, and courier charges.
- One-click print engine formatted for 80mm thermal receipts and standard A4/Letter tax invoices.

### 3. 🚚 Logistics & Courier Integration
- Built-in consignment tracking and courier synchronization for Steadfast, Pathao, and Paperfly.
- Live status updates from dispatch through in-transit to delivery confirmation or automated return.

### 4. 🔄 Return Merchandise Authorization (RMA)
- Step-by-step customer return workflow with reason classification (damaged, wrong item, customer rejected).
- Automated option to restock salable merchandise directly back into inventory or quarantine damaged goods.

### 5. 💰 Double-Entry Treasury & Investor Capital
- Multi-account tracking: Bank Accounts, Cash Drawers, and Mobile Wallets (bKash, Nagad, Rocket).
- Categorized operational expenditure ledger with digital receipt attachments.
- Investor capital management: Track capital investments, equity ownership percentages, and dividend disbursements.

### 6. 📅 31-Day Shift Attendance & Roster
- Automated 09:00 AM check-in engine calculating On-Time (`P`), Late (`L`), and Absent (`A`) statuses.
- Automated weekend detection for designated store holidays.
- Interactive monthly roster grid with manual overrides and monthly performance scoring.

### 7. 📲 Progressive Web App (PWA) & Offline Capability
- Service Worker (`sw.js`) provides instant local caching of all static assets.
- Offline-first operational capability: orders and updates queue locally and sync automatically when internet connectivity resumes.

---

## 🛠️ Quick Start & Local Installation

### Prerequisites
- **Node.js**: Version 18.0 or higher (Node.js 20+ recommended)
- **npm** or **bun**

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/MdShazzadhossenshad17/EaseBus-ERP.git
   cd EaseBus-ERP
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Or launch the production server:
   ```bash
   npm start
   ```

4. **Access the Application**:
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🌐 API Reference (RESTful Endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns system health status, uptime, and subsystem health |
| `GET` | `/api/config` | Global ERP configuration, currency (`৳ BDT`), and active modules |
| `POST` | `/api/auth/login` | Authenticates user credentials and issues session token |
| `GET` | `/api/auth/session` | Verifies active session token and user role permissions |
| `GET` | `/api/orders/summary` | Rapid KPI aggregation for executive sales dashboard |
| `GET` | `/api/orders` | Retrieves order lists with optional delivery status filtering |
| `POST` | `/api/orders` | Creates a new sales order with line items and customer link |
| `GET` | `/api/inventory/status` | Real-time stock metrics, valuation, and low-stock count |
| `GET` | `/api/inventory` | Complete SKU directory with cost and selling price |
| `POST` | `/api/inventory/adjust` | Records manual stock adjustments with audit log reason |
| `GET` | `/api/reports/pl` | Computes dynamic Profit & Loss income statement |

---

## 🔄 Synchronizing with GitHub

To push these updates to your GitHub repository:

### Option A: From Google AI Studio (Easiest)
1. Open the **Settings** / **Project** menu in the top navigation bar of Google AI Studio.
2. Select **Export to GitHub** (or **Download ZIP**).
3. Choose your repository (`MdShazzadhossenshad17/EaseBus-ERP`) to sync all updated files instantly.

### Option B: From Command Line / Terminal
If working from your local cloned directory:
```bash
# 1. Check current status
git status

# 2. Stage all updated files
git add .

# 3. Commit changes
git commit -m "feat: organize EaseBus ERP into frontend, backend, database, and unified easebus-erp module"

# 4. Push to your main branch
git push origin main
```

---

## 👤 Author & Platform Creator

**Md Shazzad Hossen Shad**  
*Lead Software Architect & Platform Creator*  
- **Email**: `shad@dbms.com` / `mdshazzadhossenshad586@gmail.com`  
- **GitHub**: [@MdShazzadhossenshad17](https://github.com/MdShazzadhossenshad17)

---

## 📄 License
This project is licensed under the **MIT License**. See `LICENSE` for details.
