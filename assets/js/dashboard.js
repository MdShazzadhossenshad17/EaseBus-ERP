/**
 * EaseBus — Executive Command Center Dashboard
 */

window.Dashboard = {
    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Executive Command Center</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Welcome back, <span class="font-semibold text-slate-800">${window.APP_CONFIG.username || 'Admin'}</span>. Here is your real-time business operations overview.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button type="button" class="btn btn-secondary flex items-center gap-1 text-xs" onclick="Dashboard.refreshLive()">
                        <span class="material-symbols-outlined text-sm">refresh</span> Live Refresh
                    </button>
                    <a href="#deliveries" class="btn btn-secondary flex items-center gap-1 text-xs" onclick="window.App.pendingAction='dispatch_delivery'">
                        <span class="material-symbols-outlined text-sm">local_shipping</span> Dispatch Delivery
                    </a>
                    <a href="#expenses" class="btn btn-secondary flex items-center gap-1 text-xs" onclick="window.App.pendingAction='record_expense'">
                        <span class="material-symbols-outlined text-sm">receipt_long</span> Record Expense
                    </a>
                    <a href="#orders" class="btn btn-primary flex items-center gap-1 text-xs" onclick="window.App.pendingAction='create_order'">
                        <span class="material-symbols-outlined text-sm">add_shopping_cart</span> + New Order
                    </a>
                </div>
            </div>

            <!-- Real-Time KPI Cards Header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="dash-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-amber-500 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
            </div>

            <!-- Financial Performance Strip (MTD) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6" id="dash-mtd-container">
                <div class="card p-4 bg-slate-900 text-white shadow-sm flex items-center justify-between">
                    <div>
                        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Monthly Revenue (MTD)</p>
                        <h4 class="text-xl font-mono-data font-bold text-emerald-400 mt-0.5" id="mtd-rev">৳ 0.00</h4>
                    </div>
                    <span class="material-symbols-outlined text-3xl text-emerald-500/40">trending_up</span>
                </div>
                <div class="card p-4 bg-slate-900 text-white shadow-sm flex items-center justify-between">
                    <div>
                        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Monthly Expenses (MTD)</p>
                        <h4 class="text-xl font-mono-data font-bold text-red-400 mt-0.5" id="mtd-exp">৳ 0.00</h4>
                    </div>
                    <span class="material-symbols-outlined text-3xl text-red-500/40">trending_down</span>
                </div>
                <div class="card p-4 bg-slate-900 text-white shadow-sm flex items-center justify-between">
                    <div>
                        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Net Profit Position (MTD)</p>
                        <h4 class="text-xl font-mono-data font-bold text-blue-400 mt-0.5" id="mtd-profit">৳ 0.00</h4>
                    </div>
                    <span class="material-symbols-outlined text-3xl text-blue-500/40">account_balance_wallet</span>
                </div>
            </div>

            <!-- Charts & Operational Health Section -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <!-- 30-Day Revenue & Profit Performance Chart -->
                <div class="card lg:col-span-2 shadow-sm border-slate-200">
                    <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/70">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-600">bar_chart</span>
                            <h3 class="font-geist font-bold text-slate-900 text-base">30-Day Revenue & Profit Analytics</h3>
                        </div>
                        <span class="text-xs text-slate-500 font-medium">Daily Inflow Trend</span>
                    </div>
                    <div class="p-6">
                        <div class="overflow-x-auto pb-6 scrollbar-thin select-none">
                            <div class="h-64 flex items-end justify-start gap-2 border-b border-slate-200 pb-4 relative min-w-full" id="dash-chart">
                                <div class="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">Loading analytics chart data...</div>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row justify-between items-center mt-3 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-3 gap-2">
                            <div class="flex gap-6">
                                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded bg-blue-600"></div> Total Revenue</div>
                                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded bg-emerald-500"></div> Gross Profit</div>
                            </div>
                            <div class="text-[11px] text-slate-400 font-medium italic flex items-center gap-1">
                                <span class="material-symbols-outlined text-xs text-blue-500">swap_horiz</span> Scroll left & right to view all dates
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Operational Alerts & System Health -->
                <div class="card shadow-sm border-slate-200 flex flex-col">
                    <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/70">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-500">notifications_active</span>
                            <h3 class="font-geist font-bold text-slate-900 text-base">System Status & Alerts</h3>
                        </div>
                    </div>
                    <div class="p-0 flex-1 overflow-y-auto max-h-80">
                        <ul class="divide-y divide-slate-100" id="dash-alerts">
                            <li class="p-4 text-center text-slate-400 text-xs">Checking system health...</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Recent Orders & Logistics Activity Table -->
            <div class="card shadow-sm border-slate-200">
                <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/70">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-slate-700">receipt_long</span>
                        <h3 class="font-geist font-bold text-slate-900 text-base">Recent Sales Orders</h3>
                    </div>
                    <button class="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5" onclick="window.App.navigate('orders')">
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
            this.loadSummary(),
            this.loadChart()
        ]);
    },

    async refreshLive() {
        try {
            UI.setLoading(true);
            await Promise.all([this.loadSummary(), this.loadChart()]);
            UI.toast('Dashboard refreshed');
        } catch (e) {
            UI.toast('Failed to refresh dashboard', 'error');
        } finally {
            UI.setLoading(false);
        }
    },

    async loadSummary() {
        try {
            const res = await API.get('dashboard/summary');
            const s = res.data.summary;
            const container = document.getElementById('dash-kpi-container');
            if (!container) return;

            // Render Top KPI Cards
            container.innerHTML = `
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Sales Today</p>
                    <h3 class="text-2xl font-mono-data font-bold text-slate-900">${UI.formatMoney(s.total_sales_today)}</h3>
                    <p class="text-xs text-slate-500 mt-1">${s.sales_today_count} orders placed today</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Shipments in Transit</p>
                    <h3 class="text-2xl font-mono-data font-bold text-indigo-700">${s.active_deliveries}</h3>
                    <p class="text-xs text-slate-500 mt-1">Consignments on the road</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-amber-500 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Low Stock Alerts</p>
                    <h3 class="text-2xl font-mono-data font-bold text-amber-600">${s.low_stock_items} SKUs</h3>
                    <p class="text-xs text-slate-500 mt-1">Requires reorder stock</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Treasury Liquidity</p>
                    <h3 class="text-2xl font-mono-data font-bold text-emerald-700">${UI.formatMoney(s.total_cash)}</h3>
                    <p class="text-xs text-slate-500 mt-1">Cash & bank reserves</p>
                </div>
            `;

            // Render Financial MTD Strip
            const mtdRev = document.getElementById('mtd-rev');
            const mtdExp = document.getElementById('mtd-exp');
            const mtdProfit = document.getElementById('mtd-profit');

            if (mtdRev) mtdRev.textContent = UI.formatMoney(s.monthly_revenue);
            if (mtdExp) mtdExp.textContent = `-${UI.formatMoney(s.monthly_expenses, false)}`;
            if (mtdProfit) {
                mtdProfit.textContent = UI.formatMoney(s.monthly_net_profit);
                mtdProfit.className = `text-xl font-mono-data font-bold mt-0.5 ${s.monthly_net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
            }

            // Render System Health Alerts
            const alertsUl = document.getElementById('dash-alerts');
            if (alertsUl) {
                alertsUl.innerHTML = (s.alerts || []).map(a => `
                    <li class="p-4 flex items-start gap-3 hover:bg-slate-50 transition border-b border-slate-100 last:border-none">
                        <span class="material-symbols-outlined ${a.color} text-xl flex-shrink-0 mt-0.5">${a.icon}</span>
                        <div class="text-xs text-slate-700 font-medium leading-relaxed">${a.text}</div>
                    </li>
                `).join('');
            }

            // Render Recent Orders Table
            const tbody = document.getElementById('dash-orders-list');
            if (tbody) {
                const orders = s.recent_orders || [];
                if (orders.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">No orders recorded yet.</td></tr>`;
                    return;
                }

                const getStatusBadge = (st) => {
                    const colors = {
                        'delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        'in_transit': 'bg-blue-50 text-blue-700 border-blue-200',
                        'returned': 'bg-red-50 text-red-700 border-red-200',
                        'cancelled': 'bg-slate-100 text-slate-700 border-slate-200',
                        'pending': 'bg-amber-50 text-amber-700 border-amber-200'
                    };
                    return colors[st] || 'bg-amber-50 text-amber-700 border-amber-200';
                };

                tbody.innerHTML = orders.map(o => `
                    <tr class="hover:bg-slate-50/80 text-xs">
                        <td class="py-3">
                            <div class="font-mono-data font-bold text-slate-900">${o.order_no}</div>
                            <div class="text-[11px] text-slate-400 font-mono">${UI.formatDate(o.created_at)}</div>
                        </td>
                        <td class="font-medium text-slate-900 py-3">${o.customer_name}</td>
                        <td class="data-number text-right font-bold text-slate-900 py-3">${UI.formatMoney(o.total_amount)}</td>
                        <td class="text-center py-3">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(o.order_status)}">
                                ${(o.order_status || 'placed').replace(/_/g, ' ')}
                            </span>
                        </td>
                        <td class="text-center py-3">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                o.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }">${o.payment_status || 'unpaid'}</span>
                        </td>
                        <td class="text-right py-3">
                            <button class="btn btn-secondary text-[11px] py-0.5 px-2" onclick="window.App.navigate('orders')">
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
            const data = res.data.chart || [];
            const container = document.getElementById('dash-chart');
            if (!container) return;

            const maxRev = Math.max(...data.map(d => d.revenue), 100);
            const minWidth = Math.max(900, data.length * 34);
            container.style.minWidth = `${minWidth}px`;

            container.innerHTML = data.map((d) => {
                const revHeight = d.revenue > 0 ? Math.min(Math.max((d.revenue / maxRev) * 100, 15), 100) : 4;
                const profHeight = d.profit > 0 ? Math.min(Math.max((d.profit / maxRev) * 100, 10), 100) : 2;

                const dateObj = new Date(d.date);
                const label = `${dateObj.getDate()}/${dateObj.getMonth()+1}`;

                return `
                    <div class="flex flex-col justify-end items-center h-full flex-1 group relative min-w-[28px]">
                        <!-- Tooltip -->
                        <div class="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 transition-opacity">
                            <div class="font-bold text-slate-300 mb-0.5">${d.date}</div>
                            <div>Revenue: <span class="font-bold text-blue-300">${UI.formatMoney(d.revenue)}</span></div>
                            <div>Profit: <span class="font-bold text-emerald-300">${UI.formatMoney(d.profit)}</span></div>
                        </div>

                        <!-- Bars -->
                        <div class="w-full max-w-[18px] flex flex-col justify-end items-center h-48 gap-0.5">
                            <div class="w-full ${d.revenue > 0 ? 'bg-blue-600' : 'bg-slate-200/80'} rounded-t-sm transition-all" style="height: ${revHeight}%"></div>
                            <div class="w-full ${d.profit > 0 ? 'bg-emerald-500' : 'bg-slate-200/60'} rounded-t-sm transition-all" style="height: ${profHeight}%"></div>
                        </div>

                        <!-- Axis Label (Every single day date) -->
                        <span class="absolute -bottom-6 text-[10px] text-slate-500 font-mono font-medium tracking-tighter whitespace-nowrap">${label}</span>
                    </div>
                `;
            }).join('');

        } catch (e) {
            const container = document.getElementById('dash-chart');
            if (container) {
                container.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-red-500 text-xs">Failed to load analytics chart data</div>`;
            }
        }
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'dashboard') {
    window.Dashboard.render(document.getElementById('screen-container'));
}
