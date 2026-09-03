/**
 * ============================================================
 * EASEBUS ERP — PART 1: FRONTEND SUBSYSTEM
 * ============================================================
 * Consolidates the complete Frontend Architecture into a unified module:
 * - Application Lifecycle & SPA Routing Hub
 * - Screen Catalog (15 Enterprise Modules)
 * - UI Components & Notification Engine
 * - Offline Cache & Background Sync Coordination
 * ============================================================
 */

export const ScreenRegistry = {
  dashboard: { title: 'Executive Dashboard', icon: 'dashboard', category: 'Analytics' },
  orders: { title: 'Sales Orders & Invoicing', icon: 'shopping_bag', category: 'Sales' },
  products: { title: 'Product Catalog & SKUs', icon: 'inventory_2', category: 'Inventory' },
  customers: { title: 'Customer Accounts (CRM)', icon: 'group', category: 'Sales' },
  suppliers: { title: 'Suppliers & Vendors', icon: 'local_shipping', category: 'Purchasing' },
  deliveries: { title: 'Courier & Logistics', icon: 'near_me', category: 'Fulfillment' },
  returns: { title: 'RMA & Returns Handling', icon: 'assignment_return', category: 'Fulfillment' },
  finance: { title: 'Treasury & Accounts', icon: 'account_balance', category: 'Finance' },
  expenses: { title: 'Operational Expenses', icon: 'receipt_long', category: 'Finance' },
  inventory: { title: 'Warehouse Stock Movements', icon: 'warehouse', category: 'Inventory' },
  investors: { title: 'Investor Capital & Equity', icon: 'trending_up', category: 'Finance' },
  reports: { title: 'Intelligence & P&L Reports', icon: 'monitoring', category: 'Analytics' },
  settings: { title: 'Store Settings & Tax', icon: 'settings', category: 'System' },
  users: { title: 'User Roles & RBAC', icon: 'manage_accounts', category: 'System' },
  creator: { title: 'Creator & Developer Portal', icon: 'terminal', category: 'System' }
};

export const FrontendUI = {
  theme: {
    fontFamily: 'Plus Jakarta Sans, Geist, sans-serif',
    primaryColor: '#0f172a',
    accentColor: '#4f46e5',
    currency: 'BDT (৳)',
    dateFormat: 'YYYY-MM-DD'
  },

  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return `৳${num.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  getStatusBadge(status) {
    const s = String(status || '').toLowerCase();
    const badges = {
      paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      unpaid: 'bg-rose-50 text-rose-700 border-rose-200',
      in_transit: 'bg-blue-50 text-blue-700 border-blue-200',
      cancelled: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    const cls = badges[s] || 'bg-slate-50 text-slate-600 border-slate-200';
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}">${status}</span>`;
  }
};

export const FrontendApp = {
  name: 'EaseBus ERP Frontend',
  version: '4.1.0',
  currentScreen: 'dashboard',
  screens: Object.keys(ScreenRegistry),
  registry: ScreenRegistry,
  ui: FrontendUI,

  navigate(screenId) {
    if (!this.screens.includes(screenId)) screenId = 'dashboard';
    this.currentScreen = screenId;
    if (typeof window !== 'undefined') {
      window.location.hash = `#${screenId}`;
    }
    return screenId;
  }
};

export { FrontendUI as UI };
export default FrontendApp;
