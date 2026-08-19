/**
 * EaseBus — Role-Decorated Real-Time Portals Controller
 * Supports: Store Owner (Admin), Store Manager (Operations Hub), 
 * Sales Representative (POS Terminal), Staff Accountant (Financial Ledger Hub)
 */

window.Dashboard = {
    liveTimer: null,
    currentSummaryData: null,

    normalizeRole(rawRole) {
        const r = (rawRole || '').toLowerCase();
        if (r.includes('manager')) return 'manager';
        if (r.includes('sale') || r.includes('staff') || r.includes('rep') || r.includes('counter')) return 'sales';
        if (r.includes('account')) return 'accountant';
        if (r.includes('creator')) return 'creator';
        return 'admin';
    },

    async render(container) {
        this.stopLivePolling();

        const currentUser = API.getCurrentUser() || {};
        const role = this.normalizeRole(currentUser.role);

        if (role === 'manager') {
            await this.renderManagerPortal(container, currentUser);
        } else if (role === 'sales') {
            await this.renderSalesPortal(container, currentUser);
        } else if (role === 'accountant') {
            await this.renderAccountantPortal(container, currentUser);
        } else {
            await this.renderAdminPortal(container, currentUser);
        }

        // Start 10-second real-time auto polling
        this.startLivePolling();
    },

    startLivePolling() {
        this.stopLivePolling();
        this.liveTimer = setInterval(async () => {
            if (window.App && window.App.currentRoute === 'dashboard') {
                await this.loadSummary(true);
            } else {
                this.stopLivePolling();
            }
        }, 3000);
    },

    stopLivePolling() {
        if (this.liveTimer) {
            clearInterval(this.liveTimer);
            this.liveTimer = null;
        }
    },

    async refreshLive() {
        try {
            UI.setLoading(true);
            await this.loadSummary(false);
            UI.toast('Live Portal data refreshed', 'success');
        } catch (e) {
            UI.toast('Failed to refresh live data', 'error');
        } finally {
            UI.setLoading(false);
        }
    },

    /* =========================================================================
       1. STORE MANAGER PORTAL (Operations Command Hub)
       ========================================================================= */
    async renderManagerPortal(container, user) {
        container.innerHTML = `
            <!-- Manager Portal Top Banner -->
            <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white border border-indigo-500/30 shadow-2xl mb-6 font-jakarta">
                <div class="absolute right-0 top-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none"></div>
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div>
                        <div class="flex items-center gap-2 mb-2 font-outfit">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 flex items-center gap-1.5 shadow-inner">
                                <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span> Live Operations Hub
                            </span>
                            <span class="text-xs text-slate-400 font-digit">Shift: Active (09:00 - 18:00)</span>
                        </div>
                        <h1 class="text-2xl font-bold tracking-tight text-white font-geist">Store Operations Manager Center</h1>
                        <p class="text-slate-300 text-xs mt-1 max-w-xl font-inter">Welcome, <span class="font-semibold text-indigo-300">${user.full_name || user.username}</span>. Monitor live store inventory, urgent low-stock alerts, rider dispatches, and shift performance in real-time.</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2.5 font-outfit">
                        <button type="button" class="btn text-xs font-bold px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg border border-indigo-400/30 flex items-center gap-1.5 cursor-pointer" onclick="Dashboard.refreshLive()">
                            <span class="material-symbols-outlined text-sm">sync</span> Live Sync
                        </button>
                        <a href="#deliveries" class="btn text-xs font-bold px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5" onclick="window.App.pendingAction='dispatch_delivery'">
                            <span class="material-symbols-outlined text-sm text-indigo-400">moped</span> Dispatch Delivery
                        </a>
                        <a href="#inventory" class="btn text-xs font-bold px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm text-amber-400">warehouse</span> Stock Control
                        </a>
                    </div>
                </div>
            </div>

            <!-- Operations KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 font-jakarta" id="dash-kpi-container">
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-amber-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-outfit">Urgent Low Stock</p>
                    <h3 class="text-3xl font-extrabold text-amber-400 mt-1.5 font-digit font-mono" id="kpi-val-1">0 SKUs</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Stock level ≤ 10 units</p>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-blue-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-blue-400 font-outfit">Pending Orders</p>
                    <h3 class="text-3xl font-extrabold text-blue-400 mt-1.5 font-digit font-mono" id="kpi-val-2">0</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Awaiting dispatch fulfillment</p>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-indigo-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-indigo-400 font-outfit">Active Consignments</p>
                    <h3 class="text-3xl font-extrabold text-indigo-400 mt-1.5 font-digit font-mono" id="kpi-val-3">0</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">In transit to customers</p>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-outfit">Today's Store Turnover</p>
                    <h3 class="text-3xl font-extrabold text-emerald-400 mt-1.5 font-digit font-mono" id="kpi-val-4">৳ 0.00</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">0 counter transactions</p>
                </div>
            </div>

            <!-- Main Manager Grid: Low Stock Alert List & Active Dispatches -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 font-jakarta">
                <!-- Low Stock Urgency Table -->
                <div class="card lg:col-span-2 shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl overflow-hidden">
                    <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-400 text-lg">warning</span>
                            <h3 class="font-bold text-white text-sm font-geist">Low Stock Inventory Urgency List</h3>
                        </div>
                        <a href="#suppliers" class="text-xs text-indigo-400 hover:text-indigo-300 font-bold font-outfit flex items-center gap-1">
                            Contact Suppliers <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </a>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>SKU</th>
                                    <th class="text-center">Current Stock</th>
                                    <th class="text-center">Reorder Threshold</th>
                                    <th class="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody id="mgr-low-stock-list">
                                <tr><td colspan="5" class="text-center py-8 text-slate-400 text-xs font-inter">Scanning inventory stock levels...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Operations Alerts & Rider Status -->
                <div class="card shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl flex flex-col overflow-hidden">
                    <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-indigo-400 text-lg">alt_route</span>
                            <h3 class="font-bold text-white text-sm font-geist">Live Operational Alerts</h3>
                        </div>
                        <span class="text-[10px] text-indigo-400 font-bold font-digit uppercase">Real-Time</span>
                    </div>
                    <div class="p-0 flex-1 overflow-y-auto max-h-96">
                        <ul class="divide-y divide-slate-800/80" id="dash-alerts">
                            <li class="p-4 text-center text-slate-400 text-xs">Checking operational health...</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Recent Orders Queue -->
            <div class="card shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl overflow-hidden font-jakarta">
                <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-emerald-400 text-lg">receipt_long</span>
                        <h3 class="font-bold text-white text-sm font-geist">Recent Orders & Fulfillment Stream</h3>
                    </div>
                    <a href="#orders" class="text-xs text-indigo-400 hover:text-indigo-300 font-bold font-outfit flex items-center gap-1">
                        View All Orders <span class="material-symbols-outlined text-xs">arrow_forward</span>
                    </a>
                </div>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Order # & Timestamp</th>
                                <th>Customer Name</th>
                                <th class="text-right">Total Amount</th>
                                <th class="text-center">Fulfillment Status</th>
                                <th class="text-center">Payment</th>
                                <th class="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody id="dash-orders-list">
                            <tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs font-inter">Loading orders stream...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadSummary(false);
    },

    /* =========================================================================
       2. SALES REPRESENTATIVE PORTAL (Sales POS Terminal)
       ========================================================================= */
    async renderSalesPortal(container, user) {
        container.innerHTML = `
            <!-- Sales Terminal Top Banner -->
            <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/80 to-slate-900 p-6 text-white border border-amber-500/30 shadow-2xl mb-6 font-jakarta">
                <div class="absolute right-0 top-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div>
                        <div class="flex items-center gap-2 mb-2 font-outfit">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 shadow-inner">
                                <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Sales Representative Terminal #01
                            </span>
                            <span class="text-xs text-slate-400 font-digit">Target Goal: ৳ 50,000 / day</span>
                        </div>
                        <h1 class="text-2xl font-bold tracking-tight text-white font-geist">Counter Sales & POS Terminal</h1>
                        <p class="text-slate-300 text-xs mt-1 max-w-xl font-inter">Welcome, Sales Rep <span class="font-semibold text-amber-300">${user.full_name || user.username}</span>. Process customer counter sales instantly, perform quick stock availability lookups, and track today's sales target.</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2.5 font-outfit">
                        <button type="button" class="btn text-xs font-bold px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-lg border border-amber-300/40 flex items-center gap-1.5 cursor-pointer" onclick="Dashboard.showQuickPosModal()">
                            <span class="material-symbols-outlined text-base">add_shopping_cart</span> + Create Quick Sale
                        </button>
                        <button type="button" class="btn text-xs font-bold px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer" onclick="Dashboard.refreshLive()">
                            <span class="material-symbols-outlined text-sm">sync</span> Sync Sales
                        </button>
                    </div>
                </div>
            </div>

            <!-- Sales Representative KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 font-jakarta" id="dash-kpi-container">
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-amber-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-outfit">My Sales Volume Today</p>
                    <h3 class="text-3xl font-extrabold text-amber-400 mt-1.5 font-digit font-mono">৳ 0.00</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Total sales volume today</p>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-outfit">Transactions Handled</p>
                    <h3 class="text-3xl font-extrabold text-emerald-400 mt-1.5 font-digit font-mono">0</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Orders billed at counter</p>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-blue-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-blue-400 font-outfit">Daily Goal Progress</p>
                    <h3 class="text-3xl font-extrabold text-blue-400 mt-1.5 font-digit font-mono">0%</h3>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div class="bg-blue-500 h-full rounded-full transition-all duration-500" style="width: 0%"></div>
                    </div>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-indigo-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-indigo-400 font-outfit">Deliveries in Transit</p>
                    <h3 class="text-3xl font-extrabold text-indigo-400 mt-1.5 font-digit font-mono">0</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Active customer dispatches</p>
                </div>
            </div>

            <!-- Quick Sale Terminal Card + Catalog Search -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 font-jakarta">
                <!-- Inline POS Quick Sale Entry -->
                <div class="card lg:col-span-2 p-5 bg-slate-900 border border-slate-800 shadow-xl rounded-2xl">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-400">bolt</span>
                            <h3 class="font-bold text-white text-sm font-geist">Express Counter Sale Entry</h3>
                        </div>
                        <span class="text-xs text-slate-400 font-digit">Instant Billing & Receipt</span>
                    </div>

                    <form id="sales-pos-form" onsubmit="Dashboard.handleQuickPosSubmit(event)" class="space-y-4 font-inter text-xs">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-slate-300 font-semibold mb-1 block">Select Product *</label>
                                <select id="pos-product-select" class="form-input bg-slate-950 border-slate-800 text-white py-2 text-xs" required onchange="Dashboard.updatePosPrice()">
                                    <option value="">-- Choose Product --</option>
                                </select>
                            </div>
                            <div>
                                <label class="form-label text-slate-300 font-semibold mb-1 block">Quantity *</label>
                                <input type="number" id="pos-qty" min="1" value="1" class="form-input bg-slate-950 border-slate-800 text-white py-2 text-xs" required oninput="Dashboard.updatePosPrice()">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label class="form-label text-slate-300 font-semibold mb-1 block">Customer Name</label>
                                <input type="text" id="pos-customer-name" placeholder="Walk-in Customer" class="form-input bg-slate-950 border-slate-800 text-white py-2 text-xs">
                            </div>
                            <div>
                                <label class="form-label text-slate-300 font-semibold mb-1 block">Customer Phone</label>
                                <input type="text" id="pos-customer-phone" placeholder="017xxxxxxxx" class="form-input bg-slate-950 border-slate-800 text-white py-2 text-xs">
                            </div>
                            <div>
                                <label class="form-label text-slate-300 font-semibold mb-1 block">Payment Method *</label>
                                <select id="pos-payment-method" class="form-input bg-slate-950 border-slate-800 text-white py-2 text-xs" required>
                                    <option value="Cash">Cash Counter</option>
                                    <option value="bKash">bKash Merchant</option>
                                    <option value="Nagad">Nagad Direct</option>
                                    <option value="Card">POS Card Terminal</option>
                                </select>
                            </div>
                        </div>

                        <div class="flex items-center justify-between pt-3 border-t border-slate-800">
                            <div>
                                <span class="text-slate-400 text-xs">Estimated Bill Total:</span>
                                <div class="text-2xl font-extrabold text-amber-400 font-digit mt-0.5" id="pos-total-display">৳ 0.00</div>
                            </div>
                            <button type="submit" id="pos-submit-btn" class="btn font-outfit font-bold text-xs py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg rounded-xl border border-emerald-400/30 flex items-center gap-2">
                                <span class="material-symbols-outlined text-sm">check_circle</span> Complete Sale & Bill
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Instant Product Stock Availability Lookup -->
                <div class="card p-5 bg-slate-900 border border-slate-800 shadow-xl rounded-2xl flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-blue-400">search</span>
                                <h3 class="font-bold text-white text-sm font-geist">Instant Stock Lookup</h3>
                            </div>
                        </div>
                        <p class="text-slate-400 text-xs mb-3 font-inter">Quickly verify product stock levels for inquiring customers.</p>
                        
                        <div class="relative mb-3">
                            <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                            <input type="text" id="sales-stock-search" placeholder="Type product name or SKU..." class="form-input pl-9 text-xs py-2 bg-slate-950 border-slate-800 text-white" onkeyup="Dashboard.searchProductStock()">
                        </div>

                        <div id="sales-stock-results" class="space-y-2 max-h-48 overflow-y-auto pr-1">
                            <div class="text-center py-6 text-slate-500 text-xs font-inter">Type to search catalog stock...</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Counter Sales Table -->
            <div class="card shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl overflow-hidden font-jakarta">
                <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-amber-400 text-lg">receipt</span>
                        <h3 class="font-bold text-white text-sm font-geist">Today's Counter Sales Log</h3>
                    </div>
                    <a href="#orders" class="text-xs text-amber-400 hover:text-amber-300 font-bold font-outfit flex items-center gap-1">
                        View All Orders <span class="material-symbols-outlined text-xs">arrow_forward</span>
                    </a>
                </div>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Order Ref</th>
                                <th>Customer Name</th>
                                <th class="text-right">Total Amount</th>
                                <th class="text-center">Status</th>
                                <th class="text-center">Payment Method</th>
                                <th class="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody id="dash-orders-list">
                            <tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs font-inter">Loading sales stream...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await Promise.all([
            this.loadSummary(false),
            this.loadPosProducts()
        ]);
    },

    /* =========================================================================
       3. STAFF ACCOUNTANT PORTAL (Financial Ledger Hub)
       ========================================================================= */
    async renderAccountantPortal(container, user) {
        container.innerHTML = `
            <!-- Accountant Top Banner -->
            <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/80 to-slate-900 p-6 text-white border border-cyan-500/30 shadow-2xl mb-6 font-jakarta">
                <div class="absolute right-0 top-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div>
                        <div class="flex items-center gap-2 mb-2 font-outfit">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center gap-1.5 shadow-inner">
                                <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> Financial & Accounting Control
                            </span>
                            <span class="text-xs text-slate-400 font-digit">Ledger Status: Balanced & Audited</span>
                        </div>
                        <h1 class="text-2xl font-bold tracking-tight text-white font-geist">Financial Ledger & Audit Portal</h1>
                        <p class="text-slate-300 text-xs mt-1 max-w-xl font-inter">Welcome, Staff Accountant <span class="font-semibold text-cyan-300">${user.full_name || user.username}</span>. Audit business treasury accounts, expense outflow, refund settlements, and net margin in real-time.</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2.5 font-outfit">
                        <a href="#expenses" class="btn text-xs font-bold px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg border border-cyan-400/30 flex items-center gap-1.5" onclick="window.App.pendingAction='record_expense'">
                            <span class="material-symbols-outlined text-sm">receipt_long</span> + Record Expense
                        </a>
                        <a href="#reports" class="btn text-xs font-bold px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm text-cyan-400">query_stats</span> Financial Reports
                        </a>
                        <button type="button" class="btn text-xs font-bold px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer" onclick="Dashboard.refreshLive()">
                            <span class="material-symbols-outlined text-sm">sync</span> Sync Ledger
                        </button>
                    </div>
                </div>
            </div>

            <!-- Accountant KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 font-jakarta" id="dash-kpi-container">
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-outfit">Treasury Liquidity</p>
                    <h3 class="text-3xl font-extrabold text-emerald-400 mt-1.5 font-digit font-mono">৳ 0.00</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Active bank & cash reserves</p>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-red-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-red-400 font-outfit">Today's Expense Outflow</p>
                    <h3 class="text-3xl font-extrabold text-red-400 mt-1.5 font-digit font-mono">৳ 0.00</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Recorded business expenses</p>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-cyan-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-cyan-400 font-outfit">Refunds & Returns</p>
                    <h3 class="text-3xl font-extrabold text-cyan-400 mt-1.5 font-digit font-mono">৳ 0.00</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Customer credit settlements</p>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-purple-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-purple-400 font-outfit">Monthly Net Margin</p>
                    <h3 class="text-3xl font-extrabold text-purple-400 mt-1.5 font-digit font-mono">৳ 0.00</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Net profit after expenses</p>
                </div>
            </div>

            <!-- Financial Accounts Breakdown Grid -->
            <div class="mb-6 font-jakarta">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-white text-base font-geist flex items-center gap-2">
                        <span class="material-symbols-outlined text-cyan-400">payments</span> Live Financial Treasury Accounts
                    </h3>
                    <a href="#finance" class="text-xs text-cyan-400 hover:text-cyan-300 font-bold font-outfit flex items-center gap-1">
                        Manage Accounts <span class="material-symbols-outlined text-xs">arrow_forward</span>
                    </a>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="acct-breakdown-container">
                    <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs font-inter">Loading cash accounts...</div>
                </div>
            </div>

            <!-- Recent Orders & Ledger Activity Table -->
            <div class="card shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl overflow-hidden font-jakarta">
                <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-cyan-400 text-lg">account_balance_wallet</span>
                        <h3 class="font-bold text-white text-sm font-geist">Financial Revenue Transactions</h3>
                    </div>
                    <a href="#reports" class="text-xs text-cyan-400 hover:text-cyan-300 font-bold font-outfit flex items-center gap-1">
                        View Full P&L <span class="material-symbols-outlined text-xs">arrow_forward</span>
                    </a>
                </div>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Transaction Ref</th>
                                <th>Client / Customer</th>
                                <th class="text-right">Transaction Amount</th>
                                <th class="text-center">Order Status</th>
                                <th class="text-center">Payment Settlement</th>
                                <th class="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody id="dash-orders-list">
                            <tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs font-inter">Loading ledger stream...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadSummary(false);
    },

    /* =========================================================================
       4. STORE OWNER / ADMIN PORTAL (Executive Command Center)
       ========================================================================= */
    async renderAdminPortal(container, user) {
        const isOwner = (typeof window.isStoreOwner === 'function') ? window.isStoreOwner(user) : (user.username === 'hisham');
        const portalTitle = isOwner ? "Store Owner Executive Command Center" : "Store Administrator Command & Control Hub";
        const portalDesc = isOwner ? `Welcome back, Store Owner <span class="font-semibold text-blue-400">${user.full_name || user.username}</span>. Full real-time business operations overview.` : `Welcome back, Administrator <span class="font-semibold text-blue-400">${user.full_name || user.username}</span>. Operations oversight, staff management, and store execution.`;

        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 font-jakarta">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-white tracking-tight">${portalTitle}</h1>
                    <p class="text-slate-400 text-xs mt-1 font-inter">${portalDesc}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2 font-outfit">
                    <button type="button" class="btn text-xs font-bold px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer" onclick="Dashboard.refreshLive()">
                        <span class="material-symbols-outlined text-sm">refresh</span> Live Refresh
                    </button>
                    <a href="#deliveries" class="btn text-xs font-bold px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200" onclick="window.App.pendingAction='dispatch_delivery'">
                        <span class="material-symbols-outlined text-sm">local_shipping</span> Dispatch Delivery
                    </a>
                    <a href="#expenses" class="btn text-xs font-bold px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200" onclick="window.App.pendingAction='record_expense'">
                        <span class="material-symbols-outlined text-sm">receipt_long</span> Record Expense
                    </a>
                    <a href="#orders" class="btn text-xs font-bold px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg" onclick="window.App.pendingAction='create_order'">
                        <span class="material-symbols-outlined text-sm">add_shopping_cart</span> + New Order
                    </a>
                </div>
            </div>

            <!-- Real-Time KPI Cards Header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 font-jakarta" id="dash-kpi-container">
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-blue-600 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-blue-400 font-outfit">Sales Today</p>
                    <h3 class="text-3xl font-extrabold text-white mt-1.5 font-digit font-mono">৳ 0.00</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">0 orders placed today</p>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-indigo-600 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-indigo-400 font-outfit">Shipments in Transit</p>
                    <h3 class="text-3xl font-extrabold text-indigo-400 mt-1.5 font-digit font-mono">0</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Consignments on the road</p>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-amber-500 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-outfit">Low Stock Alerts</p>
                    <h3 class="text-3xl font-extrabold text-amber-400 mt-1.5 font-digit font-mono">0 SKUs</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Requires reorder stock</p>
                </div>
                <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-600 shadow-xl rounded-2xl">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-outfit">Treasury Liquidity</p>
                    <h3 class="text-3xl font-extrabold text-emerald-400 mt-1.5 font-digit font-mono">৳ 0.00</h3>
                    <p class="text-xs text-slate-400 mt-1 font-inter">Cash & bank reserves</p>
                </div>
            </div>

            <!-- Financial Performance Strip (MTD) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 font-jakarta" id="dash-mtd-container">
                <div class="card p-5 bg-slate-900 text-white shadow-xl border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                        <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Monthly Revenue (MTD)</p>
                        <h4 class="text-2xl font-bold text-emerald-400 mt-1 font-digit" id="mtd-rev">৳ 0.00</h4>
                    </div>
                    <span class="material-symbols-outlined text-3xl text-emerald-500/30">trending_up</span>
                </div>
                <div class="card p-5 bg-slate-900 text-white shadow-xl border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                        <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Monthly Expenses (MTD)</p>
                        <h4 class="text-2xl font-bold text-red-400 mt-1 font-digit" id="mtd-exp">৳ 0.00</h4>
                    </div>
                    <span class="material-symbols-outlined text-3xl text-red-500/30">trending_down</span>
                </div>
                <div class="card p-5 bg-slate-900 text-white shadow-xl border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                        <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Net Profit Position (MTD)</p>
                        <h4 class="text-2xl font-bold text-blue-400 mt-1 font-digit" id="mtd-profit">৳ 0.00</h4>
                    </div>
                    <span class="material-symbols-outlined text-3xl text-blue-500/30">account_balance_wallet</span>
                </div>
            </div>

            <!-- Charts & Operational Health Section -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 font-jakarta">
                <!-- 30-Day Revenue & Profit Performance Chart -->
                <div class="card lg:col-span-2 shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl">
                    <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-500">bar_chart</span>
                            <h3 class="font-bold text-white text-sm font-geist">30-Day Revenue & Profit Performance</h3>
                        </div>
                        <span class="text-xs text-slate-400 font-medium font-inter">Daily Inflow Trend</span>
                    </div>
                    <div class="p-6">
                        <div class="overflow-x-auto pb-6 scrollbar-thin select-none">
                            <div class="h-64 flex items-end justify-start gap-2 border-b border-slate-800 pb-4 relative min-w-full" id="dash-chart">
                                <div class="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">Loading analytics chart data...</div>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row justify-between items-center mt-3 text-xs font-semibold text-slate-300 border-t border-slate-800 pt-3 gap-2 font-outfit">
                            <div class="flex gap-6">
                                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded bg-blue-600"></div> Total Revenue</div>
                                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded bg-emerald-500"></div> Gross Profit</div>
                            </div>
                            <div class="text-[11px] text-slate-400 font-medium italic flex items-center gap-1 font-inter">
                                <span class="material-symbols-outlined text-xs text-blue-400">swap_horiz</span> Scroll left & right to view dates
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Operational Alerts & System Health -->
                <div class="card shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl flex flex-col overflow-hidden">
                    <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-400">notifications_active</span>
                            <h3 class="font-bold text-white text-sm font-geist">System Health & Live Alerts</h3>
                        </div>
                    </div>
                    <div class="p-0 flex-1 overflow-y-auto max-h-80">
                        <ul class="divide-y divide-slate-800/80" id="dash-alerts">
                            <li class="p-4 text-center text-slate-400 text-xs">Checking system health...</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Recent Sales Orders -->
            <div class="card shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl overflow-hidden font-jakarta">
                <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-slate-400">receipt_long</span>
                        <h3 class="font-bold text-white text-sm font-geist">Recent Store Sales Orders</h3>
                    </div>
                    <button class="text-xs text-blue-400 hover:text-blue-300 font-bold font-outfit flex items-center gap-0.5" onclick="window.App.navigate('orders')">
                        View All Orders <span class="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Order # & Timestamp</th>
                                <th>Customer Name</th>
                                <th class="text-right">Total Amount</th>
                                <th class="text-center">Order Status</th>
                                <th class="text-center">Payment Status</th>
                                <th class="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody id="dash-orders-list">
                            <tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">Loading recent orders...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await Promise.all([
            this.loadSummary(false),
            this.loadChart()
        ]);
    },

    /* =========================================================================
       SUMMARY DATA LOADER & DOM UPDATER
       ========================================================================= */
    async loadSummary(silent = false) {
        try {
            const res = await API.get('dashboard/summary');
            const s = (res && res.data && res.data.summary) ? res.data.summary : {};
            this.currentSummaryData = s;

            const currentUser = API.getCurrentUser() || {};
            const role = this.normalizeRole(currentUser.role);

            // Render KPI Container based on role
            const container = document.getElementById('dash-kpi-container');
            if (container) {
                if (role === 'manager') {
                    container.innerHTML = `
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-amber-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-outfit">Urgent Low Stock</p>
                            <h3 class="text-3xl font-extrabold text-amber-400 mt-1.5 font-digit font-mono">${s.low_stock_items || 0} SKUs</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Stock level ≤ 10 units</p>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-blue-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-blue-400 font-outfit">Pending Orders</p>
                            <h3 class="text-3xl font-extrabold text-blue-400 mt-1.5 font-digit font-mono">${s.orders_pending || 0}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Awaiting dispatch fulfillment</p>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-indigo-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-indigo-400 font-outfit">Active Consignments</p>
                            <h3 class="text-3xl font-extrabold text-indigo-400 mt-1.5 font-digit font-mono">${s.active_deliveries || 0}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">In transit to customers</p>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-outfit">Today's Store Turnover</p>
                            <h3 class="text-3xl font-extrabold text-emerald-400 mt-1.5 font-digit font-mono">${UI.formatMoney(s.total_sales_today || 0)}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">${s.sales_today_count || 0} counter transactions</p>
                        </div>
                    `;
                } else if (role === 'sales') {
                    const goal = 50000;
                    const pct = Math.min(Math.round(((s.total_sales_today || 0) / goal) * 100), 100);

                    container.innerHTML = `
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-amber-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-outfit">My Sales Volume Today</p>
                            <h3 class="text-3xl font-extrabold text-amber-400 mt-1.5 font-digit font-mono">${UI.formatMoney(s.total_sales_today || 0)}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Total sales volume today</p>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-outfit">Transactions Handled</p>
                            <h3 class="text-3xl font-extrabold text-emerald-400 mt-1.5 font-digit font-mono">${s.sales_today_count || 0}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Orders billed at counter</p>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-blue-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-blue-400 font-outfit">Daily Goal Progress</p>
                            <h3 class="text-3xl font-extrabold text-blue-400 mt-1.5 font-digit font-mono">${pct}%</h3>
                            <div class="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div class="bg-blue-500 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                            </div>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-indigo-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-indigo-400 font-outfit">Deliveries in Transit</p>
                            <h3 class="text-3xl font-extrabold text-indigo-400 mt-1.5 font-digit font-mono">${s.active_deliveries || 0}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Active customer dispatches</p>
                        </div>
                    `;
                } else if (role === 'accountant') {
                    container.innerHTML = `
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-outfit">Treasury Liquidity</p>
                            <h3 class="text-3xl font-extrabold text-emerald-400 mt-1.5 font-digit font-mono">${UI.formatMoney(s.total_cash || 0)}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Active bank & cash reserves</p>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-red-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-red-400 font-outfit">Today's Expense Outflow</p>
                            <h3 class="text-3xl font-extrabold text-red-400 mt-1.5 font-digit font-mono">${UI.formatMoney(s.today_expenses || 0)}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Recorded business expenses</p>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-cyan-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-cyan-400 font-outfit">Refunds & Returns</p>
                            <h3 class="text-3xl font-extrabold text-cyan-400 mt-1.5 font-digit font-mono">${UI.formatMoney(s.today_returns || 0)}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Customer credit settlements</p>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-purple-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-purple-400 font-outfit">Monthly Net Margin</p>
                            <h3 class="text-3xl font-extrabold text-purple-400 mt-1.5 font-digit font-mono">${UI.formatMoney(s.monthly_net_profit || 0)}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Net profit after expenses</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-blue-600 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-blue-400 font-outfit">Sales Today</p>
                            <h3 class="text-3xl font-extrabold text-white mt-1.5 font-digit font-mono">${UI.formatMoney(s.total_sales_today || 0)}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">${s.sales_today_count || 0} orders placed today</p>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-indigo-600 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-indigo-400 font-outfit">Shipments in Transit</p>
                            <h3 class="text-3xl font-extrabold text-indigo-400 mt-1.5 font-digit font-mono">${s.active_deliveries || 0}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Consignments on the road</p>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-amber-500 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-outfit">Low Stock Alerts</p>
                            <h3 class="text-3xl font-extrabold text-amber-400 mt-1.5 font-digit font-mono">${s.low_stock_items || 0} SKUs</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Requires reorder stock</p>
                        </div>
                        <div class="card p-5 bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-600 shadow-xl rounded-2xl">
                            <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-outfit">Treasury Liquidity</p>
                            <h3 class="text-3xl font-extrabold text-emerald-400 mt-1.5 font-digit font-mono">${UI.formatMoney(s.total_cash || 0)}</h3>
                            <p class="text-xs text-slate-400 mt-1 font-inter">Cash & bank reserves</p>
                        </div>
                    `;
                }
            }

            // Manager Low Stock Table Render
            const lowStockTbody = document.getElementById('mgr-low-stock-list');
            if (lowStockTbody) {
                const list = s.low_stock_list || [];
                if (list.length === 0) {
                    lowStockTbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs font-inter">All inventory products are well stocked!</td></tr>`;
                } else {
                    lowStockTbody.innerHTML = list.map(item => `
                        <tr class="hover:bg-slate-800/50 transition-colors">
                            <td class="font-bold text-xs text-white py-3 font-jakarta">${item.name}</td>
                            <td class="font-mono text-xs text-slate-400 py-3 font-digit">${item.sku || '-'}</td>
                            <td class="text-center font-bold text-xs text-red-400 py-3 font-digit">${item.current_stock || 0} units</td>
                            <td class="text-center font-mono text-xs text-slate-400 py-3 font-digit">${item.reorder_level || 5} units</td>
                            <td class="text-right py-3">
                                <a href="#suppliers" class="btn text-[11px] py-1 px-3 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 font-outfit font-bold rounded-lg">
                                    Restock
                                </a>
                            </td>
                        </tr>
                    `).join('');
                }
            }

            // Accountant Accounts Breakdown Grid Render
            const acctContainer = document.getElementById('acct-breakdown-container');
            if (acctContainer) {
                const accts = s.accounts_breakdown || [];
                if (accts.length === 0) {
                    acctContainer.innerHTML = `<div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs font-inter">No active financial accounts configured.</div>`;
                } else {
                    const icons = { 'cash': 'payments', 'bank': 'account_balance', 'mobile_banking': 'smartphone' };
                    acctContainer.innerHTML = accts.map(a => `
                        <div class="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl hover:border-cyan-500/40 transition-all">
                            <div class="flex items-center justify-between text-slate-400 mb-2">
                                <span class="material-symbols-outlined text-cyan-400 text-xl">${icons[a.type] || 'account_balance_wallet'}</span>
                                <span class="text-[10px] font-bold uppercase tracking-wider font-outfit text-slate-400">${a.type.replace('_', ' ')}</span>
                            </div>
                            <div class="text-xs font-bold text-white font-jakarta truncate">${a.name}</div>
                            <div class="text-lg font-extrabold text-cyan-300 mt-1 font-digit">${UI.formatMoney(a.current_balance || 0)}</div>
                        </div>
                    `).join('');
                }
            }

            // Render Financial MTD Strip (for Admin)
            const mtdRev = document.getElementById('mtd-rev');
            const mtdExp = document.getElementById('mtd-exp');
            const mtdProfit = document.getElementById('mtd-profit');

            if (mtdRev) mtdRev.textContent = UI.formatMoney(s.monthly_revenue || 0);
            if (mtdExp) mtdExp.textContent = `-${UI.formatMoney(s.monthly_expenses || 0)}`;
            if (mtdProfit) {
                mtdProfit.textContent = UI.formatMoney(s.monthly_net_profit || 0);
                mtdProfit.className = `text-2xl font-extrabold mt-1 font-digit ${(s.monthly_net_profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
            }

            // Render System Health Alerts
            const alertsUl = document.getElementById('dash-alerts');
            if (alertsUl) {
                alertsUl.innerHTML = (s.alerts || []).map(a => `
                    <li class="p-3.5 flex items-start gap-3 hover:bg-slate-800/40 transition border-b border-slate-800/80 last:border-none">
                        <span class="material-symbols-outlined ${a.color} text-lg flex-shrink-0 mt-0.5">${a.icon}</span>
                        <div class="text-xs text-slate-300 font-inter leading-relaxed">${a.text}</div>
                    </li>
                `).join('');
            }

            // Render Recent Orders Stream
            const tbody = document.getElementById('dash-orders-list');
            if (tbody) {
                const orders = s.recent_orders || [];
                if (orders.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs font-inter">No orders recorded in store stream.</td></tr>`;
                    return;
                }

                const getStatusBadge = (st) => {
                    const colors = {
                        'delivered': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                        'in_transit': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                        'returned': 'bg-red-500/20 text-red-300 border-red-500/30',
                        'cancelled': 'bg-slate-800 text-slate-400 border-slate-700',
                        'pending': 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    };
                    return colors[st] || 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                };

                tbody.innerHTML = orders.map(o => `
                    <tr class="hover:bg-slate-800/50 transition-colors text-xs font-jakarta">
                        <td class="py-3">
                            <div class="font-bold text-white font-digit">${o.order_no || ('#ORD-' + o.id)}</div>
                            <div class="text-[11px] text-slate-400 font-digit">${UI.formatDate(o.created_at)}</div>
                        </td>
                        <td class="font-semibold text-slate-200 py-3">${o.customer_name}</td>
                        <td class="text-right font-extrabold text-emerald-400 font-digit py-3">${UI.formatMoney(o.total_amount)}</td>
                        <td class="text-center py-3">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-outfit uppercase border ${getStatusBadge(o.order_status)}">
                                ${(o.order_status || 'placed').replace(/_/g, ' ')}
                            </span>
                        </td>
                        <td class="text-center py-3">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-outfit uppercase border ${
                                o.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }">${o.payment_status || 'unpaid'}</span>
                        </td>
                        <td class="text-right py-3">
                            <button class="btn text-[11px] py-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-outfit font-bold rounded-lg cursor-pointer" onclick="window.App.navigate('orders')">
                                Manage Order
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

        } catch (e) {
            console.error('Failed to load dashboard summary', e);
        }
    },

    async loadChart() {
        try {
            const res = await API.get('dashboard/revenue_chart?days=30');
            const data = res.data?.chart || [];
            const container = document.getElementById('dash-chart');
            if (!container) return;

            const maxRev = Math.max(...data.map(d => d.revenue), 100);
            const minWidth = Math.max(900, data.length * 34);
            container.style.minWidth = `${minWidth}px`;

            container.innerHTML = data.map((d) => {
                const revHeight = d.revenue > 0 ? Math.min(Math.max((d.revenue / maxRev) * 100, 15), 100) : 4;
                const profHeight = d.profit > 0 ? Math.min(Math.max((d.profit / maxRev) * 100, 10), 100) : 2;

                const dateObj = d.date ? new Date(d.date) : null;
                const label = d.label || (dateObj && !isNaN(dateObj.getTime()) ? `${dateObj.getDate()}/${dateObj.getMonth()+1}` : '');

                return `
                    <div class="flex flex-col justify-end items-center h-full flex-1 group relative min-w-[28px]">
                        <div class="absolute bottom-full mb-2 bg-slate-950 border border-slate-800 text-white text-[10px] py-1.5 px-2.5 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 transition-opacity font-jakarta">
                            <div class="font-bold text-slate-300 mb-0.5 font-digit">${d.date}</div>
                            <div>Revenue: <span class="font-bold text-blue-400 font-digit">৳ ${UI.formatMoney(d.revenue)}</span></div>
                            <div>Profit: <span class="font-bold text-emerald-400 font-digit">৳ ${UI.formatMoney(d.profit)}</span></div>
                        </div>

                        <div class="w-full max-w-[18px] flex flex-col justify-end items-center h-48 gap-0.5">
                            <div class="w-full ${d.revenue > 0 ? 'bg-blue-600' : 'bg-slate-800'} rounded-t-sm transition-all" style="height: ${revHeight}%"></div>
                            <div class="w-full ${d.profit > 0 ? 'bg-emerald-500' : 'bg-slate-800/60'} rounded-t-sm transition-all" style="height: ${profHeight}%"></div>
                        </div>

                        <span class="absolute -bottom-6 text-[10px] text-slate-400 font-mono font-medium tracking-tighter whitespace-nowrap font-digit">${label}</span>
                    </div>
                `;
            }).join('');

        } catch (e) {
            const container = document.getElementById('dash-chart');
            if (container) {
                container.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-red-400 text-xs">Failed to load analytics chart data</div>`;
            }
        }
    },

    /* =========================================================================
       SALES POS POS MODULE HELPERS
       ========================================================================= */
    posProducts: [],

    async loadPosProducts() {
        try {
            const res = await API.get('products/list');
            const prods = res.data?.products || [];
            this.posProducts = prods;

            const select = document.getElementById('pos-product-select');
            if (!select) return;

            select.innerHTML = '<option value="">-- Choose Product --</option>' + prods.map(p => `
                <option value="${p.id}" data-price="${p.selling_price || 0}" data-stock="${p.current_stock || 0}">
                    ${p.name} (Stock: ${p.current_stock || 0}) — ৳ ${UI.formatMoney(p.selling_price || 0)}
                </option>
            `).join('');
        } catch (e) {}
    },

    updatePosPrice() {
        const select = document.getElementById('pos-product-select');
        const qtyInput = document.getElementById('pos-qty');
        const display = document.getElementById('pos-total-display');
        if (!select || !qtyInput || !display) return;

        const opt = select.options[select.selectedIndex];
        if (!opt || !opt.value) {
            display.textContent = '৳ 0.00';
            return;
        }

        const price = parseFloat(opt.getAttribute('data-price') || 0);
        const qty = parseInt(qtyInput.value || 1);
        const total = price * qty;
        display.textContent = `৳ ${UI.formatMoney(total)}`;
    },

    searchProductStock() {
        const query = (document.getElementById('sales-stock-search')?.value || '').toLowerCase().trim();
        const container = document.getElementById('sales-stock-results');
        if (!container) return;

        if (!query) {
            container.innerHTML = `<div class="text-center py-6 text-slate-500 text-xs font-inter">Type to search catalog stock...</div>`;
            return;
        }

        const matches = this.posProducts.filter(p => 
            (p.name || '').toLowerCase().includes(query) || 
            (p.sku || '').toLowerCase().includes(query)
        );

        if (matches.length === 0) {
            container.innerHTML = `<div class="text-center py-4 text-slate-400 text-xs font-inter">No matching products found.</div>`;
            return;
        }

        container.innerHTML = matches.map(p => `
            <div class="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-jakarta">
                <div>
                    <div class="font-bold text-white">${p.name}</div>
                    <div class="text-[11px] text-slate-400 font-digit">SKU: ${p.sku || 'N/A'} • ৳ ${UI.formatMoney(p.selling_price || 0)}</div>
                </div>
                <div class="text-right">
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-bold font-digit ${ (p.current_stock || 0) > 5 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                        ${p.current_stock || 0} in stock
                    </span>
                </div>
            </div>
        `).join('');
    },

    async handleQuickPosSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('pos-submit-btn');
        const prodSelect = document.getElementById('pos-product-select');
        const qtyInput = document.getElementById('pos-qty');
        const custName = document.getElementById('pos-customer-name').value.trim() || 'Walk-in Customer';
        const custPhone = document.getElementById('pos-customer-phone').value.trim() || '01700000000';
        const payMethod = document.getElementById('pos-payment-method').value;

        const prodId = prodSelect.value;
        const qty = parseInt(qtyInput.value || 1);

        if (!prodId) {
            UI.toast('Please select a product for sale', 'error');
            return;
        }

        const opt = prodSelect.options[prodSelect.selectedIndex];
        const unitPrice = parseFloat(opt.getAttribute('data-price') || 0);

        try {
            if (btn) { btn.disabled = true; btn.textContent = 'Processing Sale...'; }

            // 1. Create or fetch customer
            let customerId = 1;
            try {
                const cRes = await API.request('customers/create', 'POST', { name: custName, phone: custPhone });
                if (cRes && cRes.data && cRes.data.id) customerId = cRes.data.id;
            } catch(err) {}

            // 2. Create Order
            const orderPayload = {
                customer_id: customerId,
                items: [
                    { product_id: parseInt(prodId), quantity: qty, unit_price: unitPrice }
                ],
                discount: 0,
                tax: 0,
                payment_method: payMethod,
                paid_amount: unitPrice * qty,
                notes: 'Counter Sales POS Terminal Entry'
            };

            const oRes = await API.request('orders/create', 'POST', orderPayload);
            if (oRes && oRes.success !== false) {
                UI.toast('Counter Sale Completed Successfully!', 'success');
                document.getElementById('sales-pos-form')?.reset();
                this.updatePosPrice();
                await this.loadSummary(false);
                await this.loadPosProducts();
            } else {
                UI.toast(oRes?.message || 'Sale failed to record', 'error');
            }
        } catch(err) {
            UI.toast('Failed to record counter sale', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = `<span class="material-symbols-outlined text-sm">check_circle</span> Complete Sale & Bill`; }
        }
    },

    showQuickPosModal() {
        const formEl = document.getElementById('sales-pos-form');
        if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth' });
            document.getElementById('pos-product-select')?.focus();
        }
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'dashboard') {
    window.Dashboard.render(document.getElementById('screen-container'));
}
