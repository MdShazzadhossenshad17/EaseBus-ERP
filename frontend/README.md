# EaseBus ERP — Frontend Architecture

The frontend of EaseBus ERP is a responsive, single-page progressive web application (PWA) built for desktop, tablet, and mobile operations with offline capability.

## Directory Structure & Modules
- `index.html`: Main HTML5 application shell, including semantic wrappers, sidebar navigation, top bar, modal containers, and print sheets.
- `app.js`: Core client router, event hub, and screen lifecycle manager.
- `styles.css`: Complete styling framework, design tokens, responsive breakpoints, and print stylesheets for invoices and reports.

## Core Modules & Functional Subsystems
1. **Dashboard (`dashboard.js`)**: Executive KPI overview, revenue telemetry, recent activity logs, and real-time alerts.
2. **Sales & Invoicing (`orders.js`)**: Order creation, status pipeline, interactive line-item calculations, and printable tax invoices.
3. **Product Catalog (`products.js`)**: SKU management, pricing tiers, category taxonomy, and barcode/variant support.
4. **Customer Relationship Management (`customers.js`)**: Customer ledgers, outstanding balances, order histories, and receivables.
5. **Procurement & Vendors (`suppliers.js`)**: Supplier records, purchase orders, payable accounts, and stock replenishment.
6. **Logistics & Couriers (`deliveries.js`)**: Delivery tracking, courier integrations (Steadfast, Pathao, Paperfly), and consignment notes.
7. **Return Merchandise Authorization (`returns.js`)**: Customer returns, RMA reasons, restock workflows, and refund processing.
8. **Inventory Management (`inventory.js`)**: Stock valuation, multi-warehouse tracking, batch management, and low-stock alerts.
9. **Treasury & Expenses (`finance.js`, `expenses.js`)**: General ledger, bank accounts, petty cash accounts, and categorized operational expenditure.
10. **Investor Relations (`investors.js`)**: Capital contribution tracking, equity shares, dividends, and shareholder reports.
11. **Executive Intelligence (`reports.js`)**: Profit & Loss income statements, expense distributions, product leaderboards, and PDF/print outputs.
12. **System Administration (`settings.js`, `users.js`, `creator.js`)**: RBAC permissions, store configurations, telemetry logs, and creator controls.
