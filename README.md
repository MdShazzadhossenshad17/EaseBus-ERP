# 🚀 EaseBus ERP — Next-Gen Business Management & Multi-Store Operations System

![PHP Version](https://img.shields.io/badge/PHP-8.2%2B-777BB4?style=for-the-badge&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![PWA Ready](https://img.shields.io/badge/PWA-Progressive_Web_App-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.style=for-the-badge)

**EaseBus ERP** is an enterprise-grade, real-time Business Resource Management and Point of Sale (POS) Progressive Web Application designed for single and multi-branch retail stores, e-commerce brands, and corporate operations. 

Engineered with modern dark-mode aesthetic design, high-performance PHP REST APIs, robust Role-Based Access Control (RBAC), and real-time operational streams, EaseBus gives business owners full command over sales, inventory, logistics, financial ledgers, and staff attendance.

---

## 🌟 Key Highlights & Architectural Features

### 🛡️ 1. Multi-Tiered Role-Based Access Control (RBAC)
- **Platform Creator & Super Admin (`shad@dbms.com`)**: Full platform visibility, real-time system diagnostics (DB health, server memory, PWA cache), and a live stream of store reported issues with click-to-resolve response controls.
- **Business Store Owner**: Complete authority over store operations, sales analytics, staff creation, credential management, financial reports, and direct bug reporting to the Platform Creator.
- **Store Administrator (`tanvir`)**: Senior operational hub with read-only staff directory access and shift attendance oversight. Protected from altering store ownership or private financials.
- **Store Operations Manager**: Manages inventory stock, product variants, categories, and customer dispatch.
- **Sales Staff**: Streamlined POS checkout, order status updates, and customer search.
- **Staff Accountant**: Access to financial ledgers, investor transactions, income/expense tracking, and cashflow reports.

### 📅 2. Automated Shift Attendance & Roster System
- **09:00 AM Daily Shift Engine**: Automatically logs staff arrival (`P` = Present On-Time, `L` = Late Arrival).
- **Official Weekend Days**: Automatically assigns `OFF` status for **Fridays & Saturdays**.
- **Interactive 31-Day Attendance Grid**: Click any date cell in the monthly roster matrix to set manual status overrides (`P`, `L`, `LEAVE`, `OFF`, `A`) with custom shift notes and automatic score recalculation.

### 📦 3. Inventory, Orders & Returns Engine
- **Product Variants & SKU Tracking**: Supports multi-variant stock, low-stock notifications, and barcode search.
- **Sales POS & Order Workflow**: Create, edit, and track sales orders from Pending to Shipped/Delivered.
- **Logistics Integration**: Integrated Steadfast Courier API for live parcel consignment tracking and status syncing.
- **Customer Returns Workflow**: Seamless customer return processing with automated inventory restocking option.

### 💰 4. Double-Entry Accounting & Investor Ledger
- **Financial Accounts & Cashflow**: Track bank accounts, cash drawers, and mobile wallets (bKash, Nagad).
- **Income & Expense Classification**: Categorized expense logs with receipt attachment tracking.
- **Investor Management**: Dedicated investor equity tracking, transaction logs, and dividend payouts.

### 📲 5. Progressive Web App (PWA) & Offline Ready
- **Service Worker (`sw.js`)**: Instant caching, offline capability, background sync, and mobile home screen installation.

---

## 📁 Repository Directory Structure

```
EaseBus-ERP/
├── api/                        # RESTful PHP API Endpoints
│   ├── auth.php                # Authentication, Login & Session Management
│   ├── users.php               # Staff Directory & Role Permission Management
│   ├── orders.php              # POS Sales Orders Engine
│   ├── products.php            # Product Catalog & Inventory
│   ├── expenses.php            # Expense Ledger Tracking
│   ├── returns.php             # Customer Returns & Restocking
│   ├── deliveries.php          # Courier Logistics Integration
│   └── support.php            # Live Bug Reports & Creator System Health API
├── assets/                     # Frontend Assets & Logic
│   ├── css/                    # Custom Styling & Tailwind CSS Tokens
│   └── js/                     # Modular Component Scripts (app.js, users.js, orders.js, etc.)
├── includes/                   # Core Security & Database Layer
│   ├── database.php            # PDO Database Wrapper & Query Helper
│   ├── auth_middleware.php     # Session Auth & RBAC Guard
│   ├── helpers.php             # CSRF, Sanitization & Response Utilities
│   └── validation.php          # Form Data Validator
├── pages/                      # Application Layout Templates
│   └── app.php                 # Core App Shell & Dynamic Router Container
├── config.php                  # Application Configuration & DB Credentials
├── index.html                  # SPA Landing Entry Point
├── login.php                   # Authentication View
├── register.php                # Store Registration View
├── sw.js                       # Service Worker Engine
└── README.md                   # Project Documentation & Roadmap
```

---

## 🛠️ Installation & Local Setup

### Prerequisites
- **Web Server**: Apache / Nginx (XAMPP / Laragon / WampServer supported)
- **PHP**: Version 8.1 or higher (with `pdo_mysql` enabled)
- **Database**: MySQL 8.0 or MariaDB 10.4+

### Setup Steps
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/MdShazzadhossenshad17/EaseBus-ERP.git
   cd EaseBus-ERP
   ```

2. **Configure Database**:
   - Create a MySQL database named `businessm`.
   - Update database credentials in `config.php`:
     ```php
     define('DB_HOST', 'localhost');
     define('DB_NAME', 'businessm');
     define('DB_USER', 'root');
     define('DB_PASS', '');
     ```

3. **Launch the Application**:
   - Place the project in your local server directory (e.g. `c:/xampp/htdocs/businessM/businessM/`).
   - Navigate to `http://localhost/businessM/businessM/` in your browser.

---

## 🗺️ Product Roadmap & Upcoming Updates Plan

### 📍 Phase 1: Core Foundation & Security (Completed ✅)
- [x] Full Single-Page Application (SPA) architecture with dark mode design system.
- [x] Role-Based Access Control (RBAC) with Owner, Admin, Manager, Sales, Accountant roles.
- [x] 31-Day Interactive Attendance Roster with automatic Friday/Saturday weekend off days.
- [x] Direct Creator Bug Reporting System & Real-Time System Health Diagnostics Panel.
- [x] PWA offline caching service worker engine (`easebus-cache-v25.0`).

### 🚀 Phase 2: Automation & Communication Hub (Q3 2026)
- [ ] **WhatsApp & SMS Invoice Dispatch**: Automatic digital PDF receipt dispatch directly to customer WhatsApp numbers upon POS order completion.
- [ ] **Automated Payment Reminders**: Scheduled SMS alerts for overdue customer credit/due accounts.
- [ ] **Email Notification Gateway**: Instant email notifications for low-stock alerts and support ticket status updates.

### 🧠 Phase 3: AI Analytics & Smart Forecasting (Q4 2026)
- [ ] **AI Stock Demand Predictor**: Machine learning model analyzing historical sales trends to predict optimal reorder quantities.
- [ ] **Automated Supplier Purchase Orders**: Smart PO generation when inventory dips below minimum threshold.
- [ ] **Advanced Financial Analytics**: Automated Profit & Loss (P&L) balance sheet generation and tax calculation exports.

### 📱 Phase 4: Multi-Branch & Native Mobile Build (Q1 2027)
- [ ] **Multi-Branch Store Sync**: Centralized franchise management supporting inter-store stock transfers and branch comparison dashboards.
- [ ] **Native Android & iOS Apps**: Capacitor / React Native wrapper for native Bluetooth thermal receipt printer pairing and barcode scanner camera integration.

---

## 👤 Author & Platform Creator

**Md Shazzad Hossen Shad**  
*Lead Software Architect & Platform Creator*  
- **Email**: `shad@dbms.com`  
- **GitHub**: [@MdShazzadhossenshad17](https://github.com/MdShazzadhossenshad17)

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for more information.
