/**
 * EaseBus — Dedicated Creator Command Portal UI Module
 * Exclusively for Md Shazzad Hossen Shad (shad@dbms.com / 01521582448)
 */

window.Creator = {
    activeTab: 'overview',
    inspectedUserId: null,
    isReadOnlyMode: false,

    async render(container, route = 'creator-overview') {
        const currentUser = API.getCurrentUser();
        if (!currentUser || (currentUser.username !== 'shad@dbms.com' && currentUser.role !== 'creator')) {
            container.innerHTML = UI.emptyState('gavel', 'Access Denied', 'Creator Command Portal is strictly reserved for Md Shazzad Hossen Shad (shad@dbms.com).');
            return;
        }

        const tab = route.replace('creator-', '') || 'overview';
        this.activeTab = tab;

        let summary = { users: [], platform_totals: { total_stores: 1, total_orders: 0, total_products: 0, total_revenue: 0 } };
        try {
            const res = await API.request('users/creator_summary');
            if (res && res.data) summary = res.data;
        } catch(e) {}

        const totals = summary.platform_totals || {};
        const users = summary.users || [];

        container.innerHTML = `
            <!-- Creator Top Header Banner -->
            <div class="mb-6 p-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-indigo-500/30 relative overflow-hidden">
                <div class="absolute right-0 top-0 translate-x-4 -translate-y-4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div>
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs font-semibold mb-2">
                            <span class="material-symbols-outlined text-sm">shield_person</span> Master Creator Command Center
                        </div>
                        <h1 class="text-2xl font-bold tracking-tight">Md Shazzad Hossen Shad</h1>
                        <p class="text-slate-300 text-xs mt-1">Platform Account: <code class="text-amber-300 font-mono">shad@dbms.com</code> • Complete Real-Time Visibility over all Platform Tenants & Stores.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> LIVE MONITORING ACTIVE
                        </span>
                    </div>
                </div>
            </div>

            <!-- Creator Navigation Sub-Header Tabs -->
            <div class="flex flex-wrap border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm mb-6 text-xs font-semibold">
                <a href="#creator-overview" class="py-3 px-4 flex items-center gap-2 border-b-2 ${tab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}">
                    <span class="material-symbols-outlined text-sm">dashboard</span> Platform Overview
                </a>
                <a href="#creator-stores" class="py-3 px-4 flex items-center gap-2 border-b-2 ${tab === 'stores' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}">
                    <span class="material-symbols-outlined text-sm">store</span> Stores & Tenants (${users.length})
                </a>
                <a href="#creator-transactions" class="py-3 px-4 flex items-center gap-2 border-b-2 ${tab === 'transactions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}">
                    <span class="material-symbols-outlined text-sm">swap_horiz</span> Live Transactions Feed
                </a>
                <a href="#creator-inventory" class="py-3 px-4 flex items-center gap-2 border-b-2 ${tab === 'inventory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}">
                    <span class="material-symbols-outlined text-sm">inventory_2</span> Global Inventory Auditor
                </a>
                <a href="#creator-health" class="py-3 px-4 flex items-center gap-2 border-b-2 ${tab === 'health' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}">
                    <span class="material-symbols-outlined text-sm">dns</span> Database & Server Health
                </a>
            </div>

            <!-- Tab Content Container -->
            <div id="creator-tab-content">
                ${this.renderTabContent(tab, totals, users)}
            </div>

            <!-- Inspect User Data Modal Container -->
            <div id="creator-inspect-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;
    },

    renderTabContent(tab, totals, users) {
        if (tab === 'stores') {
            return this.renderStoresTab(users);
        }
        if (tab === 'transactions') {
            return this.renderTransactionsTab(users);
        }
        if (tab === 'inventory') {
            return this.renderInventoryTab(users);
        }
        if (tab === 'health') {
            return this.renderHealthTab();
        }
        return this.renderOverviewTab(totals, users);
    },

    renderOverviewTab(totals, users) {
        return `
            <!-- Global Metrics Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div class="card p-5 bg-white border-l-4 border-purple-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Registered Stores / Users</p>
                            <h3 class="text-2xl font-bold text-slate-900 mt-1">${totals.total_stores || users.length}</h3>
                            <p class="text-xs text-slate-500 mt-1">Active business tenants</p>
                        </div>
                        <div class="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">store</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Managed Products</p>
                            <h3 class="text-2xl font-bold text-blue-600 mt-1">${totals.total_products || 0}</h3>
                            <p class="text-xs text-slate-500 mt-1">Across all user catalogs</p>
                        </div>
                        <div class="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">inventory_2</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Platform Orders</p>
                            <h3 class="text-2xl font-bold text-emerald-600 mt-1">${totals.total_orders || 0}</h3>
                            <p class="text-xs text-slate-500 mt-1">Processed sales orders</p>
                        </div>
                        <div class="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">shopping_cart</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-amber-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Sales Volume</p>
                            <h3 class="text-2xl font-mono-data font-bold text-amber-600 mt-1">৳ ${UI.formatMoney(totals.total_revenue || 0)}</h3>
                            <p class="text-xs text-slate-500 mt-1">Total transaction volume</p>
                        </div>
                        <div class="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">payments</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stores Table Section -->
            ${this.renderStoresTab(users)}
        `;
    },

    renderStoresTab(users) {
        return `
            <div class="card shadow-sm border border-slate-200 bg-white overflow-hidden mb-8">
                <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 class="font-geist font-bold text-base text-slate-900">All Registered Stores & Tenant Accounts</h3>
                        <p class="text-xs text-slate-500">Click "Open Store Read-Only Portal" to open and inspect any user's live workspace safely in View-Only mode.</p>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Store & Owner Account</th>
                                <th>Email / Username</th>
                                <th>Account Role</th>
                                <th class="text-center">Products</th>
                                <th class="text-center">Orders</th>
                                <th class="text-right">Total Sales</th>
                                <th class="text-right font-semibold text-blue-600">Inspect & Open Portal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.length === 0 ? `<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">No registered store tenants yet.</td></tr>` : 
                            users.map(u => `
                                <tr class="hover:bg-slate-50/80">
                                    <td class="py-3">
                                        <div class="flex items-center gap-3">
                                            <div class="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs font-mono shadow-sm">
                                                ${(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div class="font-bold text-slate-900 text-xs">${u.business_name || (u.full_name + "'s Store")}</div>
                                                <div class="text-[11px] text-slate-500">${u.full_name || u.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-3 font-mono text-xs text-slate-700">${u.email || u.username}</td>
                                    <td class="py-3">
                                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${u.role === 'creator' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
                                            ${u.role === 'creator' ? 'Creator Admin' : 'Store Owner'}
                                        </span>
                                    </td>
                                    <td class="py-3 text-center font-mono text-xs font-bold text-slate-700">${u.total_products || 0}</td>
                                    <td class="py-3 text-center font-mono text-xs font-bold text-slate-700">${u.total_orders || 0}</td>
                                    <td class="py-3 text-right font-mono text-xs font-bold text-emerald-600">৳ ${UI.formatMoney(u.total_revenue || 0)}</td>
                                    <td class="py-3 text-right">
                                        <div class="flex items-center justify-end gap-2">
                                            <button class="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1" onclick="Creator.inspectUserModal(${u.id})">
                                                <span class="material-symbols-outlined text-sm">visibility</span> Quick Inspect
                                            </button>
                                            <button class="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1 shadow-sm" onclick="Creator.openUserWorkspaceReadOnly(${u.id}, '${(u.business_name || u.full_name || 'User Store').replace(/'/g, "\\'")}', '${(u.full_name || u.username || 'Owner').replace(/'/g, "\\'")}')">
                                                <span class="material-symbols-outlined text-sm">open_in_new</span> Open Portal (Read-Only)
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderTransactionsTab(users) {
        let allOrders = [];
        users.forEach(u => {
            const uid = u.id;
            const uOrders = JSON.parse(localStorage.getItem('easebus_u' + uid + '_sales') || localStorage.getItem('easebus_u' + uid + '_orders') || '[]');
            uOrders.forEach(o => {
                allOrders.push({ ...o, store_name: u.business_name || (u.full_name + "'s Store"), owner_name: u.full_name || u.username });
            });
        });

        return `
            <div class="card shadow-sm border border-slate-200 bg-white overflow-hidden mb-8">
                <div class="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 class="font-geist font-bold text-base text-slate-900">Live Real-Time Transactions Feed</h3>
                        <p class="text-xs text-slate-500">Monitor order transactions across all platform store tenants in real-time.</p>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Order Ref</th>
                                <th>Store / Tenant Name</th>
                                <th>Customer</th>
                                <th>Payment Method</th>
                                <th>Date</th>
                                <th class="text-right">Transaction Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allOrders.length === 0 ? `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">No transaction records found across platform stores.</td></tr>` : 
                            allOrders.map(o => `
                                <tr>
                                    <td class="font-bold text-xs text-slate-900">${o.order_number || ('#ORD-' + o.id)}</td>
                                    <td class="text-xs font-semibold text-blue-600">${o.store_name}</td>
                                    <td class="text-xs text-slate-700">${o.customer_name || 'Walk-in Customer'}</td>
                                    <td class="text-xs text-slate-600 font-mono">${o.payment_method || 'Cash'}</td>
                                    <td class="text-xs text-slate-500 font-mono">${UI.formatDate(o.created_at || new Date())}</td>
                                    <td class="text-right font-mono text-xs font-bold text-emerald-600">৳ ${UI.formatMoney(o.total_amount || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderInventoryTab(users) {
        let allProducts = [];
        users.forEach(u => {
            const uid = u.id;
            const uProds = JSON.parse(localStorage.getItem('easebus_u' + uid + '_products') || '[]');
            uProds.forEach(p => {
                allProducts.push({ ...p, store_name: u.business_name || (u.full_name + "'s Store") });
            });
        });

        return `
            <div class="card shadow-sm border border-slate-200 bg-white overflow-hidden mb-8">
                <div class="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 class="font-geist font-bold text-base text-slate-900">Global Inventory Auditor</h3>
                        <p class="text-xs text-slate-500">Audit all product stock items across registered store tenant catalogs.</p>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Product Item</th>
                                <th>Store Tenant</th>
                                <th>SKU</th>
                                <th>Category</th>
                                <th class="text-right">Price</th>
                                <th class="text-center">Stock Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allProducts.length === 0 ? `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">No products cataloged across platform stores.</td></tr>` : 
                            allProducts.map(p => `
                                <tr>
                                    <td class="font-bold text-xs text-slate-900">${p.name}</td>
                                    <td class="text-xs text-indigo-600 font-semibold">${p.store_name}</td>
                                    <td class="font-mono text-xs text-slate-600">${p.sku || '-'}</td>
                                    <td class="text-xs text-slate-600">${p.category || 'General'}</td>
                                    <td class="text-right font-mono text-xs font-bold text-slate-800">৳ ${UI.formatMoney(p.selling_price || 0)}</td>
                                    <td class="text-center font-mono text-xs font-bold ${p.current_stock <= (p.min_stock_level || 5) ? 'text-red-600' : 'text-emerald-600'}">${p.current_stock || 0}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderHealthTab() {
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div class="card p-6 bg-white border border-slate-200 shadow-sm">
                    <h3 class="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                        <span class="material-symbols-outlined text-emerald-600">dns</span> Database & Server Health
                    </h3>
                    <div class="space-y-3 text-xs">
                        <div class="flex justify-between py-2 border-b border-slate-100">
                            <span class="text-slate-500">Platform Deployment Runtime</span>
                            <span class="font-semibold text-slate-900 font-mono">Vercel Serverless (Edge Node)</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-slate-100">
                            <span class="text-slate-500">Database Driver</span>
                            <span class="font-semibold text-emerald-600 font-mono">PDO MySQL & User Storage Engine</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-slate-100">
                            <span class="text-slate-500">PHP API Gateway</span>
                            <span class="font-semibold text-slate-900 font-mono">vercel-php@0.7.3 Active</span>
                        </div>
                        <div class="flex justify-between py-2">
                            <span class="text-slate-500">System Security</span>
                            <span class="font-semibold text-blue-600 font-mono">Creator Super Admin Token Enforced</span>
                        </div>
                    </div>
                </div>

                <div class="card p-6 bg-white border border-slate-200 shadow-sm">
                    <h3 class="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                        <span class="material-symbols-outlined text-amber-500">shield</span> Creator Security Guard
                    </h3>
                    <p class="text-xs text-slate-600 leading-relaxed mb-4">
                        The Master Creator Command Center is restricted strictly to account <code class="text-amber-600 font-mono font-bold">shad@dbms.com</code> with password authentication.
                    </p>
                    <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                        <span class="material-symbols-outlined text-amber-600">verified</span> Read-Only Workspace Inspection Mode protects all user data from unintended alterations.
                    </div>
                </div>
            </div>
        `;
    },

    async inspectUserModal(userId) {
        const modal = document.getElementById('creator-inspect-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-amber-400 text-2xl">insights</span>
                        <div>
                            <h3 class="font-bold text-base">User Store Deep Data Inspector</h3>
                            <p class="text-xs text-slate-400">Inspecting User ID: ${userId}</p>
                        </div>
                    </div>
                    <button class="text-slate-400 hover:text-white rounded-lg p-1" onclick="document.getElementById('creator-inspect-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto flex-1 space-y-6" id="creator-inspect-modal-body">
                    <div class="text-center py-12 text-slate-400">Loading user data...</div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        try {
            const res = await API.request(`users/inspect_user?user_id=${userId}`);
            const body = document.getElementById('creator-inspect-modal-body');
            if (!res || !res.data) {
                body.innerHTML = `<div class="text-center py-8 text-red-500 text-sm">Could not load user details.</div>`;
                return;
            }

            const data = res.data;
            const u = data.user || {};
            const m = data.metrics || {};
            const prods = data.products || [];
            const orders = data.orders || [];
            const expenses = data.expenses || [];

            body.innerHTML = `
                <div class="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg font-mono shadow-md">
                            ${(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 class="text-lg font-bold text-slate-900">${u.business_name || 'Store'}</h2>
                            <p class="text-xs text-slate-500">Owner: <span class="font-semibold text-slate-800">${u.full_name || u.username}</span> (${u.email || u.username})</p>
                        </div>
                    </div>
                    <button class="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm" onclick="Creator.openUserWorkspaceReadOnly(${u.id}, '${(u.business_name || u.full_name || 'User Store').replace(/'/g, "\\'")}', '${(u.full_name || u.username || 'Owner').replace(/'/g, "\\'")}')">
                        <span class="material-symbols-outlined text-sm">open_in_new</span> Open Portal (Read-Only)
                    </button>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                        <p class="text-[11px] font-semibold uppercase text-blue-700">Total Products</p>
                        <h4 class="text-xl font-bold text-blue-900 mt-1">${m.total_products || prods.length}</h4>
                    </div>
                    <div class="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <p class="text-[11px] font-semibold uppercase text-emerald-700">Total Orders</p>
                        <h4 class="text-xl font-bold text-emerald-900 mt-1">${m.total_orders || orders.length}</h4>
                    </div>
                    <div class="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                        <p class="text-[11px] font-semibold uppercase text-amber-700">Total Revenue</p>
                        <h4 class="text-xl font-bold text-amber-900 mt-1">৳ ${UI.formatMoney(m.total_revenue || 0)}</h4>
                    </div>
                    <div class="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                        <p class="text-[11px] font-semibold uppercase text-purple-700">Net Profit</p>
                        <h4 class="text-xl font-bold text-purple-900 mt-1">৳ ${UI.formatMoney(m.net_profit || 0)}</h4>
                    </div>
                </div>

                <div class="border-b border-slate-200 flex gap-4 text-xs font-semibold">
                    <button class="py-2 px-3 border-b-2 border-blue-600 text-blue-600" id="inspect-tab-prods">User Products (${prods.length})</button>
                    <button class="py-2 px-3 border-b-2 border-transparent text-slate-500" id="inspect-tab-orders">User Sales (${orders.length})</button>
                    <button class="py-2 px-3 border-b-2 border-transparent text-slate-500" id="inspect-tab-exp">User Expenses (${expenses.length})</button>
                </div>

                <div id="inspect-content-prods" class="overflow-x-auto border border-slate-200 rounded-xl">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>SKU</th>
                                <th>Category</th>
                                <th class="text-right">Price</th>
                                <th class="text-center">Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${prods.length === 0 ? `<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">No products in this store.</td></tr>` : 
                            prods.map(p => `
                                <tr>
                                    <td class="font-bold text-xs text-slate-900">${p.name}</td>
                                    <td class="font-mono text-xs text-slate-600">${p.sku || '-'}</td>
                                    <td class="text-xs text-slate-600">${p.category || 'General'}</td>
                                    <td class="text-right font-mono text-xs font-bold text-slate-800">৳ ${UI.formatMoney(p.selling_price || 0)}</td>
                                    <td class="text-center font-mono text-xs font-bold text-blue-600">${p.current_stock || 0}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div id="inspect-content-orders" class="overflow-x-auto border border-slate-200 rounded-xl hidden">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Order Ref</th>
                                <th>Customer</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.length === 0 ? `<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">No orders recorded yet.</td></tr>` : 
                            orders.map(o => `
                                <tr>
                                    <td class="font-bold text-xs text-slate-900">${o.order_number || ('#ORD-' + o.id)}</td>
                                    <td class="text-xs text-slate-700">${o.customer_name || 'Walk-in Customer'}</td>
                                    <td class="text-xs"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">${o.order_status || 'completed'}</span></td>
                                    <td class="text-xs text-slate-500 font-mono">${UI.formatDate(o.created_at || new Date())}</td>
                                    <td class="text-right font-mono text-xs font-bold text-emerald-600">৳ ${UI.formatMoney(o.total_amount || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div id="inspect-content-exp" class="overflow-x-auto border border-slate-200 rounded-xl hidden">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Date</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenses.length === 0 ? `<tr><td colspan="4" class="text-center py-6 text-slate-400 text-xs">No expenses recorded.</td></tr>` : 
                            expenses.map(e => `
                                <tr>
                                    <td class="font-bold text-xs text-slate-900">${e.category || 'General'}</td>
                                    <td class="text-xs text-slate-600">${e.description || '-'}</td>
                                    <td class="text-xs text-slate-500 font-mono">${UI.formatDate(e.created_at || new Date())}</td>
                                    <td class="text-right font-mono text-xs font-bold text-red-600">৳ ${UI.formatMoney(e.amount || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            const tabP = document.getElementById('inspect-tab-prods');
            const tabO = document.getElementById('inspect-tab-orders');
            const tabE = document.getElementById('inspect-tab-exp');
            const contP = document.getElementById('inspect-content-prods');
            const contO = document.getElementById('inspect-content-orders');
            const contE = document.getElementById('inspect-content-exp');

            if (tabP && tabO && tabE) {
                tabP.onclick = () => {
                    tabP.className = "py-2 px-3 border-b-2 border-blue-600 text-blue-600 font-semibold";
                    tabO.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                    tabE.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                    contP.classList.remove('hidden');
                    contO.classList.add('hidden');
                    contE.classList.add('hidden');
                };

                tabO.onclick = () => {
                    tabO.className = "py-2 px-3 border-b-2 border-blue-600 text-blue-600 font-semibold";
                    tabP.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                    tabE.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                    contO.classList.remove('hidden');
                    contP.classList.add('hidden');
                    contE.classList.add('hidden');
                };

                tabE.onclick = () => {
                    tabE.className = "py-2 px-3 border-b-2 border-blue-600 text-blue-600 font-semibold";
                    tabP.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                    tabO.className = "py-2 px-3 border-b-2 border-transparent text-slate-500 font-semibold";
                    contE.classList.remove('hidden');
                    contP.classList.add('hidden');
                    contO.classList.add('hidden');
                };
            }
        } catch(err) {
            UI.toast('Failed to inspect user details', 'error');
        }
    },

    openUserWorkspaceReadOnly(userId, storeName, ownerName) {
        document.getElementById('creator-inspect-modal')?.classList.add('hidden');
        this.inspectedUserId = userId;
        this.isReadOnlyMode = true;

        const inspectedUser = {
            id: userId,
            username: 'user_' + userId,
            full_name: ownerName,
            business_name: storeName,
            role: 'admin',
            isInspectedByCreator: true
        };

        // Set temporary inspected user context
        API.setCurrentUser(inspectedUser);

        // Show persistent Top Banner
        this.showReadOnlyBanner(storeName, ownerName);

        UI.toast(`Opened Read-Only Store Workspace: ${storeName}`);
        if (window.App) {
            window.App.checkAuth();
            window.App.navigate('dashboard');
        }
    },

    showReadOnlyBanner(storeName, ownerName) {
        let banner = document.getElementById('creator-readonly-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'creator-readonly-banner';
            banner.className = 'bg-amber-500 text-slate-950 font-bold px-4 py-2.5 flex items-center justify-between text-xs shadow-lg z-50 sticky top-0 border-b border-amber-600';
            document.body.prepend(banner);
        }

        banner.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-base">visibility</span>
                <span>CREATOR READ-ONLY INSPECTION MODE: Currently viewing <strong class="underline">${storeName}</strong> (Owner: ${ownerName}). All user data is protected against modification.</span>
            </div>
            <button class="bg-slate-950 text-amber-300 hover:bg-slate-900 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors" onclick="Creator.exitReadOnlyWorkspace()">
                <span class="material-symbols-outlined text-sm">exit_to_app</span> Exit to Creator Portal
            </button>
        `;

        // Apply global CSS rule disabling write/add buttons during Creator Read-Only inspection
        let style = document.getElementById('readonly-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'readonly-style';
            style.textContent = `
                body.creator-readonly button.btn-primary:not(#creator-readonly-banner button),
                body.creator-readonly button[type="submit"],
                body.creator-readonly .btn-danger {
                    opacity: 0.5 !important;
                    pointer-events: none !important;
                    cursor: not-allowed !important;
                }
            `;
            document.head.appendChild(style);
        }
        document.body.classList.add('creator-readonly');
    },

    exitReadOnlyWorkspace() {
        const banner = document.getElementById('creator-readonly-banner');
        if (banner) banner.remove();

        document.body.classList.remove('creator-readonly');

        this.isReadOnlyMode = false;
        this.inspectedUserId = null;

        const creatorUser = {
            id: 99999,
            username: 'shad@dbms.com',
            full_name: 'Md Shazzad Hossen Shad (Creator)',
            business_name: 'EaseBus Creator Operations',
            role: 'creator',
            email: 'shad@dbms.com'
        };
        API.setCurrentUser(creatorUser);
        UI.toast('Returned to Master Creator Command Center.');
        if (window.App) {
            window.App.checkAuth();
            window.App.navigate('creator-overview');
        }
    }
};
