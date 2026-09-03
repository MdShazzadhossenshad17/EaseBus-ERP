/**
 * EaseBus — Role-Decorated Real-Time Portals Controller
 * Supports: Store Owner (Admin), Store Manager (Operations Hub), 
 * Sales Representative (POS Terminal), Staff Accountant (Financial Ledger Hub)
 */

window.Dashboard = {
    liveTimer: null,
    currentSummaryData: null,
    monthlyChartInstance: null,
    categoryChartInstance: null,
    timeframe: 12,
    metricView: 'revenue',
    activeViewMode: 'chart',
    cachedMonthlyTrends: null,

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

        // Render Quick Action Floating Menu on Dashboard
        this.renderQuickActionMenu(container);

        // Start 10-second real-time auto polling
        this.startLivePolling();
    },

    _dataChangeListener: null,

    startLivePolling() {
        this.stopLivePolling();

        // 1. Instant event-driven reactive sync
        if (!this._dataChangeListener) {
            this._dataChangeListener = (e) => {
                if (window.App && window.App.currentRoute === 'dashboard') {
                    if (this._debounceTimer) clearTimeout(this._debounceTimer);
                    this._debounceTimer = setTimeout(() => {
                        this.loadSummary(true);
                    }, 50);
                }
            };
            window.addEventListener('easebus:data-changed', this._dataChangeListener);
        }

        // 2. Battery & CPU friendly polling interval
        this.liveTimer = setInterval(async () => {
            if (window.App && window.App.currentRoute === 'dashboard' && !document.hidden) {
                await this.loadSummary(true);
            } else if (window.App && window.App.currentRoute !== 'dashboard') {
                this.stopLivePolling();
            }
        }, 12000);
    },

    stopLivePolling() {
        if (this.liveTimer) {
            clearInterval(this.liveTimer);
            this.liveTimer = null;
        }
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
        if (this._dataChangeListener) {
            window.removeEventListener('easebus:data-changed', this._dataChangeListener);
            this._dataChangeListener = null;
        }
        // Cleanup floating menu and modal if not on dashboard
        if (window.App && window.App.currentRoute !== 'dashboard') {
            const fab = document.getElementById('dash-fab-container');
            if (fab) fab.remove();
            this.closeQuickModal();
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

            <!-- Quick Snapshot Section (Operations) -->
            <section id="quick-snapshot-section" class="mb-6 font-jakarta">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                            <span class="material-symbols-outlined text-lg">speed</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-base font-bold text-white tracking-tight font-geist">Quick Snapshot</h2>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-outfit uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Operations Velocity</span>
                            </div>
                            <p class="text-xs text-slate-400 font-inter">Live operational summary of total sales turnover, pending orders, consignments, and urgent stock</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 self-start sm:self-auto">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Live Shift</span>
                        </span>
                        <button type="button" onclick="Dashboard.refreshLive()" class="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap" title="Refresh Live Snapshot">
                            <span class="material-symbols-outlined text-sm">sync</span> Refresh
                        </button>
                    </div>
                </div>

                <!-- Visually Appealing Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dash-kpi-container">
                    <!-- Cards will be populated by Dashboard.renderQuickSnapshotGrid -->
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-24 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-36 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                </div>
            </section>

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

            <!-- 1. Manager Current Month Daily Sales Trends (Firestore Live Line Chart) -->
            <div class="card shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl mb-6 font-jakarta overflow-hidden" id="dash-daily-trends-container">
                <div class="p-5 border-b border-slate-800 bg-slate-950/70 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                            <span class="material-symbols-outlined text-xl">show_chart</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-white text-base font-geist">Daily Sales Trends (Current Month)</h3>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-outfit" id="daily-firestore-badge">
                                    <span class="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse mr-1"></span> Firestore Orders
                                </span>
                            </div>
                            <p class="text-xs text-slate-400 mt-0.5 font-inter">Live day-by-day revenue velocity & gross profit trajectory from Firestore</p>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-3">
                        <div class="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 font-outfit" id="daily-chart-metric-filters">
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-white bg-cyan-600 shadow-sm" id="btn-daily-metric-revenue" onclick="Dashboard.setDailyMetricView('revenue')">
                                Revenue & Profit
                            </button>
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white" id="btn-daily-metric-orders" onclick="Dashboard.setDailyMetricView('orders')">
                                Orders Volume
                            </button>
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white" id="btn-daily-metric-aov" onclick="Dashboard.setDailyMetricView('aov')">
                                Avg Ticket (AOV)
                            </button>
                        </div>

                        <div class="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 font-outfit">
                            <button type="button" class="px-2 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" title="Previous Month" onclick="Dashboard.changeDailyTrendsMonth(-1)">
                                <span class="material-symbols-outlined text-xs">chevron_left</span>
                            </button>
                            <span class="px-2 text-xs font-bold text-slate-200 font-digit" id="daily-chart-month-label">Current Month</span>
                            <button type="button" class="px-2 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" title="Next Month" onclick="Dashboard.changeDailyTrendsMonth(1)">
                                <span class="material-symbols-outlined text-xs">chevron_right</span>
                            </button>
                        </div>

                        <button type="button" class="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 shadow-sm transition-all font-outfit cursor-pointer" id="btn-sync-daily-firestore" onclick="Dashboard.syncDailySalesFromFirestore()">
                            <span class="material-symbols-outlined text-xs text-cyan-400" id="sync-daily-icon">sync</span> Sync Firestore
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-950/40 border-b border-slate-800" id="dash-daily-kpis">
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Current Month Total Sales</div>
                        <div class="text-xl font-bold text-white mt-1 font-digit" id="daily-kpi-month-rev">৳ 0.00</div>
                        <div class="text-[11px] text-cyan-400 mt-1 font-inter" id="daily-kpi-month-orders">0 orders in Firestore</div>
                    </div>
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Daily Run Rate / Avg</div>
                        <div class="text-xl font-bold text-cyan-400 mt-1 font-digit" id="daily-kpi-avg-rev">৳ 0.00 / day</div>
                        <div class="text-[11px] text-slate-400 mt-1 font-inter" id="daily-kpi-avg-orders">Avg ~0 orders/day</div>
                    </div>
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Peak Sales Day</div>
                        <div class="text-xl font-bold text-amber-400 mt-1 font-digit" id="daily-kpi-peak-day">—</div>
                        <div class="text-[11px] text-slate-400 mt-1 font-inter" id="daily-kpi-peak-val">Max daily spike</div>
                    </div>
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Today's Live Sales</div>
                        <div class="text-xl font-bold text-emerald-400 mt-1 font-digit" id="daily-kpi-today-rev">৳ 0.00</div>
                        <div class="text-[11px] text-slate-400 mt-1 font-inter" id="daily-kpi-today-orders">0 transactions today</div>
                    </div>
                </div>

                <div class="p-5">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300 font-outfit" id="daily-chart-title">
                                Day-by-Day Sales Trajectory (Current Month)
                            </h4>
                        </div>
                        <div class="flex items-center gap-4 text-xs font-medium font-outfit" id="daily-chart-legend-custom">
                            <div class="flex items-center gap-1.5 text-cyan-400"><span class="w-3 h-0.5 bg-cyan-400 inline-block"></span> Daily Sales Revenue (৳)</div>
                            <div class="flex items-center gap-1.5 text-emerald-400"><span class="w-3 h-0.5 bg-emerald-400 inline-block"></span> Daily Gross Profit (৳)</div>
                        </div>
                    </div>

                    <div class="relative w-full h-80 sm:h-96 bg-slate-950/60 rounded-xl border border-slate-800/70 p-3">
                        <canvas id="daily-sales-line-chart-canvas"></canvas>
                        <div id="daily-sales-chart-loader" class="hidden absolute inset-0 bg-slate-950/80 rounded-xl flex items-center justify-center text-cyan-400 text-xs font-outfit gap-2">
                            <span class="material-symbols-outlined animate-spin text-lg">sync</span> Querying Firestore orders collection...
                        </div>
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
        await this.loadChart();
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

            <!-- Quick Snapshot Section (Sales Counter) -->
            <section id="quick-snapshot-section" class="mb-6 font-jakarta">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <span class="material-symbols-outlined text-lg">speed</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-base font-bold text-white tracking-tight font-geist">Quick Snapshot</h2>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-outfit uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">Counter Velocity</span>
                            </div>
                            <p class="text-xs text-slate-400 font-inter">Live customer counter sales, orders handled, pending queue, and daily target pacing</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 self-start sm:self-auto">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Live Shift</span>
                        </span>
                        <button type="button" onclick="Dashboard.refreshLive()" class="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap" title="Refresh Live Snapshot">
                            <span class="material-symbols-outlined text-sm">sync</span> Refresh
                        </button>
                    </div>
                </div>

                <!-- Visually Appealing Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dash-kpi-container">
                    <!-- Cards will be populated by Dashboard.renderQuickSnapshotGrid -->
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-24 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-36 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                </div>
            </section>

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

            <!-- Quick Snapshot Section (Financial Audit) -->
            <section id="quick-snapshot-section" class="mb-6 font-jakarta">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                            <span class="material-symbols-outlined text-lg">speed</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-base font-bold text-white tracking-tight font-geist">Quick Snapshot</h2>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-outfit uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Ledger Velocity</span>
                            </div>
                            <p class="text-xs text-slate-400 font-inter">Live operational summary of total sales inflow, pending receivables, treasury liquidity, and expenses</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 self-start sm:self-auto">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Live Ledger</span>
                        </span>
                        <button type="button" onclick="Dashboard.refreshLive()" class="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap" title="Refresh Live Snapshot">
                            <span class="material-symbols-outlined text-sm">sync</span> Refresh
                        </button>
                    </div>
                </div>

                <!-- Visually Appealing Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dash-kpi-container">
                    <!-- Cards will be populated by Dashboard.renderQuickSnapshotGrid -->
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-24 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-36 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                </div>
            </section>

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
       4. STORE OWNER & ADMINISTRATOR PORTAL (Executive Command Center)
       ========================================================================= */
    async renderAdminPortal(container, user) {
        const isOwner = (typeof window.isStoreOwner === 'function') ? window.isStoreOwner(user) : (user.role === 'admin' || user.role === 'owner' || user.role === 'creator');
        const portalTitle = "Store Owner Executive & Administrative Command Center";
        const portalDesc = `Welcome back, Store Owner <span class="font-semibold text-blue-400">${user.full_name || user.username}</span>. Full real-time business operations overview, financial control, and staff governance.`;

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

            <!-- Quick Snapshot Section -->
            <section id="quick-snapshot-section" class="mb-6 font-jakarta">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <span class="material-symbols-outlined text-lg">speed</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-base font-bold text-white tracking-tight font-geist">Quick Snapshot</h2>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-outfit uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">Executive Overview</span>
                            </div>
                            <p class="text-xs text-slate-400 font-inter">Real-time operational velocity across total sales, pending orders pipeline, and fulfillment</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 self-start sm:self-auto">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Live Sync</span>
                        </span>
                        <button type="button" onclick="Dashboard.refreshLive()" class="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap" title="Refresh Live Snapshot">
                            <span class="material-symbols-outlined text-sm">sync</span> Refresh
                        </button>
                    </div>
                </div>

                <!-- Visually Appealing Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dash-kpi-container">
                    <!-- Cards will be populated by Dashboard.renderQuickSnapshotGrid -->
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-24 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-36 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                    <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg animate-pulse">
                        <div class="h-4 w-28 bg-slate-800 rounded mb-3"></div>
                        <div class="h-8 w-24 bg-slate-800 rounded mb-2"></div>
                        <div class="h-3 w-40 bg-slate-800 rounded"></div>
                    </div>
                </div>
            </section>

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

            <!-- 1. Current Month Daily Sales Trends (Firestore Live Line Chart) -->
            <div class="card shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl mb-6 font-jakarta overflow-hidden" id="dash-daily-trends-container">
                <!-- Section Header with Controls -->
                <div class="p-5 border-b border-slate-800 bg-slate-950/70 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                            <span class="material-symbols-outlined text-xl">show_chart</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-white text-base font-geist">Daily Sales Trends (Current Month)</h3>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-outfit" id="daily-firestore-badge">
                                    <span class="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse mr-1"></span> Firestore Orders
                                </span>
                            </div>
                            <p class="text-xs text-slate-400 mt-0.5 font-inter">Live day-by-day revenue velocity, daily transactions & gross profit margin curve from Firestore</p>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-3">
                        <!-- Metric Filter Buttons -->
                        <div class="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 font-outfit" id="daily-chart-metric-filters">
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-white bg-cyan-600 shadow-sm" id="btn-daily-metric-revenue" onclick="Dashboard.setDailyMetricView('revenue')">
                                Revenue & Profit
                            </button>
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white" id="btn-daily-metric-orders" onclick="Dashboard.setDailyMetricView('orders')">
                                Orders Volume
                            </button>
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white" id="btn-daily-metric-aov" onclick="Dashboard.setDailyMetricView('aov')">
                                Avg Ticket (AOV)
                            </button>
                        </div>

                        <!-- Month Navigator -->
                        <div class="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 font-outfit">
                            <button type="button" class="px-2 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" title="Previous Month" onclick="Dashboard.changeDailyTrendsMonth(-1)">
                                <span class="material-symbols-outlined text-xs">chevron_left</span>
                            </button>
                            <span class="px-2 text-xs font-bold text-slate-200 font-digit" id="daily-chart-month-label">Current Month</span>
                            <button type="button" class="px-2 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" title="Next Month" onclick="Dashboard.changeDailyTrendsMonth(1)">
                                <span class="material-symbols-outlined text-xs">chevron_right</span>
                            </button>
                        </div>

                        <!-- Firestore Live Sync Button -->
                        <button type="button" class="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 shadow-sm transition-all font-outfit cursor-pointer" id="btn-sync-daily-firestore" onclick="Dashboard.syncDailySalesFromFirestore()">
                            <span class="material-symbols-outlined text-xs text-cyan-400" id="sync-daily-icon">sync</span> Sync Firestore
                        </button>
                    </div>
                </div>

                <!-- Daily Performance KPI Highlights Ribbon -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-950/40 border-b border-slate-800" id="dash-daily-kpis">
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Current Month Total Sales</div>
                        <div class="text-xl font-bold text-white mt-1 font-digit" id="daily-kpi-month-rev">৳ 0.00</div>
                        <div class="text-[11px] text-cyan-400 mt-1 font-inter" id="daily-kpi-month-orders">0 orders in Firestore</div>
                    </div>
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Daily Run Rate / Avg</div>
                        <div class="text-xl font-bold text-cyan-400 mt-1 font-digit" id="daily-kpi-avg-rev">৳ 0.00 / day</div>
                        <div class="text-[11px] text-slate-400 mt-1 font-inter" id="daily-kpi-avg-orders">Avg ~0 orders/day</div>
                    </div>
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Peak Sales Day</div>
                        <div class="text-xl font-bold text-amber-400 mt-1 font-digit" id="daily-kpi-peak-day">—</div>
                        <div class="text-[11px] text-slate-400 mt-1 font-inter" id="daily-kpi-peak-val">Max daily spike</div>
                    </div>
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Today's Live Sales</div>
                        <div class="text-xl font-bold text-emerald-400 mt-1 font-digit" id="daily-kpi-today-rev">৳ 0.00</div>
                        <div class="text-[11px] text-slate-400 mt-1 font-inter" id="daily-kpi-today-orders">0 transactions today</div>
                    </div>
                </div>

                <!-- Daily Chart.js Line Canvas Panel -->
                <div class="p-5">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300 font-outfit" id="daily-chart-title">
                                Day-by-Day Sales Trajectory (Current Month)
                            </h4>
                        </div>
                        <div class="flex items-center gap-4 text-xs font-medium font-outfit" id="daily-chart-legend-custom">
                            <div class="flex items-center gap-1.5 text-cyan-400"><span class="w-3 h-0.5 bg-cyan-400 inline-block"></span> Daily Sales Revenue (৳)</div>
                            <div class="flex items-center gap-1.5 text-emerald-400"><span class="w-3 h-0.5 bg-emerald-400 inline-block"></span> Daily Gross Profit (৳)</div>
                        </div>
                    </div>

                    <!-- Canvas Container with high responsiveness -->
                    <div class="relative w-full h-80 sm:h-96 bg-slate-950/60 rounded-xl border border-slate-800/70 p-3">
                        <canvas id="daily-sales-line-chart-canvas"></canvas>
                        <div id="daily-sales-chart-loader" class="hidden absolute inset-0 bg-slate-950/80 rounded-xl flex items-center justify-center text-cyan-400 text-xs font-outfit gap-2">
                            <span class="material-symbols-outlined animate-spin text-lg">sync</span> Querying Firestore orders collection...
                        </div>
                    </div>
                </div>
            </div>

            <!-- Monthly Sales Performance Trends & Analytics Section -->
            <div class="card shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl mb-6 font-jakarta overflow-hidden" id="dash-trends-container">
                <!-- Section Header with Controls -->
                <div class="p-5 border-b border-slate-800 bg-slate-950/70 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                            <span class="material-symbols-outlined text-xl">monitoring</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-white text-base font-geist">Monthly Sales Performance Trends</h3>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-outfit">Live Engine</span>
                            </div>
                            <p class="text-xs text-slate-400 mt-0.5 font-inter">Multi-month revenue inflow, gross profit margin & sales volume velocity</p>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-3">
                        <!-- Metric Filter Buttons -->
                        <div class="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 font-outfit" id="chart-metric-filters">
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-white bg-blue-600 shadow-sm" id="btn-metric-revenue" onclick="Dashboard.setMetricView('revenue')">
                                Revenue & Profit
                            </button>
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white" id="btn-metric-orders" onclick="Dashboard.setMetricView('orders')">
                                Orders Volume
                            </button>
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white" id="btn-metric-aov" onclick="Dashboard.setMetricView('aov')">
                                Avg Order Value (AOV)
                            </button>
                        </div>

                        <!-- Timeframe Range Selector -->
                        <div class="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 font-outfit" id="chart-timeframe-filters">
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white" id="btn-tf-6" onclick="Dashboard.setTimeframe(6)">
                                6M
                            </button>
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-white bg-slate-800 border border-slate-700 shadow-sm" id="btn-tf-12" onclick="Dashboard.setTimeframe(12)">
                                12M
                            </button>
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white" id="btn-tf-24" onclick="Dashboard.setTimeframe(24)">
                                24M
                            </button>
                        </div>

                        <!-- View Modes: Visual Chart vs Breakdown Table vs Daily Stream -->
                        <div class="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 font-outfit">
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-white bg-slate-800 border border-slate-700 flex items-center gap-1" id="btn-view-chart" onclick="Dashboard.setViewMode('chart')">
                                <span class="material-symbols-outlined text-xs">bar_chart</span> Trends
                            </button>
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white flex items-center gap-1" id="btn-view-table" onclick="Dashboard.setViewMode('table')">
                                <span class="material-symbols-outlined text-xs">table_chart</span> Matrix
                            </button>
                            <button type="button" class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white flex items-center gap-1" id="btn-view-daily" onclick="Dashboard.setViewMode('daily')">
                                <span class="material-symbols-outlined text-xs">calendar_view_day</span> Daily 30D
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Monthly Performance KPI Highlights Ribbon -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-950/40 border-b border-slate-800" id="dash-trends-kpis">
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Period Total Revenue</div>
                        <div class="text-xl font-bold text-white mt-1 font-digit" id="trend-kpi-total-rev">৳ 0.00</div>
                        <div class="text-[11px] text-emerald-400 mt-1 font-inter flex items-center gap-0.5" id="trend-kpi-growth">
                            <span class="material-symbols-outlined text-xs">trending_up</span> MoM Growth: <span class="font-bold font-digit">0.0%</span>
                        </div>
                    </div>
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Average Monthly Run Rate</div>
                        <div class="text-xl font-bold text-blue-400 mt-1 font-digit" id="trend-kpi-avg-rev">৳ 0.00 / mo</div>
                        <div class="text-[11px] text-slate-400 mt-1 font-inter" id="trend-kpi-avg-orders">Across selected period</div>
                    </div>
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Peak Velocity Month</div>
                        <div class="text-xl font-bold text-amber-400 mt-1 font-digit" id="trend-kpi-peak-month">—</div>
                        <div class="text-[11px] text-slate-400 mt-1 font-inter" id="trend-kpi-peak-val">Highest recorded sales</div>
                    </div>
                    <div class="p-3 bg-slate-900/80 border border-slate-800/90 rounded-xl">
                        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Target Achievement</div>
                        <div class="text-xl font-bold text-emerald-400 mt-1 font-digit" id="trend-kpi-target-rate">100%</div>
                        <div class="text-[11px] text-slate-400 mt-1 font-inter">Vs monthly sales goals</div>
                    </div>
                </div>

                <!-- 1. Interactive Trend Charts View -->
                <div class="p-5" id="dash-view-chart-panel">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Primary Monthly Performance Canvas -->
                        <div class="lg:col-span-2 flex flex-col justify-between">
                            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <div class="flex items-center gap-2">
                                    <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300 font-outfit" id="main-chart-title">
                                        Monthly Revenue & Profit Performance (BDT)
                                    </h4>
                                </div>
                                <div class="flex items-center gap-4 text-xs font-medium font-outfit" id="chart-legend-custom">
                                    <div class="flex items-center gap-1.5 text-blue-400"><span class="w-3 h-3 rounded bg-blue-600 inline-block"></span> Total Revenue</div>
                                    <div class="flex items-center gap-1.5 text-emerald-400"><span class="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Gross Profit</div>
                                    <div class="flex items-center gap-1.5 text-amber-400"><span class="w-3 h-0.5 bg-amber-400 inline-block"></span> Sales Target</div>
                                </div>
                            </div>

                            <!-- Canvas Container with defined responsive height -->
                            <div class="relative w-full h-72 sm:h-80 bg-slate-950/40 rounded-xl border border-slate-800/70 p-3">
                                <canvas id="monthly-sales-chart-canvas"></canvas>
                                <div id="monthly-chart-fallback" class="hidden absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                                    Initializing chart renderer...
                                </div>
                            </div>
                        </div>

                        <!-- Secondary Category Contribution Chart -->
                        <div class="bg-slate-950/40 rounded-xl border border-slate-800/70 p-4 flex flex-col justify-between">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300 font-outfit">Category Revenue Share</h4>
                                <span class="material-symbols-outlined text-slate-400 text-sm">pie_chart</span>
                            </div>
                            <div class="relative w-full h-44 flex items-center justify-center my-2">
                                <canvas id="category-sales-chart-canvas"></canvas>
                            </div>
                            <div class="space-y-1.5 mt-2 border-t border-slate-800/80 pt-2 text-xs font-inter" id="category-breakdown-list">
                                <div class="text-center text-slate-500 text-[11px]">Loading category distribution...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. Monthly Performance Matrix Table View -->
                <div class="p-5 hidden" id="dash-view-table-panel">
                    <div class="overflow-x-auto rounded-xl border border-slate-800">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th class="text-right">Total Revenue</th>
                                    <th class="text-right">Gross Profit</th>
                                    <th class="text-right">Expenses</th>
                                    <th class="text-right">Net Profit</th>
                                    <th class="text-center">Orders Count</th>
                                    <th class="text-right">Avg Order Value (AOV)</th>
                                    <th class="text-center">Target Realization</th>
                                    <th class="text-right">MoM Trend</th>
                                </tr>
                            </thead>
                            <tbody id="dash-monthly-table-body">
                                <tr><td colspan="9" class="text-center py-6 text-slate-400 text-xs">Loading monthly performance matrix...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 3. Daily 30-Day Stream View -->
                <div class="p-5 hidden" id="dash-view-daily-panel">
                    <div class="overflow-x-auto pb-4 scrollbar-thin select-none">
                        <div class="h-64 flex items-end justify-start gap-2 border-b border-slate-800 pb-4 relative min-w-full" id="dash-chart">
                            <div class="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">Loading daily 30-day stream data...</div>
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row justify-between items-center mt-3 text-xs font-semibold text-slate-300 border-t border-slate-800 pt-3 gap-2 font-outfit">
                        <div class="flex gap-6">
                            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded bg-blue-600"></div> Daily Revenue</div>
                            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded bg-emerald-500"></div> Daily Profit</div>
                        </div>
                        <div class="text-[11px] text-slate-400 font-medium italic flex items-center gap-1 font-inter">
                            <span class="material-symbols-outlined text-xs text-blue-400">swap_horiz</span> Scroll horizontally to inspect day-by-day revenue
                        </div>
                    </div>
                </div>
            </div>

            <!-- Operational Alerts & System Health Strip -->
            <div class="grid grid-cols-1 gap-6 mb-6 font-jakarta">
                <div class="card shadow-xl border border-slate-800 bg-slate-900/90 rounded-2xl flex flex-col overflow-hidden">
                    <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-400">notifications_active</span>
                            <h3 class="font-bold text-white text-sm font-geist">System Health & Live Alerts</h3>
                        </div>
                    </div>
                    <div class="p-0 flex-1 overflow-y-auto max-h-48">
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
       QUICK SNAPSHOT GRID RENDERER
       Summarizes key metrics (total sales, pending orders, dispatches, liquidity)
       in a visually appealing, role-tailored responsive grid.
       ========================================================================= */
    renderQuickSnapshotGrid(container, s, role) {
        if (!container) return;

        const totalSales = s.total_sales !== undefined ? s.total_sales : (s.total_sales_today || 0);
        const totalSalesToday = s.total_sales_today || 0;
        const totalOrdersCount = s.total_orders_count || s.sales_today_count || 0;
        const pendingCount = s.orders_pending || 0;
        const pendingAmount = s.orders_pending_amount || 0;
        const activeDeliveries = s.active_deliveries || 0;
        const lowStockItems = s.low_stock_items || 0;
        const totalCash = s.total_cash || 0;

        if (role === 'manager') {
            container.innerHTML = `
                <!-- Total Sales Turnover Card -->
                <div id="snapshot-card-total-sales" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">payments</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-outfit">
                                Store Turnover
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Total Sales Turnover</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-white mt-1 font-mono tracking-tight group-hover:text-emerald-300 transition-colors">
                            ${UI.formatMoney(totalSales)}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">
                            Today: <span class="text-emerald-400 font-medium">${UI.formatMoney(totalSalesToday)}</span> (${s.sales_today_count || 0} sales)
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">${totalOrdersCount} orders placed</span>
                        <button type="button" onclick="window.App.navigate('orders')" class="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Orders <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Pending Orders Card -->
                <div id="snapshot-card-pending-orders" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">pending_actions</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${pendingCount > 0 ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'} font-outfit">
                                ${pendingCount > 0 ? 'Needs Dispatch' : 'Queue Clear'}
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Pending Orders</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-blue-400 mt-1 font-mono tracking-tight">
                            ${pendingCount}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">
                            Queue Value: <span class="text-blue-300 font-mono">${UI.formatMoney(pendingAmount)}</span>
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">Awaiting dispatch fulfillment</span>
                        <button type="button" onclick="window.App.navigate('orders')" class="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Fulfill <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Active Consignments Card -->
                <div id="snapshot-card-consignments" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">local_shipping</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${activeDeliveries > 0 ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'} font-outfit">
                                ${activeDeliveries > 0 ? 'In Transit' : 'Fleet Idle'}
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Active Consignments</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-indigo-400 mt-1 font-mono tracking-tight">
                            ${activeDeliveries}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">En route to customer addresses</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">Courier logistics</span>
                        <button type="button" onclick="window.App.navigate('deliveries')" class="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Deliveries <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Urgent Low Stock Card -->
                <div id="snapshot-card-low-stock" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">inventory_2</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${lowStockItems > 0 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'} font-outfit">
                                ${lowStockItems > 0 ? 'Reorder Urgent' : 'Healthy Stock'}
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Urgent Low Stock</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-amber-400 mt-1 font-mono tracking-tight">
                            ${lowStockItems} <span class="text-lg font-bold text-slate-400">SKUs</span>
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">Stock units ≤ 10 threshold</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">Inventory health</span>
                        <button type="button" onclick="window.App.navigate('inventory')" class="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Restock <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>
            `;
        } else if (role === 'sales') {
            const goal = 50000;
            const pct = Math.min(Math.round((totalSalesToday / goal) * 100), 100);

            container.innerHTML = `
                <!-- Total Sales Card -->
                <div id="snapshot-card-total-sales" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">payments</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20 font-outfit">
                                Sales Volume
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Total Sales Volume</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-amber-400 mt-1 font-mono tracking-tight">
                            ${UI.formatMoney(totalSales)}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">
                            Today: <span class="text-amber-300 font-medium">${UI.formatMoney(totalSalesToday)}</span>
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">${s.sales_today_count || 0} counter sales today</span>
                        <button type="button" onclick="window.App.navigate('pos')" class="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            + New Sale <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Pending Orders Card -->
                <div id="snapshot-card-pending-orders" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">pending_actions</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${pendingCount > 0 ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'} font-outfit">
                                ${pendingCount > 0 ? 'Fulfillment Queue' : 'Queue Clear'}
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Pending Orders</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-blue-400 mt-1 font-mono tracking-tight">
                            ${pendingCount}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">
                            Queue Value: <span class="text-blue-300 font-mono">${UI.formatMoney(pendingAmount)}</span>
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">Awaiting delivery dispatch</span>
                        <button type="button" onclick="window.App.navigate('orders')" class="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Orders <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Transactions Handled Card -->
                <div id="snapshot-card-transactions" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">receipt_long</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-outfit">
                                Billed
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Transactions Handled</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-emerald-400 mt-1 font-mono tracking-tight">
                            ${s.sales_today_count || 0}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">Counter orders processed today</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">Total: ${totalOrdersCount} orders</span>
                        <button type="button" onclick="window.App.navigate('orders')" class="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Receipts <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Daily Goal Progress Card -->
                <div id="snapshot-card-daily-goal" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">flag</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-outfit">
                                Target Pace
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Daily Goal Progress</p>
                        <div class="flex items-baseline justify-between mt-1">
                            <h3 class="text-2.5xl sm:text-3xl font-extrabold text-indigo-400 font-mono tracking-tight">${pct}%</h3>
                            <span class="text-xs text-slate-400 font-digit font-mono">${UI.formatMoney(totalSalesToday)} / ৳ 50k</span>
                        </div>
                        <div class="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
                            <div class="bg-indigo-500 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                        </div>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">${activeDeliveries} deliveries active</span>
                        <button type="button" onclick="window.App.navigate('deliveries')" class="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Transit <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>
            `;
        } else if (role === 'accountant') {
            container.innerHTML = `
                <!-- Total Sales Revenue Card -->
                <div id="snapshot-card-total-sales" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">payments</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-outfit">
                                Revenue Inflow
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Total Sales Revenue</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-white mt-1 font-mono tracking-tight group-hover:text-emerald-300 transition-colors">
                            ${UI.formatMoney(totalSales)}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">
                            Today's Cashflow: <span class="text-emerald-400 font-medium">${UI.formatMoney(totalSalesToday)}</span>
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">${totalOrdersCount} revenue orders</span>
                        <button type="button" onclick="window.App.navigate('reports')" class="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Reports <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Pending Orders Pipeline Card -->
                <div id="snapshot-card-pending-orders" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">pending_actions</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${pendingCount > 0 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'} font-outfit">
                                ${pendingCount > 0 ? 'Pipeline Queue' : 'Settled'}
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Pending Orders Pipeline</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-amber-400 mt-1 font-mono tracking-tight">
                            ${pendingCount}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">
                            Unsettled Pipeline: <span class="text-amber-300 font-mono">${UI.formatMoney(pendingAmount)}</span>
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">Receivables awaiting delivery</span>
                        <button type="button" onclick="window.App.navigate('orders')" class="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Audit <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Treasury Liquidity Card -->
                <div id="snapshot-card-liquidity" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">account_balance</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-outfit">
                                Reserves
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Treasury Liquidity</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-cyan-400 mt-1 font-mono tracking-tight">
                            ${UI.formatMoney(totalCash)}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">Active cash & bank reserves</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">Net Margin: ${UI.formatMoney(s.monthly_net_profit || 0)}</span>
                        <button type="button" onclick="window.App.navigate('finance')" class="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Ledger <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Today's Expense Outflow Card -->
                <div id="snapshot-card-expenses" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-red-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">receipt</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-300 border border-red-500/20 font-outfit">
                                Outflow
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Today's Expense Outflow</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-red-400 mt-1 font-mono tracking-tight">
                            ${UI.formatMoney(s.today_expenses || 0)}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">Returns: ${UI.formatMoney(s.today_returns || 0)}</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">Recorded business overhead</span>
                        <button type="button" onclick="window.App.navigate('expenses')" class="text-red-400 hover:text-red-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Expenses <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Admin / Store Owner Default Portal
            container.innerHTML = `
                <!-- Total Sales Card -->
                <div id="snapshot-card-total-sales" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">payments</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-outfit">
                                Cumulative Gross
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Total Sales</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-white mt-1 font-mono tracking-tight group-hover:text-emerald-300 transition-colors">
                            ${UI.formatMoney(totalSales)}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">
                            Today: <span class="text-emerald-400 font-medium">${UI.formatMoney(totalSalesToday)}</span> (${s.sales_today_count || 0} orders)
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">${totalOrdersCount} orders placed</span>
                        <button type="button" onclick="window.App.navigate('orders')" class="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            View Orders <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Pending Orders Card -->
                <div id="snapshot-card-pending-orders" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">pending_actions</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${pendingCount > 0 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'} font-outfit">
                                ${pendingCount > 0 ? 'Action Needed' : 'All Clear'}
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Pending Orders</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-amber-400 mt-1 font-mono tracking-tight">
                            ${pendingCount}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">
                            Queue Value: <span class="text-amber-300 font-mono">${UI.formatMoney(pendingAmount)}</span>
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">Awaiting fulfillment & dispatch</span>
                        <button type="button" onclick="window.App.navigate('orders')" class="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Process <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Shipments in Transit Card -->
                <div id="snapshot-card-consignments" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">local_shipping</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${activeDeliveries > 0 ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'} font-outfit">
                                ${activeDeliveries > 0 ? 'On Road' : 'No Dispatches'}
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Shipments in Transit</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-indigo-400 mt-1 font-mono tracking-tight">
                            ${activeDeliveries}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">Consignments with riders</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">Live logistics routing</span>
                        <button type="button" onclick="window.App.navigate('deliveries')" class="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Track <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>

                <!-- Treasury Liquidity Card -->
                <div id="snapshot-card-liquidity" class="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">account_balance_wallet</span>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/20 font-outfit">
                                Reserves
                            </span>
                        </div>
                        <p class="text-xs font-semibold text-slate-400 font-inter">Treasury Liquidity</p>
                        <h3 class="text-2.5xl sm:text-3xl font-extrabold text-blue-400 mt-1 font-mono tracking-tight">
                            ${UI.formatMoney(totalCash)}
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-1.5 font-inter">
                            Low stock: <span class="text-amber-400 font-medium">${lowStockItems} SKUs</span>
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span class="font-medium">Cash & bank holdings</span>
                        <button type="button" onclick="window.App.navigate('finance')" class="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5 cursor-pointer">
                            Treasury <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                    </div>
                </div>
            `;
        }
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

            // Render KPI Quick Snapshot Grid based on role
            const container = document.getElementById('dash-kpi-container');
            if (container) {
                this.renderQuickSnapshotGrid(container, s, role);
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
        await Promise.all([
            this.loadDailySalesTrends(this.dailyTrendsMonthOffset || 0, false),
            this.loadMonthlyTrends(this.timeframe || 12),
            this.loadDailyStreamChart()
        ]);
    },

    async loadDailyStreamChart() {
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
                            <div class="font-bold text-slate-300 mb-0.5 font-digit">${d.date || d.label}</div>
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
       MONTHLY SALES PERFORMANCE TRENDS & LIGHTWEIGHT CHART ENGINE
       ========================================================================= */
    async loadMonthlyTrends(months = 12) {
        try {
            this.timeframe = months;
            const res = await API.get(`dashboard/monthly_sales_chart?months=${months}`);
            if (!res || res.status !== 'success' || !res.data) {
                console.warn('Unable to load monthly trends dataset');
                return;
            }

            const data = res.data;
            this.cachedMonthlyTrends = data;

            // 1. Update Ribbon KPI Badges
            this.updateTrendKpis(data.summary);

            // 2. Render Primary Visual Chart
            this.renderMonthlySalesChart(data.months, this.metricView || 'revenue');

            // 3. Render Category Contribution Donut Chart
            this.renderCategoryChart(data.categories || []);

            // 4. Populate Matrix Table
            this.renderMonthlyTable(data.months || []);

        } catch (err) {
            console.error('Error loading monthly sales trends:', err);
        }
    },

    updateTrendKpis(summary) {
        if (!summary) return;

        const totalRevEl = document.getElementById('trend-kpi-total-rev');
        if (totalRevEl) totalRevEl.textContent = `৳ ${UI.formatMoney(summary.total_revenue || 0)}`;

        const growthEl = document.getElementById('trend-kpi-growth');
        if (growthEl) {
            const gr = summary.mom_growth_percent || 0;
            const isPos = gr >= 0;
            growthEl.className = `text-[11px] mt-1 font-inter flex items-center gap-0.5 ${isPos ? 'text-emerald-400' : 'text-red-400'}`;
            growthEl.innerHTML = `
                <span class="material-symbols-outlined text-xs">${isPos ? 'trending_up' : 'trending_down'}</span>
                MoM Growth: <span class="font-bold font-digit">${isPos ? '+' : ''}${gr}%</span>
            `;
        }

        const avgRevEl = document.getElementById('trend-kpi-avg-rev');
        if (avgRevEl) avgRevEl.textContent = `৳ ${UI.formatMoney(summary.avg_monthly_revenue || 0)} / mo`;

        const avgOrdersEl = document.getElementById('trend-kpi-avg-orders');
        if (avgOrdersEl) {
            const avgOrders = Math.round((summary.total_orders || 0) / (this.timeframe || 12));
            avgOrdersEl.textContent = `Avg ~${avgOrders} orders/month`;
        }

        const peakMonthEl = document.getElementById('trend-kpi-peak-month');
        if (peakMonthEl && summary.best_month) {
            peakMonthEl.textContent = summary.best_month.label || summary.best_month.short_label || '—';
        }

        const peakValEl = document.getElementById('trend-kpi-peak-val');
        if (peakValEl && summary.best_month) {
            peakValEl.textContent = `Peak ৳ ${UI.formatMoney(summary.best_month.revenue)}`;
        }

        const targetRateEl = document.getElementById('trend-kpi-target-rate');
        if (targetRateEl) {
            targetRateEl.textContent = `${summary.target_achievement_rate || 100}%`;
        }
    },

    renderMonthlySalesChart(monthsList, metric = 'revenue') {
        const canvas = document.getElementById('monthly-sales-chart-canvas');
        if (!canvas) return;

        // Update main chart title
        const titleEl = document.getElementById('main-chart-title');
        const legendEl = document.getElementById('chart-legend-custom');

        if (metric === 'revenue') {
            if (titleEl) titleEl.textContent = `Monthly Revenue vs. Gross Profit vs. Target (${this.timeframe}M)`;
            if (legendEl) {
                legendEl.innerHTML = `
                    <div class="flex items-center gap-1.5 text-blue-400"><span class="w-3 h-3 rounded bg-blue-600 inline-block"></span> Total Revenue</div>
                    <div class="flex items-center gap-1.5 text-emerald-400"><span class="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Gross Profit</div>
                    <div class="flex items-center gap-1.5 text-amber-400"><span class="w-3 h-0.5 bg-amber-400 inline-block"></span> Benchmark Target</div>
                `;
            }
        } else if (metric === 'orders') {
            if (titleEl) titleEl.textContent = `Monthly Orders Volume Velocity (${this.timeframe}M)`;
            if (legendEl) {
                legendEl.innerHTML = `
                    <div class="flex items-center gap-1.5 text-indigo-400"><span class="w-3 h-3 rounded bg-indigo-600 inline-block"></span> Orders Processed</div>
                    <div class="flex items-center gap-1.5 text-cyan-400"><span class="w-3 h-0.5 bg-cyan-400 inline-block"></span> Trend Trajectory</div>
                `;
            }
        } else if (metric === 'aov') {
            if (titleEl) titleEl.textContent = `Average Order Value (AOV) Inflow Trend (${this.timeframe}M)`;
            if (legendEl) {
                legendEl.innerHTML = `
                    <div class="flex items-center gap-1.5 text-purple-400"><span class="w-3 h-3 rounded bg-purple-600 inline-block"></span> Average Order Value (BDT)</div>
                `;
            }
        }

        // Destroy previous Chart instance if exists
        if (this.monthlyChartInstance) {
            try {
                this.monthlyChartInstance.destroy();
            } catch (e) {}
            this.monthlyChartInstance = null;
        }

        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            this.renderFallbackSvgChart(canvas, monthsList, metric);
            return;
        }

        const labels = monthsList.map(m => m.short_label || m.label);
        const ctx = canvas.getContext('2d');

        // Create gradients
        const revGrad = ctx.createLinearGradient(0, 0, 0, 300);
        revGrad.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
        revGrad.addColorStop(1, 'rgba(37, 99, 235, 0.4)');

        const profGrad = ctx.createLinearGradient(0, 0, 0, 300);
        profGrad.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
        profGrad.addColorStop(1, 'rgba(5, 150, 105, 0.4)');

        const aovGrad = ctx.createLinearGradient(0, 0, 0, 300);
        aovGrad.addColorStop(0, 'rgba(147, 51, 234, 0.4)');
        aovGrad.addColorStop(1, 'rgba(147, 51, 234, 0.02)');

        let datasets = [];

        if (metric === 'revenue') {
            datasets = [
                {
                    type: 'bar',
                    label: 'Total Revenue (৳)',
                    data: monthsList.map(m => m.revenue),
                    backgroundColor: revGrad,
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.65,
                    categoryPercentage: 0.7,
                    order: 2
                },
                {
                    type: 'bar',
                    label: 'Gross Profit (৳)',
                    data: monthsList.map(m => m.gross_profit),
                    backgroundColor: profGrad,
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.65,
                    categoryPercentage: 0.7,
                    order: 3
                },
                {
                    type: 'line',
                    label: 'Sales Target (৳)',
                    data: monthsList.map(m => m.target),
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#0f172a',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.35,
                    fill: false,
                    order: 1
                }
            ];
        } else if (metric === 'orders') {
            datasets = [
                {
                    type: 'bar',
                    label: 'Orders Count',
                    data: monthsList.map(m => m.orders_count),
                    backgroundColor: 'rgba(99, 102, 241, 0.85)',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    borderRadius: 6,
                    barPercentage: 0.6,
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Order Trajectory',
                    data: monthsList.map(m => m.orders_count),
                    borderColor: '#06b6d4',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#06b6d4',
                    pointBorderColor: '#0f172a',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: false,
                    order: 1
                }
            ];
        } else if (metric === 'aov') {
            datasets = [
                {
                    type: 'line',
                    label: 'Avg Order Value (৳)',
                    data: monthsList.map(m => m.aov),
                    backgroundColor: aovGrad,
                    borderColor: '#a855f7',
                    borderWidth: 3,
                    pointBackgroundColor: '#c084fc',
                    pointBorderColor: '#0f172a',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.4,
                    fill: true
                }
            ];
        }

        this.monthlyChartInstance = new Chart(ctx, {
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false // Using custom sleek header legend
                    },
                    tooltip: {
                        backgroundColor: '#020617',
                        borderColor: '#334155',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12,
                        titleFont: { family: 'Inter', size: 12, weight: 'bold' },
                        bodyFont: { family: 'Inter', size: 11 },
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                let value = context.parsed.y;
                                if (label.includes('৳') || label.includes('Revenue') || label.includes('Profit') || label.includes('Target') || label.includes('Value')) {
                                    return ` ${label.split('(')[0].trim()}: ৳ ${UI.formatMoney(value)}`;
                                }
                                return ` ${label}: ${value.toLocaleString()} orders`;
                            },
                            afterBody: function(context) {
                                const idx = context[0].dataIndex;
                                const item = monthsList[idx];
                                if (!item) return '';
                                const lines = [];
                                if (item.mom_growth !== undefined) {
                                    const sign = item.mom_growth >= 0 ? '+' : '';
                                    lines.push(`MoM Growth: ${sign}${item.mom_growth}%`);
                                }
                                if (item.target_achieved_pct !== undefined) {
                                    lines.push(`Target Achievement: ${item.target_achieved_pct}%`);
                                }
                                return lines;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.04)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 11, weight: '500' }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.06)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 10 },
                            callback: function(value) {
                                if (metric === 'orders') return value;
                                if (value >= 1000000) return '৳ ' + (value / 1000000).toFixed(1) + 'M';
                                if (value >= 1000) return '৳ ' + (value / 1000).toFixed(0) + 'k';
                                return '৳ ' + value;
                            }
                        }
                    }
                }
            }
        });
    },

    renderCategoryChart(categories = []) {
        const canvas = document.getElementById('category-sales-chart-canvas');
        if (!canvas) return;

        if (this.categoryChartInstance) {
            try {
                this.categoryChartInstance.destroy();
            } catch (e) {}
            this.categoryChartInstance = null;
        }

        // Render Legend list in HTML
        const listEl = document.getElementById('category-breakdown-list');
        if (listEl && categories.length > 0) {
            listEl.innerHTML = categories.map(c => `
                <div class="flex items-center justify-between py-1">
                    <div class="flex items-center gap-1.5 truncate max-w-[140px]">
                        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${c.color}"></span>
                        <span class="text-slate-300 truncate text-[11px]">${c.category}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-digit text-[11px] text-slate-400">৳ ${UI.formatMoney(c.revenue)}</span>
                        <span class="font-digit font-bold text-[11px] text-white">${c.percentage}%</span>
                    </div>
                </div>
            `).join('');
        }

        if (typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');
        const labels = categories.map(c => c.category);
        const data = categories.map(c => c.revenue);
        const colors = categories.map(c => c.color);

        this.categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#0f172a',
                    borderWidth: 2,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#020617',
                        borderColor: '#334155',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 10,
                        callbacks: {
                            label: function(context) {
                                const val = context.parsed;
                                return ` ${context.label}: ৳ ${UI.formatMoney(val)}`;
                            }
                        }
                    }
                }
            }
        });
    },

    renderMonthlyTable(monthsList = []) {
        const tbody = document.getElementById('dash-monthly-table-body');
        if (!tbody) return;

        if (monthsList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-slate-400 text-xs font-inter">No monthly records in active filter.</td></tr>`;
            return;
        }

        // Show descending order (latest month first) in table
        const sorted = [...monthsList].reverse();

        tbody.innerHTML = sorted.map(m => {
            const isPosGrowth = (m.mom_growth || 0) >= 0;
            const targetColor = m.target_achieved_pct >= 100 ? 'text-emerald-400' : 'text-amber-400';
            const barWidth = Math.min(m.target_achieved_pct || 0, 100);

            return `
                <tr class="hover:bg-slate-800/50 transition-colors text-xs font-jakarta">
                    <td class="py-3 font-semibold text-white">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-xs text-blue-400">calendar_month</span>
                            <span>${m.label || m.short_label}</span>
                        </div>
                    </td>
                    <td class="text-right font-extrabold text-blue-400 font-digit py-3">৳ ${UI.formatMoney(m.revenue)}</td>
                    <td class="text-right font-bold text-emerald-400 font-digit py-3">৳ ${UI.formatMoney(m.gross_profit)}</td>
                    <td class="text-right font-medium text-red-400 font-digit py-3">৳ ${UI.formatMoney(m.expenses)}</td>
                    <td class="text-right font-extrabold text-white font-digit py-3">৳ ${UI.formatMoney(m.net_profit)}</td>
                    <td class="text-center font-bold text-slate-200 font-digit py-3">${m.orders_count.toLocaleString()}</td>
                    <td class="text-right font-medium text-purple-300 font-digit py-3">৳ ${UI.formatMoney(m.aov)}</td>
                    <td class="text-center py-3">
                        <div class="flex items-center justify-center gap-2">
                            <div class="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div class="h-full ${m.target_achieved_pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}" style="width: ${barWidth}%"></div>
                            </div>
                            <span class="font-bold text-[11px] font-digit ${targetColor}">${m.target_achieved_pct}%</span>
                        </div>
                    </td>
                    <td class="text-right py-3">
                        <span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-outfit ${
                            isPosGrowth ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }">
                            <span class="material-symbols-outlined text-[10px]">${isPosGrowth ? 'trending_up' : 'trending_down'}</span>
                            ${isPosGrowth ? '+' : ''}${m.mom_growth}%
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderFallbackSvgChart(canvas, monthsList, metric) {
        const fallbackEl = document.getElementById('monthly-chart-fallback');
        if (fallbackEl) {
            fallbackEl.classList.remove('hidden');
            fallbackEl.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-xs text-blue-400 font-bold mb-2">Monthly Sales Performance Matrix Ready</p>
                    <p class="text-[11px] text-slate-400">Click "Matrix" view above to inspect full tabular data.</p>
                </div>
            `;
        }
    },

    setTimeframe(months) {
        this.timeframe = months;
        ['btn-tf-6', 'btn-tf-12', 'btn-tf-24'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const targetM = id === 'btn-tf-6' ? 6 : id === 'btn-tf-12' ? 12 : 24;
            if (targetM === months) {
                btn.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-white bg-slate-800 border border-slate-700 shadow-sm';
            } else {
                btn.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white';
            }
        });
        this.loadMonthlyTrends(months);
    },

    setMetricView(metric) {
        this.metricView = metric;
        ['btn-metric-revenue', 'btn-metric-orders', 'btn-metric-aov'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const targetMetric = id === 'btn-metric-revenue' ? 'revenue' : id === 'btn-metric-orders' ? 'orders' : 'aov';
            if (targetMetric === metric) {
                btn.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-white bg-blue-600 shadow-sm';
            } else {
                btn.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white';
            }
        });

        if (this.cachedMonthlyTrends && this.cachedMonthlyTrends.months) {
            this.renderMonthlySalesChart(this.cachedMonthlyTrends.months, metric);
        }
    },

    setViewMode(mode) {
        this.activeViewMode = mode;
        const chartPanel = document.getElementById('dash-view-chart-panel');
        const tablePanel = document.getElementById('dash-view-table-panel');
        const dailyPanel = document.getElementById('dash-view-daily-panel');

        if (chartPanel) chartPanel.classList.toggle('hidden', mode !== 'chart');
        if (tablePanel) tablePanel.classList.toggle('hidden', mode !== 'table');
        if (dailyPanel) dailyPanel.classList.toggle('hidden', mode !== 'daily');

        ['btn-view-chart', 'btn-view-table', 'btn-view-daily'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const targetMode = id === 'btn-view-chart' ? 'chart' : id === 'btn-view-table' ? 'table' : 'daily';
            if (targetMode === mode) {
                btn.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-white bg-slate-800 border border-slate-700 flex items-center gap-1 shadow-sm';
            } else {
                btn.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white flex items-center gap-1';
            }
        });

        // Trigger chart resize if switching back to chart view
        if (mode === 'chart' && this.monthlyChartInstance) {
            setTimeout(() => {
                try {
                    this.monthlyChartInstance.resize();
                    if (this.categoryChartInstance) this.categoryChartInstance.resize();
                    if (this.dailySalesChartInstance) this.dailySalesChartInstance.resize();
                } catch (e) {}
            }, 50);
        }
    },

    /* =========================================================================
       DAILY SALES TRENDS (CURRENT MONTH) - FIRESTORE LIVE CHART ENGINE
       ========================================================================= */
    dailySalesChartInstance: null,
    dailyTrendsMonthOffset: 0,
    dailyMetricView: 'revenue',
    cachedDailySalesData: null,

    async loadDailySalesTrends(monthOffset = 0, forceRefresh = false) {
        this.dailyTrendsMonthOffset = monthOffset;
        const loader = document.getElementById('daily-sales-chart-loader');
        if (loader && forceRefresh) {
            loader.classList.remove('hidden');
        }

        try {
            const targetDate = new Date();
            targetDate.setMonth(targetDate.getMonth() + monthOffset);

            // Fetch live aggregated day-by-day stats from Firestore
            let data = null;
            if (window.EaseBusFirebase && typeof window.EaseBusFirebase.fetchCurrentMonthDailySales === 'function') {
                data = await window.EaseBusFirebase.fetchCurrentMonthDailySales(null, targetDate);
            } else {
                console.warn('EaseBusFirebase not loaded yet, building fallback daily dataset');
                const year = targetDate.getFullYear();
                const month = targetDate.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const days = [];
                for (let d = 1; d <= daysInMonth; d++) {
                    days.push({
                        day: d,
                        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                        shortLabel: `${d} ${targetDate.toLocaleString('default', { month: 'short' })}`,
                        fullDate: `${d} ${targetDate.toLocaleString('default', { month: 'long' })}, ${year}`,
                        revenue: 0,
                        grossProfit: 0,
                        ordersCount: 0,
                        aov: 0
                    });
                }
                data = {
                    year,
                    month: month + 1,
                    monthName: targetDate.toLocaleString('default', { month: 'long' }),
                    daysInMonth,
                    days,
                    summary: {
                        totalRevenue: 0,
                        totalGrossProfit: 0,
                        totalOrders: 0,
                        avgOrderValue: 0,
                        dailyAverage: 0,
                        avgOrdersPerDay: 0,
                        peakDay: null,
                        todayRevenue: 0,
                        todayOrders: 0
                    },
                    source: 'fallback'
                };
            }

            this.cachedDailySalesData = data;

            // Update Month Label in Navigator
            const monthLabel = document.getElementById('daily-chart-month-label');
            if (monthLabel) {
                monthLabel.textContent = `${data.monthName} ${data.year}`;
            }

            // Update Firestore Status Badge
            const firestoreBadge = document.getElementById('daily-firestore-badge');
            if (firestoreBadge) {
                if (data.source === 'firestore') {
                    firestoreBadge.innerHTML = `
                        <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span> Firestore Live Synced
                    `;
                    firestoreBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-outfit";
                } else {
                    firestoreBadge.innerHTML = `
                        <span class="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1"></span> Local Cache Engine
                    `;
                    firestoreBadge.className = "px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-outfit";
                }
            }

            // Update 4 KPI Cards
            const sum = data.summary || {};
            const revEl = document.getElementById('daily-kpi-month-rev');
            const ordersEl = document.getElementById('daily-kpi-month-orders');
            const avgRevEl = document.getElementById('daily-kpi-avg-rev');
            const avgOrdersEl = document.getElementById('daily-kpi-avg-orders');
            const peakDayEl = document.getElementById('daily-kpi-peak-day');
            const peakValEl = document.getElementById('daily-kpi-peak-val');
            const todayRevEl = document.getElementById('daily-kpi-today-rev');
            const todayOrdersEl = document.getElementById('daily-kpi-today-orders');

            if (revEl) revEl.textContent = `৳ ${UI.formatMoney(sum.totalRevenue || 0)}`;
            if (ordersEl) ordersEl.textContent = `${(sum.totalOrders || 0).toLocaleString()} orders in ${data.monthName}`;
            if (avgRevEl) avgRevEl.textContent = `৳ ${UI.formatMoney(sum.dailyAverage || 0)} / day`;
            if (avgOrdersEl) avgOrdersEl.textContent = `Avg ~${sum.avgOrdersPerDay || 0} orders/day`;
            if (peakDayEl) {
                peakDayEl.textContent = sum.peakDay ? sum.peakDay.shortLabel : '—';
            }
            if (peakValEl) {
                peakValEl.textContent = sum.peakDay && sum.peakDay.revenue > 0 ? `৳ ${UI.formatMoney(sum.peakDay.revenue)} peak` : 'No sales spikes yet';
            }
            if (todayRevEl) todayRevEl.textContent = `৳ ${UI.formatMoney(sum.todayRevenue || 0)}`;
            if (todayOrdersEl) todayOrdersEl.textContent = `${sum.todayOrders || 0} orders completed today`;

            // Render Chart.js Line Chart
            this.renderDailySalesLineChart(data, this.dailyMetricView || 'revenue');

        } catch (err) {
            console.error('Failed to load daily sales trends from Firestore:', err);
        } finally {
            if (loader) {
                loader.classList.add('hidden');
            }
        }
    },

    renderDailySalesLineChart(dailyData, metric = 'revenue') {
        const canvas = document.getElementById('daily-sales-line-chart-canvas');
        if (!canvas) return;

        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is not loaded');
            return;
        }

        if (this.dailySalesChartInstance) {
            this.dailySalesChartInstance.destroy();
            this.dailySalesChartInstance = null;
        }

        const ctx = canvas.getContext('2d');
        const days = dailyData.days || [];
        const labels = days.map(d => String(d.day).padStart(2, '0'));

        // Gradients
        const cyanGrad = ctx.createLinearGradient(0, 0, 0, 320);
        cyanGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        cyanGrad.addColorStop(0.7, 'rgba(6, 182, 212, 0.08)');
        cyanGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

        const greenGrad = ctx.createLinearGradient(0, 0, 0, 320);
        greenGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        greenGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

        const indigoGrad = ctx.createLinearGradient(0, 0, 0, 320);
        indigoGrad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        indigoGrad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        const purpleGrad = ctx.createLinearGradient(0, 0, 0, 320);
        purpleGrad.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
        purpleGrad.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

        let datasets = [];

        if (metric === 'revenue') {
            datasets = [
                {
                    label: 'Daily Sales Revenue',
                    data: days.map(d => d.revenue),
                    borderColor: '#06b6d4',
                    backgroundColor: cyanGrad,
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#06b6d4',
                    pointBorderColor: '#0f172a',
                    pointBorderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Daily Gross Profit',
                    data: days.map(d => d.grossProfit),
                    borderColor: '#10b981',
                    backgroundColor: greenGrad,
                    fill: false,
                    borderDash: [4, 4],
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 2.5,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#0f172a',
                    pointBorderWidth: 2,
                    yAxisID: 'y'
                }
            ];
        } else if (metric === 'orders') {
            datasets = [
                {
                    label: 'Daily Orders Volume',
                    data: days.map(d => d.ordersCount),
                    borderColor: '#818cf8',
                    backgroundColor: indigoGrad,
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 3.5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#818cf8',
                    pointBorderColor: '#0f172a',
                    pointBorderWidth: 2,
                    yAxisID: 'y'
                }
            ];
        } else if (metric === 'aov') {
            datasets = [
                {
                    label: 'Daily Average Order Value',
                    data: days.map(d => d.aov),
                    borderColor: '#c084fc',
                    backgroundColor: purpleGrad,
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 3.5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#c084fc',
                    pointBorderColor: '#0f172a',
                    pointBorderWidth: 2,
                    yAxisID: 'y'
                }
            ];
        }

        this.dailySalesChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#020617',
                        borderColor: '#334155',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12,
                        titleFont: {
                            family: 'Outfit, sans-serif',
                            size: 13,
                            weight: '700'
                        },
                        bodyFont: {
                            family: 'Plus Jakarta Sans, sans-serif',
                            size: 12
                        },
                        callbacks: {
                            title: function(context) {
                                const idx = context[0].dataIndex;
                                const dayObj = days[idx];
                                return dayObj ? dayObj.fullDate : `Day ${context[0].label}`;
                            },
                            label: function(context) {
                                const val = context.parsed.y;
                                if (metric === 'orders') {
                                    return ` ${context.dataset.label}: ${val.toLocaleString()} orders`;
                                }
                                return ` ${context.dataset.label}: ৳ ${UI.formatMoney(val)}`;
                            },
                            afterBody: function(context) {
                                const idx = context[0].dataIndex;
                                const dayObj = days[idx];
                                if (!dayObj) return [];
                                const lines = [];
                                if (metric === 'revenue') {
                                    lines.push(`Orders Completed: ${dayObj.ordersCount}`);
                                    if (dayObj.revenue > 0) {
                                        const margin = Math.round((dayObj.grossProfit / dayObj.revenue) * 100);
                                        lines.push(`Gross Margin: ${margin}%`);
                                        lines.push(`Daily AOV: ৳ ${UI.formatMoney(dayObj.aov)}`);
                                    }
                                }
                                return lines;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.03)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                family: 'JetBrains Mono, monospace',
                                size: 11
                            },
                            maxRotation: 0,
                            callback: function(val, index) {
                                return index % 2 === 0 ? days[index].day : '';
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                family: 'JetBrains Mono, monospace',
                                size: 11
                            },
                            callback: function(value) {
                                if (metric === 'orders') {
                                    return value;
                                }
                                if (value >= 100000) return `৳ ${(value/1000).toFixed(0)}k`;
                                if (value >= 1000) return `৳ ${(value/1000).toFixed(1)}k`;
                                return `৳ ${value}`;
                            }
                        }
                    }
                }
            }
        });
    },

    setDailyMetricView(metric) {
        this.dailyMetricView = metric;
        ['btn-daily-metric-revenue', 'btn-daily-metric-orders', 'btn-daily-metric-aov'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const target = id === 'btn-daily-metric-revenue' ? 'revenue' : id === 'btn-daily-metric-orders' ? 'orders' : 'aov';
            if (target === metric) {
                btn.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-white bg-cyan-600 shadow-sm';
            } else {
                btn.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white';
            }
        });

        // Update custom legend
        const legend = document.getElementById('daily-chart-legend-custom');
        const title = document.getElementById('daily-chart-title');
        if (legend) {
            if (metric === 'revenue') {
                if (title) title.textContent = 'Day-by-Day Sales & Profit Trajectory';
                legend.innerHTML = `
                    <div class="flex items-center gap-1.5 text-cyan-400"><span class="w-3 h-0.5 bg-cyan-400 inline-block"></span> Daily Sales Revenue (৳)</div>
                    <div class="flex items-center gap-1.5 text-emerald-400"><span class="w-3 h-0.5 bg-emerald-400 inline-block"></span> Daily Gross Profit (৳)</div>
                `;
            } else if (metric === 'orders') {
                if (title) title.textContent = 'Daily Orders Transaction Frequency';
                legend.innerHTML = `
                    <div class="flex items-center gap-1.5 text-indigo-400"><span class="w-3 h-0.5 bg-indigo-400 inline-block"></span> Daily Orders Count</div>
                `;
            } else if (metric === 'aov') {
                if (title) title.textContent = 'Daily Average Order Value Curve';
                legend.innerHTML = `
                    <div class="flex items-center gap-1.5 text-purple-400"><span class="w-3 h-0.5 bg-purple-400 inline-block"></span> Daily Average Basket (৳)</div>
                `;
            }
        }

        if (this.cachedDailySalesData) {
            this.renderDailySalesLineChart(this.cachedDailySalesData, metric);
        }
    },

    changeDailyTrendsMonth(delta) {
        this.dailyTrendsMonthOffset = (this.dailyTrendsMonthOffset || 0) + delta;
        this.loadDailySalesTrends(this.dailyTrendsMonthOffset, true);
    },

    async syncDailySalesFromFirestore() {
        const icon = document.getElementById('sync-daily-icon');
        if (icon) icon.classList.add('animate-spin');
        try {
            await this.loadDailySalesTrends(this.dailyTrendsMonthOffset || 0, true);
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('Daily sales trends synchronized with Firestore orders collection!', 'success');
            }
        } catch (e) {
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('Sync completed with local cached datasets.', 'info');
            }
        } finally {
            if (icon) icon.classList.remove('animate-spin');
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
    },

    /* =========================================================================
       QUICK ACTION FLOATING MENU & MODALS (DASHBOARD FAST ACTIONS)
       ========================================================================= */
    isQuickMenuOpen: false,
    quickOrderItems: [],

    renderQuickActionMenu(container) {
        // Remove any stale container if exists
        const stale = document.getElementById('dash-fab-container');
        if (stale) stale.remove();

        const fabDiv = document.createElement('div');
        fabDiv.id = 'dash-fab-container';
        fabDiv.className = 'fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-3 font-jakarta select-none print:hidden';
        fabDiv.innerHTML = `
            <!-- Backdrop for dismissing menu -->
            <div id="dash-fab-backdrop" class="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] hidden transition-opacity" onclick="Dashboard.closeQuickActionMenu()"></div>

            <!-- Expanded Speed Dial Actions (Flyout items) -->
            <div id="dash-fab-menu" class="hidden flex-col items-end gap-3 relative z-40 transition-all duration-200 ease-out origin-bottom-right">
                
                <!-- 1. Add Order -->
                <button type="button" onclick="Dashboard.showQuickAddOrderModal()" id="fab-btn-add-order" class="group flex items-center gap-3 bg-slate-900/95 hover:bg-blue-600 text-white pl-4 pr-3.5 py-2.5 rounded-full shadow-2xl border border-blue-500/30 hover:border-blue-400 transition-all duration-150 cursor-pointer transform hover:-translate-x-1 active:scale-95">
                    <span class="text-xs font-bold text-slate-200 group-hover:text-white font-outfit whitespace-nowrap tracking-wide">Add Order</span>
                    <div class="w-9 h-9 rounded-full bg-blue-600 text-white group-hover:bg-white group-hover:text-blue-600 flex items-center justify-center shrink-0 shadow-md transition-colors">
                        <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
                    </div>
                </button>

                <!-- 2. Add Expense -->
                <button type="button" onclick="Dashboard.showQuickAddExpenseModal()" id="fab-btn-add-expense" class="group flex items-center gap-3 bg-slate-900/95 hover:bg-rose-600 text-white pl-4 pr-3.5 py-2.5 rounded-full shadow-2xl border border-rose-500/30 hover:border-rose-400 transition-all duration-150 cursor-pointer transform hover:-translate-x-1 active:scale-95">
                    <span class="text-xs font-bold text-slate-200 group-hover:text-white font-outfit whitespace-nowrap tracking-wide">Add Expense</span>
                    <div class="w-9 h-9 rounded-full bg-rose-600 text-white group-hover:bg-white group-hover:text-rose-600 flex items-center justify-center shrink-0 shadow-md transition-colors">
                        <span class="material-symbols-outlined text-lg">receipt_long</span>
                    </div>
                </button>

                <!-- 3. Receive Inventory -->
                <button type="button" onclick="Dashboard.showQuickReceiveInventoryModal()" id="fab-btn-receive-inv" class="group flex items-center gap-3 bg-slate-900/95 hover:bg-emerald-600 text-white pl-4 pr-3.5 py-2.5 rounded-full shadow-2xl border border-emerald-500/30 hover:border-emerald-400 transition-all duration-150 cursor-pointer transform hover:-translate-x-1 active:scale-95">
                    <span class="text-xs font-bold text-slate-200 group-hover:text-white font-outfit whitespace-nowrap tracking-wide">Receive Inventory</span>
                    <div class="w-9 h-9 rounded-full bg-emerald-600 text-white group-hover:bg-white group-hover:text-emerald-600 flex items-center justify-center shrink-0 shadow-md transition-colors">
                        <span class="material-symbols-outlined text-lg">inventory</span>
                    </div>
                </button>
            </div>

            <!-- Main Floating Action Trigger Button (FAB) -->
            <button type="button" id="dash-fab-trigger" onclick="Dashboard.toggleQuickActionMenu()" title="Quick Actions Menu" class="relative z-40 group flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 hover:from-blue-600 hover:to-indigo-500 text-white shadow-2xl border border-blue-400/40 cursor-pointer transform hover:scale-105 active:scale-95 transition-all ring-4 ring-blue-500/20">
                <span id="dash-fab-icon" class="material-symbols-outlined text-2xl transition-transform duration-300">bolt</span>
                <!-- Desktop Tooltip -->
                <span id="dash-fab-tooltip" class="absolute right-16 px-3 py-1 bg-slate-900 text-slate-100 text-xs font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 shadow-xl pointer-events-none font-outfit">
                    ⚡ Quick Actions
                </span>
            </button>
        `;

        document.body.appendChild(fabDiv);

        // Global ESC key listener for quick actions menu & modal
        if (!this._hasQuickKeyHandler) {
            this._hasQuickKeyHandler = true;
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeQuickActionMenu();
                    this.closeQuickModal();
                }
            });
        }
    },

    toggleQuickActionMenu() {
        this.isQuickMenuOpen = !this.isQuickMenuOpen;
        const menu = document.getElementById('dash-fab-menu');
        const icon = document.getElementById('dash-fab-icon');
        const backdrop = document.getElementById('dash-fab-backdrop');
        const trigger = document.getElementById('dash-fab-trigger');

        if (!menu || !icon) return;

        if (this.isQuickMenuOpen) {
            menu.classList.remove('hidden');
            menu.classList.add('flex');
            backdrop?.classList.remove('hidden');
            icon.textContent = 'close';
            icon.style.transform = 'rotate(90deg)';
            trigger?.classList.add('ring-indigo-400/40');
        } else {
            menu.classList.add('hidden');
            menu.classList.remove('flex');
            backdrop?.classList.add('hidden');
            icon.textContent = 'bolt';
            icon.style.transform = 'rotate(0deg)';
            trigger?.classList.remove('ring-indigo-400/40');
        }
    },

    closeQuickActionMenu() {
        this.isQuickMenuOpen = false;
        const menu = document.getElementById('dash-fab-menu');
        const icon = document.getElementById('dash-fab-icon');
        const backdrop = document.getElementById('dash-fab-backdrop');
        if (menu) {
            menu.classList.add('hidden');
            menu.classList.remove('flex');
        }
        if (backdrop) backdrop.classList.add('hidden');
        if (icon) {
            icon.textContent = 'bolt';
            icon.style.transform = 'rotate(0deg)';
        }
    },

    getOrCreateQuickModalOverlay() {
        let modal = document.getElementById('dash-quick-modal-overlay');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dash-quick-modal-overlay';
            modal.className = 'fixed inset-0 modal-overlay z-[100] flex items-center justify-center p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-sm hidden font-jakarta';
            document.body.appendChild(modal);
        }
        return modal;
    },

    closeQuickModal() {
        const modal = document.getElementById('dash-quick-modal-overlay');
        if (modal) {
            modal.classList.add('hidden');
            modal.innerHTML = '';
        }
        this.quickOrderItems = [];
    },

    /* -------------------------------------------------------------------------
       1. MODAL: QUICK ADD ORDER
       ------------------------------------------------------------------------- */
    async showQuickAddOrderModal() {
        this.closeQuickActionMenu();
        const modal = this.getOrCreateQuickModalOverlay();
        this.quickOrderItems = [];

        modal.innerHTML = `
            <div class="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-blue-500/40 animate-fade-in text-white my-8">
                <!-- Header -->
                <div class="px-6 py-4.5 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                            <span class="material-symbols-outlined text-xl">add_shopping_cart</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-outfit font-bold text-lg text-white">Quick Add Sales Order</h3>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 font-outfit">Instant Write</span>
                            </div>
                            <p class="text-xs text-slate-400 font-inter">Create a new customer order directly from the dashboard.</p>
                        </div>
                    </div>
                    <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer" onclick="Dashboard.closeQuickModal()">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <!-- Form Body -->
                <form id="quick-order-form" onsubmit="Dashboard.handleQuickOrderSubmit(event)" class="p-6 space-y-5 max-h-[75vh] overflow-y-auto font-inter text-xs">
                    
                    <!-- Customer Information Section -->
                    <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-4.5 space-y-3">
                        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <h4 class="font-bold text-xs text-blue-300 uppercase tracking-wider font-outfit flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-sm text-blue-400">person</span> Customer Details
                            </h4>
                            <select id="quick-order-cust-select" class="form-input text-xs py-1.5 px-3 bg-slate-900 border-slate-700 text-slate-200 rounded-lg max-w-xs" onchange="Dashboard.fillQuickOrderCustomer(this.value)">
                                <option value="">Loading customer directory...</option>
                            </select>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-[11px] font-semibold text-slate-300 mb-1">Customer Name *</label>
                                <input type="text" id="quick-ord-cust-name" class="form-input text-xs py-2 bg-slate-900 border-slate-700 text-white rounded-lg" placeholder="Write full name..." required>
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold text-slate-300 mb-1">Phone Number *</label>
                                <input type="tel" id="quick-ord-cust-phone" class="form-input text-xs py-2 bg-slate-900 border-slate-700 text-white rounded-lg" placeholder="01711223344" required>
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold text-slate-300 mb-1">Delivery Address</label>
                                <input type="text" id="quick-ord-cust-address" class="form-input text-xs py-2 bg-slate-900 border-slate-700 text-white rounded-lg" placeholder="Delivery address or store counter">
                            </div>
                        </div>
                    </div>

                    <!-- Line Items Section -->
                    <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-4.5 space-y-3">
                        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <h4 class="font-bold text-xs text-blue-300 uppercase tracking-wider font-outfit flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-sm text-blue-400">shopping_bag</span> Order Line Items
                            </h4>
                            <select id="quick-order-prod-select" class="form-input text-xs py-1.5 px-3 bg-slate-900 border-slate-700 text-slate-200 rounded-lg max-w-xs" onchange="Dashboard.fillQuickOrderProduct(this.value)">
                                <option value="">Pick From Catalog...</option>
                            </select>
                        </div>

                        <!-- Add Item Row Inputs -->
                        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                            <div class="sm:col-span-4">
                                <label class="block text-[10px] font-medium text-slate-400 mb-1">Product Item *</label>
                                <input type="text" id="quick-ord-item-name" class="form-input text-xs py-1.5 bg-slate-950 border-slate-700 text-white" placeholder="Product name">
                            </div>
                            <div class="sm:col-span-2">
                                <label class="block text-[10px] font-medium text-slate-400 mb-1">SKU</label>
                                <input type="text" id="quick-ord-item-sku" class="form-input text-xs py-1.5 bg-slate-950 border-slate-700 text-white font-mono" placeholder="SKU">
                            </div>
                            <div class="sm:col-span-2">
                                <label class="block text-[10px] font-medium text-slate-400 mb-1">Unit Price (৳) *</label>
                                <input type="number" id="quick-ord-item-price" class="form-input text-xs py-1.5 bg-slate-950 border-slate-700 text-white font-digit" placeholder="0.00" min="0">
                            </div>
                            <div class="sm:col-span-2">
                                <label class="block text-[10px] font-medium text-slate-400 mb-1">Qty *</label>
                                <input type="number" id="quick-ord-item-qty" class="form-input text-xs py-1.5 bg-slate-950 border-slate-700 text-white font-digit" value="1" min="1">
                            </div>
                            <div class="sm:col-span-2">
                                <button type="button" onclick="Dashboard.addQuickOrderLineItem()" class="btn text-xs py-1.5 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-sm cursor-pointer flex items-center justify-center gap-1">
                                    <span class="material-symbols-outlined text-xs">add</span> Add Line
                                </button>
                            </div>
                        </div>

                        <!-- Items Table -->
                        <div class="overflow-x-auto border border-slate-800 rounded-lg">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                                    <tr>
                                        <th class="p-2.5">Item & SKU</th>
                                        <th class="p-2.5 text-right">Unit Price</th>
                                        <th class="p-2.5 text-center">Qty</th>
                                        <th class="p-2.5 text-right">Total</th>
                                        <th class="p-2.5 text-center w-12">Action</th>
                                    </tr>
                                </thead>
                                <tbody id="quick-order-items-tbody" class="divide-y divide-slate-800/60">
                                    <tr>
                                        <td colspan="5" class="text-center py-5 text-slate-500 text-xs">No items added yet. Add a product line above.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Payment, Delivery & Order Calculations -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4.5">
                        <div class="space-y-3">
                            <div class="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label class="block text-[11px] font-semibold text-slate-300 mb-1">Payment Method</label>
                                    <select id="quick-ord-pay-method" class="form-input text-xs py-2 bg-slate-900 border-slate-700 text-white rounded-lg">
                                        <option value="cash" selected>Cash Register</option>
                                        <option value="bkash">bKash Merchant</option>
                                        <option value="nagad">Nagad Wallet</option>
                                        <option value="bank">Bank Transfer / Card</option>
                                        <option value="credit">Customer Credit / Due</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[11px] font-semibold text-slate-300 mb-1">Payment Status</label>
                                    <select id="quick-ord-pay-status" class="form-input text-xs py-2 bg-slate-900 border-slate-700 text-white rounded-lg">
                                        <option value="paid" selected>Paid in Full</option>
                                        <option value="pending">Pending / COD</option>
                                        <option value="partial">Partially Paid</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold text-slate-300 mb-1">Order Notes / Delivery Instructions</label>
                                <input type="text" id="quick-ord-notes" class="form-input text-xs py-2 bg-slate-900 border-slate-700 text-white rounded-lg" placeholder="e.g. Urgent counter delivery / Call before arrival">
                            </div>
                        </div>

                        <!-- Calculations Summary -->
                        <div class="bg-slate-900/90 rounded-lg p-3.5 border border-slate-800 flex flex-col justify-between space-y-2">
                            <div class="space-y-1.5 font-outfit">
                                <div class="flex justify-between text-xs text-slate-400">
                                    <span>Subtotal:</span>
                                    <span class="font-digit text-slate-200" id="quick-ord-subtotal">৳ 0.00</span>
                                </div>
                                <div class="flex justify-between items-center text-xs text-slate-400">
                                    <span>Discount (৳):</span>
                                    <input type="number" id="quick-ord-discount" oninput="Dashboard.recalcQuickOrderTotals()" class="w-24 text-right form-input text-xs py-0.5 px-2 bg-slate-950 border-slate-700 text-amber-400 font-digit" value="0" min="0">
                                </div>
                                <div class="flex justify-between items-center text-xs text-slate-400">
                                    <span>Delivery Fee (৳):</span>
                                    <input type="number" id="quick-ord-delivery-fee" oninput="Dashboard.recalcQuickOrderTotals()" class="w-24 text-right form-input text-xs py-0.5 px-2 bg-slate-950 border-slate-700 text-cyan-400 font-digit" value="0" min="0">
                                </div>
                            </div>
                            <div class="pt-2 border-t border-slate-800 flex justify-between items-center font-outfit">
                                <span class="font-bold text-sm text-white">Grand Total:</span>
                                <span class="font-extrabold text-lg text-emerald-400 font-digit" id="quick-ord-grand-total">৳ 0.00</span>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Buttons -->
                    <div class="pt-2 flex justify-end gap-2.5 font-outfit border-t border-slate-800">
                        <button type="button" onclick="Dashboard.closeQuickModal()" class="btn text-xs px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl cursor-pointer">
                            Cancel
                        </button>
                        <button type="submit" id="quick-order-submit-btn" class="btn text-xs font-bold px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border border-blue-400/40 cursor-pointer flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm">check_circle</span> Create & Confirm Order
                        </button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.remove('hidden');

        // Load customers and products in background to populate selectors
        this.loadQuickOrderMetadata();
    },

    async loadQuickOrderMetadata() {
        try {
            const [custRes, prodRes] = await Promise.all([
                API.get('customers/list'),
                API.get('products/list')
            ]);

            const customers = custRes?.data?.customers || [];
            const products = prodRes?.data?.products || [];
            this._cachedProducts = products;
            this._cachedCustomers = customers;

            const custSel = document.getElementById('quick-order-cust-select');
            if (custSel) {
                custSel.innerHTML = `<option value="">-- Pick Existing Customer --</option>` + customers.map(c => `
                    <option value="${c.id}" data-name="${c.name || ''}" data-phone="${c.phone || ''}" data-address="${c.address || ''}">
                        ${c.name} (${c.phone || 'No Phone'})
                    </option>
                `).join('');
            }

            const prodSel = document.getElementById('quick-order-prod-select');
            if (prodSel) {
                prodSel.innerHTML = `<option value="">-- Pick Product From Catalog --</option>` + products.map(p => `
                    <option value="${p.id}" data-name="${p.name || ''}" data-sku="${p.sku || ''}" data-price="${p.selling_price || 0}" data-stock="${p.current_stock || 0}">
                        ${p.name} [Stock: ${p.current_stock || 0}] — ৳ ${UI.formatMoney(p.selling_price || 0)}
                    </option>
                `).join('');
            }
        } catch (e) {}
    },

    fillQuickOrderCustomer(customerId) {
        if (!customerId) return;
        const custSel = document.getElementById('quick-order-cust-select');
        const opt = custSel?.options[custSel.selectedIndex];
        if (!opt) return;

        const nameInput = document.getElementById('quick-ord-cust-name');
        const phoneInput = document.getElementById('quick-ord-cust-phone');
        const addressInput = document.getElementById('quick-ord-cust-address');

        if (nameInput) nameInput.value = opt.getAttribute('data-name') || '';
        if (phoneInput) phoneInput.value = opt.getAttribute('data-phone') || '';
        if (addressInput) addressInput.value = opt.getAttribute('data-address') || '';
    },

    fillQuickOrderProduct(productId) {
        if (!productId) return;
        const prodSel = document.getElementById('quick-order-prod-select');
        const opt = prodSel?.options[prodSel.selectedIndex];
        if (!opt) return;

        const nameInput = document.getElementById('quick-ord-item-name');
        const skuInput = document.getElementById('quick-ord-item-sku');
        const priceInput = document.getElementById('quick-ord-item-price');

        if (nameInput) nameInput.value = opt.getAttribute('data-name') || '';
        if (skuInput) skuInput.value = opt.getAttribute('data-sku') || '';
        if (priceInput) priceInput.value = opt.getAttribute('data-price') || 0;
    },

    addQuickOrderLineItem() {
        const nameInput = document.getElementById('quick-ord-item-name');
        const skuInput = document.getElementById('quick-ord-item-sku');
        const priceInput = document.getElementById('quick-ord-item-price');
        const qtyInput = document.getElementById('quick-ord-item-qty');

        const name = nameInput?.value.trim();
        const sku = skuInput?.value.trim() || 'SKU-' + Math.floor(1000 + Math.random() * 9000);
        const price = parseFloat(priceInput?.value || 0);
        const qty = parseInt(qtyInput?.value || 1);

        if (!name) {
            UI.toast('Please enter a product/item name', 'error');
            nameInput?.focus();
            return;
        }

        if (price < 0 || isNaN(price)) {
            UI.toast('Please enter a valid price', 'error');
            priceInput?.focus();
            return;
        }

        this.quickOrderItems.push({
            id: Date.now() + Math.random(),
            item_name: name,
            product_name: name,
            variant_sku: sku,
            unit_price: price,
            quantity: qty,
            total: price * qty
        });

        // Reset input row
        if (nameInput) nameInput.value = '';
        if (skuInput) skuInput.value = '';
        if (priceInput) priceInput.value = '';
        if (qtyInput) qtyInput.value = '1';
        const prodSel = document.getElementById('quick-order-prod-select');
        if (prodSel) prodSel.value = '';

        this.renderQuickOrderTable();
    },

    removeQuickOrderLineItem(index) {
        this.quickOrderItems.splice(index, 1);
        this.renderQuickOrderTable();
    },

    renderQuickOrderTable() {
        const tbody = document.getElementById('quick-order-items-tbody');
        if (!tbody) return;

        if (this.quickOrderItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-slate-500 text-xs">No items added yet. Add a product line above.</td></tr>`;
            this.recalcQuickOrderTotals();
            return;
        }

        tbody.innerHTML = this.quickOrderItems.map((item, idx) => `
            <tr class="hover:bg-slate-900/60">
                <td class="p-2.5 font-medium text-white">
                    ${item.item_name} <span class="text-slate-400 font-mono text-[10px]">(${item.variant_sku})</span>
                </td>
                <td class="p-2.5 text-right font-digit text-slate-300">৳ ${UI.formatMoney(item.unit_price)}</td>
                <td class="p-2.5 text-center font-bold text-white font-digit">${item.quantity}</td>
                <td class="p-2.5 text-right font-bold text-emerald-400 font-digit">৳ ${UI.formatMoney(item.total)}</td>
                <td class="p-2.5 text-center">
                    <button type="button" onclick="Dashboard.removeQuickOrderLineItem(${idx})" class="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </td>
            </tr>
        `).join('');

        this.recalcQuickOrderTotals();
    },

    recalcQuickOrderTotals() {
        const subtotal = this.quickOrderItems.reduce((sum, it) => sum + (it.total || 0), 0);
        const discount = parseFloat(document.getElementById('quick-ord-discount')?.value || 0);
        const delivery = parseFloat(document.getElementById('quick-ord-delivery-fee')?.value || 0);
        const grandTotal = Math.max(0, subtotal - discount + delivery);

        const subEl = document.getElementById('quick-ord-subtotal');
        const grandEl = document.getElementById('quick-ord-grand-total');

        if (subEl) subEl.textContent = `৳ ${UI.formatMoney(subtotal)}`;
        if (grandEl) grandEl.textContent = `৳ ${UI.formatMoney(grandTotal)}`;
    },

    async handleQuickOrderSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('quick-order-submit-btn');

        if (this.quickOrderItems.length === 0) {
            UI.toast('Please add at least one line item to the order', 'error');
            return;
        }

        const custName = document.getElementById('quick-ord-cust-name')?.value.trim() || 'Walk-in Customer';
        const custPhone = document.getElementById('quick-ord-cust-phone')?.value.trim() || '01700000000';
        const custAddress = document.getElementById('quick-ord-cust-address')?.value.trim() || '';
        const payMethod = document.getElementById('quick-ord-pay-method')?.value || 'cash';
        const payStatus = document.getElementById('quick-ord-pay-status')?.value || 'paid';
        const notes = document.getElementById('quick-ord-notes')?.value.trim() || '';
        const discount = parseFloat(document.getElementById('quick-ord-discount')?.value || 0);
        const deliveryFee = parseFloat(document.getElementById('quick-ord-delivery-fee')?.value || 0);
        const subtotal = this.quickOrderItems.reduce((sum, it) => sum + (it.total || 0), 0);
        const grandTotal = Math.max(0, subtotal - discount + deliveryFee);

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Saving Order...`;
            }

            const payload = {
                customer_name: custName,
                customer_phone: custPhone,
                customer_address: custAddress,
                items: this.quickOrderItems,
                subtotal: subtotal,
                discount_amount: discount,
                delivery_charge: deliveryFee,
                total_amount: grandTotal,
                payment_method: payMethod,
                payment_status: payStatus,
                notes: notes,
                order_status: deliveryFee > 0 ? 'processing' : 'completed'
            };

            const res = await API.post('orders/create', payload);

            if (res && res.success !== false) {
                this.closeQuickModal();
                UI.toast(`Order ${res.data?.order_number || ''} created successfully!`, 'success');
                // Refresh dashboard immediately to reflect newly recorded order in KPIs & charts
                await this.loadSummary(false);
            } else {
                UI.toast(res?.message || 'Failed to create order', 'error');
            }
        } catch (err) {
            UI.toast(err.message || 'Failed to record sales order', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-outlined text-sm">check_circle</span> Create & Confirm Order`;
            }
        }
    },

    /* -------------------------------------------------------------------------
       2. MODAL: QUICK ADD EXPENSE
       ------------------------------------------------------------------------- */
    async showQuickAddExpenseModal() {
        this.closeQuickActionMenu();
        const modal = this.getOrCreateQuickModalOverlay();
        const todayStr = new Date().toISOString().split('T')[0];

        modal.innerHTML = `
            <div class="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-rose-500/40 animate-fade-in text-white my-8 font-jakarta">
                <!-- Header -->
                <div class="px-6 py-4.5 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/40">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                            <span class="material-symbols-outlined text-xl">receipt_long</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-outfit font-bold text-lg text-white">Record Operational Expense</h3>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30 font-outfit">Cash Outflow</span>
                            </div>
                            <p class="text-xs text-slate-400 font-inter">Log business expenses and update financial treasury in real-time.</p>
                        </div>
                    </div>
                    <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer" onclick="Dashboard.closeQuickModal()">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <!-- Form Body -->
                <form id="quick-expense-form" onsubmit="Dashboard.handleQuickExpenseSubmit(event)" class="p-6 space-y-4 font-inter text-xs">
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Expense Date *</label>
                            <input type="date" id="quick-exp-date" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white rounded-lg font-digit" value="${todayStr}" required>
                        </div>
                        <div>
                            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Amount (৳) *</label>
                            <input type="number" id="quick-exp-amount" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-rose-400 font-digit font-bold text-sm rounded-lg" placeholder="0.00" min="1" required>
                        </div>
                    </div>

                    <div>
                        <label class="block text-[11px] font-semibold text-slate-300 mb-1">Expense Category *</label>
                        <select id="quick-exp-category" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white rounded-lg font-semibold" required>
                            <option value="Rent & Utilities">Rent & Utilities</option>
                            <option value="Office Supplies">Office Supplies & Stationery</option>
                            <option value="Marketing & Ads">Marketing, Promotions & Ads</option>
                            <option value="Salaries & Wages">Staff Salaries & Allowances</option>
                            <option value="Logistics & Shipping">Courier & Shipping Charges</option>
                            <option value="Maintenance & Repair">Equipment Maintenance & Repair</option>
                            <option value="Tea & Refreshments">Tea, Snacks & Entertainment</option>
                            <option value="General & Miscellaneous">General & Miscellaneous</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-[11px] font-semibold text-slate-300 mb-1">Paid From Account *</label>
                        <select id="quick-exp-account" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white rounded-lg font-semibold" required>
                            <option value="Main Cash Register">Main Cash Register (Cash on Hand)</option>
                            <option value="City Bank Corporate">City Bank Corporate Account</option>
                            <option value="bKash Merchant">bKash Merchant Account</option>
                            <option value="Nagad Business">Nagad Business Wallet</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-[11px] font-semibold text-slate-300 mb-1">Description / Purpose *</label>
                        <input type="text" id="quick-exp-desc" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white rounded-lg" placeholder="e.g. Monthly store broadband bill / Warehouse packaging materials" required>
                    </div>

                    <div>
                        <label class="block text-[11px] font-semibold text-slate-300 mb-1">Receipt / Voucher Reference #</label>
                        <input type="text" id="quick-exp-ref" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white rounded-lg font-mono" placeholder="e.g. VOUCHER-9042 / BILL-AUG-01">
                    </div>

                    <!-- Footer Buttons -->
                    <div class="pt-3 flex justify-end gap-2.5 font-outfit border-t border-slate-800">
                        <button type="button" onclick="Dashboard.closeQuickModal()" class="btn text-xs px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl cursor-pointer">
                            Cancel
                        </button>
                        <button type="submit" id="quick-expense-submit-btn" class="btn text-xs font-bold px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg border border-rose-400/40 cursor-pointer flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm">receipt</span> Record Expense Outflow
                        </button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.remove('hidden');

        // Dynamically load finance accounts to populate account dropdown
        try {
            const accRes = await API.get('finance/accounts');
            const accounts = accRes?.data?.accounts || [];
            if (accounts.length > 0) {
                const accSel = document.getElementById('quick-exp-account');
                if (accSel) {
                    accSel.innerHTML = accounts.map(a => `
                        <option value="${a.name}">
                            ${a.name} — Balance: ৳ ${UI.formatMoney(a.current_balance || 0)}
                        </option>
                    `).join('');
                }
            }
        } catch (e) {}
    },

    async handleQuickExpenseSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('quick-expense-submit-btn');

        const amount = parseFloat(document.getElementById('quick-exp-amount')?.value || 0);
        const category = document.getElementById('quick-exp-category')?.value || 'General';
        const account = document.getElementById('quick-exp-account')?.value || 'Main Cash Register';
        const desc = document.getElementById('quick-exp-desc')?.value.trim() || 'Business Expense';
        const ref = document.getElementById('quick-exp-ref')?.value.trim() || ('VOUCHER-' + Math.floor(1000 + Math.random() * 9000));
        const date = document.getElementById('quick-exp-date')?.value || new Date().toISOString().split('T')[0];

        if (amount <= 0 || isNaN(amount)) {
            UI.toast('Please enter a valid expense amount', 'error');
            return;
        }

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Recording...`;
            }

            const payload = {
                amount: amount,
                category: category,
                category_name: category,
                account_name: account,
                paid_from: account,
                description: desc,
                receipt_ref: ref,
                expense_date: date,
                date: date
            };

            const res = await API.post('expenses/create', payload);

            if (res && res.success !== false) {
                this.closeQuickModal();
                UI.toast(`Expense voucher recorded for ৳ ${UI.formatMoney(amount)}!`, 'success');
                // Refresh dashboard immediately to reflect new expense in KPI cards, MTD strip and profit calculation
                await this.loadSummary(false);
            } else {
                UI.toast(res?.message || 'Failed to record expense', 'error');
            }
        } catch (err) {
            UI.toast(err.message || 'Failed to record expense voucher', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-outlined text-sm">receipt</span> Record Expense Outflow`;
            }
        }
    },

    /* -------------------------------------------------------------------------
       3. MODAL: QUICK RECEIVE INVENTORY
       ------------------------------------------------------------------------- */
    async showQuickReceiveInventoryModal() {
        this.closeQuickActionMenu();
        const modal = this.getOrCreateQuickModalOverlay();

        modal.innerHTML = `
            <div class="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-emerald-500/40 animate-fade-in text-white my-8 font-jakarta">
                <!-- Header -->
                <div class="px-6 py-4.5 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <span class="material-symbols-outlined text-xl">inventory</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-outfit font-bold text-lg text-white">Receive Inventory & Stock Inflow</h3>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-outfit">+ Stock Intake</span>
                            </div>
                            <p class="text-xs text-slate-400 font-inter">Record supplier stock deliveries, procurement intake, and warehouse restock.</p>
                        </div>
                    </div>
                    <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer" onclick="Dashboard.closeQuickModal()">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <!-- Form Body -->
                <form id="quick-receive-form" onsubmit="Dashboard.handleQuickReceiveSubmit(event)" class="p-6 space-y-4 font-inter text-xs">
                    
                    <div>
                        <label class="block text-[11px] font-semibold text-slate-300 mb-1">Select Product / SKU to Restock *</label>
                        <select id="quick-rec-product-select" class="form-input text-xs py-2.5 bg-slate-950 border-slate-800 text-white rounded-lg font-semibold" required onchange="Dashboard.updateQuickReceiveStockDisplay(this.value)">
                            <option value="">Loading inventory catalog...</option>
                        </select>
                    </div>

                    <!-- Live Stock Level Info Badge -->
                    <div id="quick-rec-stock-info" class="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div class="text-slate-400">Current Stock Balance:</div>
                        <div class="font-bold text-emerald-400 font-digit text-sm" id="quick-rec-current-stock-val">Select a product</div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Intake Quantity (+) *</label>
                            <input type="number" id="quick-rec-qty" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white font-digit font-bold text-sm rounded-lg" placeholder="e.g. 50" min="1" required>
                        </div>
                        <div>
                            <label class="block text-[11px] font-semibold text-slate-300 mb-1">Unit Purchase Cost (৳)</label>
                            <input type="number" id="quick-rec-cost" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white font-digit rounded-lg" placeholder="0.00" min="0">
                        </div>
                    </div>

                    <div>
                        <label class="block text-[11px] font-semibold text-slate-300 mb-1">Supplier / Vendor Source</label>
                        <select id="quick-rec-supplier" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white rounded-lg">
                            <option value="Direct Factory Restock">Direct Factory Restock / Wholesale Distributor</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-[11px] font-semibold text-slate-300 mb-1">Intake Reason / GRN Notes *</label>
                        <input type="text" id="quick-rec-reason" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white rounded-lg" placeholder="e.g. Bulk restock from supplier / Warehouse shipment batch #402" required value="Supplier Restock & Intake">
                    </div>

                    <!-- Footer Buttons -->
                    <div class="pt-3 flex justify-end gap-2.5 font-outfit border-t border-slate-800">
                        <button type="button" onclick="Dashboard.closeQuickModal()" class="btn text-xs px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl cursor-pointer">
                            Cancel
                        </button>
                        <button type="submit" id="quick-receive-submit-btn" class="btn text-xs font-bold px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg border border-emerald-400/40 cursor-pointer flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm">add_box</span> Confirm Inventory Intake
                        </button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.remove('hidden');

        // Populate product options and suppliers
        try {
            const [prodRes, supRes] = await Promise.all([
                API.get('products/list'),
                API.get('suppliers/list')
            ]);

            const products = prodRes?.data?.products || [];
            this._cachedInventoryProducts = products;
            const suppliers = supRes?.data?.suppliers || [];

            const prodSel = document.getElementById('quick-rec-product-select');
            if (prodSel) {
                prodSel.innerHTML = `<option value="">-- Choose Product to Receive --</option>` + products.map(p => `
                    <option value="${p.id}" data-stock="${p.current_stock || 0}" data-cost="${p.purchase_price || (p.selling_price * 0.6) || 0}">
                        ${p.name} (${p.sku || 'SKU-' + p.id}) — Current Stock: ${p.current_stock || 0}
                    </option>
                `).join('');
            }

            const supSel = document.getElementById('quick-rec-supplier');
            if (supSel && suppliers.length > 0) {
                supSel.innerHTML = suppliers.map(s => `
                    <option value="${s.name}">${s.name} (${s.supplier_code || 'SUP'})</option>
                `).join('') + `<option value="Direct Factory Restock">Direct Factory Restock</option>`;
            }
        } catch (e) {}
    },

    updateQuickReceiveStockDisplay(productId) {
        const prodSel = document.getElementById('quick-rec-product-select');
        const costInput = document.getElementById('quick-rec-cost');
        const display = document.getElementById('quick-rec-current-stock-val');
        if (!prodSel || !display) return;

        const opt = prodSel.options[prodSel.selectedIndex];
        if (!opt || !opt.value) {
            display.textContent = 'Select a product';
            return;
        }

        const stock = parseInt(opt.getAttribute('data-stock') || 0);
        const cost = parseFloat(opt.getAttribute('data-cost') || 0);
        display.textContent = `${stock} units available`;
        if (costInput && !costInput.value) {
            costInput.value = cost > 0 ? cost : '';
        }
    },

    async handleQuickReceiveSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('quick-receive-submit-btn');
        const prodSelect = document.getElementById('quick-rec-product-select');
        const qty = parseInt(document.getElementById('quick-rec-qty')?.value || 0);
        const reason = document.getElementById('quick-rec-reason')?.value.trim() || 'Manual stock intake';
        const cost = parseFloat(document.getElementById('quick-rec-cost')?.value || 0);
        const supplier = document.getElementById('quick-rec-supplier')?.value || '';

        const prodId = prodSelect?.value;
        if (!prodId) {
            UI.toast('Please select a product to receive', 'error');
            return;
        }

        if (qty <= 0 || isNaN(qty)) {
            UI.toast('Please enter a valid intake quantity', 'error');
            return;
        }

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Receiving Stock...`;
            }

            const payload = {
                product_id: parseInt(prodId),
                variant_id: parseInt(prodId),
                adjustment_type: 'manual_add',
                quantity: qty,
                reason: `${reason} (${supplier})`,
                unit_cost: cost,
                supplier: supplier
            };

            const res = await API.post('inventory/adjust', payload);

            if (res && res.success !== false) {
                this.closeQuickModal();
                UI.toast(`Successfully received +${qty} units into inventory!`, 'success');
                // Refresh dashboard immediately to update low-stock alerts, valuation and summary
                await this.loadSummary(false);
            } else {
                UI.toast(res?.message || 'Failed to adjust inventory', 'error');
            }
        } catch (err) {
            UI.toast(err.message || 'Failed to receive stock', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-outlined text-sm">add_box</span> Confirm Inventory Intake`;
            }
        }
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'dashboard') {
    window.Dashboard.render(document.getElementById('screen-container'));
}
