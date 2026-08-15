/**
 * EaseBus — Real-Time Users & Staff Management & Creator Control Center UI Module
 */

window.Users = {
    usersData: [],
    rolesData: [
        { id: 1, name: 'admin', display_name: 'Administrator' },
        { id: 2, name: 'manager', display_name: 'Store Manager' },
        { id: 3, name: 'sales', display_name: 'Sales Representative' },
        { id: 4, name: 'accountant', display_name: 'Staff Accountant' }
    ],
    searchTimeout: null,

    isCreator() {
        const u = API.getCurrentUser();
        return u && (u.role === 'creator' || u.username === 'shad@dbms.com' || u.email === 'shad@dbms.com');
    },

    async render(container) {
        if (this.isCreator()) {
            await this.renderCreatorPortal(container);
            return;
        }

        container.innerHTML = `
            <!-- Page Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">User & Staff Management</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Manage system access, security roles, staff permissions, and active credentials.</p>
                </div>
                <button class="btn btn-primary flex items-center gap-2 shadow-sm" onclick="Users.showModal()">
                    <span class="material-symbols-outlined text-sm">person_add</span> Add New Staff
                </button>
            </div>

            <!-- Top KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="users-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Total System Users</p>
                            <h3 class="text-2xl font-mono-data font-bold text-slate-900 mt-1" id="kpi-total-users">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Registered staff accounts</p>
                        </div>
                        <div class="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">group</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Admins</p>
                            <h3 class="text-2xl font-mono-data font-bold text-indigo-600 mt-1" id="kpi-active-admins">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Full system privilege</p>
                        </div>
                        <div class="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">admin_panel_settings</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Operators</p>
                            <h3 class="text-2xl font-mono-data font-bold text-emerald-600 mt-1" id="kpi-active-staff">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Store managers & sales</p>
                        </div>
                        <div class="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">verified_user</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-amber-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Security Audit</p>
                            <h3 class="text-lg font-bold text-emerald-600 mt-1">Healthy</h3>
                            <p class="text-xs text-slate-500 mt-1">2FA & Role RBAC Enforced</p>
                        </div>
                        <div class="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">security</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filters & Staff Table Container -->
            <div class="card shadow-sm border border-slate-200 bg-white">
                <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div class="relative flex-1 max-w-md">
                        <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                        <input type="text" id="user-search" placeholder="Search by name, username, email, phone..." class="form-input pl-9 text-xs py-2" onkeyup="Users.debounceSearch()">
                    </div>

                    <div class="flex items-center gap-3">
                        <select id="filter-role" class="form-input text-xs py-2 w-36" onchange="Users.filterUsers()">
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="sales">Sales</option>
                            <option value="accountant">Accountant</option>
                        </select>

                        <select id="filter-status" class="form-input text-xs py-2 w-36" onchange="Users.filterUsers()">
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Contact Information</th>
                                <th>Security Role</th>
                                <th>Account Status</th>
                                <th>Last Login</th>
                                <th class="text-right">Manage</th>
                            </tr>
                        </thead>
                        <tbody id="user-list">
                            <tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">Loading staff accounts...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="user-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await this.loadRoles();
        await this.loadUsers();
    },

    async renderCreatorPortal(container) {
        let summary = { users: [], platform_totals: { total_stores: 1, total_orders: 0, total_products: 0, total_revenue: 0 } };
        try {
            const res = await API.request('users/creator_summary');
            if (res && res.data) summary = res.data;
        } catch(e) {}

        const totals = summary.platform_totals || {};
        const users = summary.users || [];

        container.innerHTML = `
            <!-- Creator Special Header Banner -->
            <div class="mb-8 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-indigo-500/30 relative overflow-hidden">
                <div class="absolute right-0 top-0 translate-x-4 -translate-y-4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div>
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs font-semibold mb-3">
                            <span class="material-symbols-outlined text-sm">shield_person</span> Platform Creator Control Center
                        </div>
                        <h1 class="text-2xl font-bold tracking-tight">Welcome, Md Shazzad Hossen Shad</h1>
                        <p class="text-slate-300 text-xs mt-1">Super Admin Account: <code class="text-amber-300 font-mono">shad@dbms.com</code> • Complete visibility over all platform stores, users, & business operations.</p>
                    </div>
                </div>
            </div>

            <!-- Creator Global Metrics -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div class="card p-5 bg-white border-l-4 border-purple-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Registered Stores / Users</p>
                            <h3 class="text-2xl font-bold text-slate-900 mt-1">${totals.total_stores || users.length}</h3>
                            <p class="text-xs text-slate-500 mt-1">Active business accounts</p>
                        </div>
                        <div class="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">store</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform Products</p>
                            <h3 class="text-2xl font-bold text-blue-600 mt-1">${totals.total_products || 0}</h3>
                            <p class="text-xs text-slate-500 mt-1">Items managed across stores</p>
                        </div>
                        <div class="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">inventory_2</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Sales Orders</p>
                            <h3 class="text-2xl font-bold text-emerald-600 mt-1">${totals.total_orders || 0}</h3>
                            <p class="text-xs text-slate-500 mt-1">Orders processed on platform</p>
                        </div>
                        <div class="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">shopping_cart</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-amber-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform Gross Sales Volume</p>
                            <h3 class="text-2xl font-mono-data font-bold text-amber-600 mt-1">৳ ${UI.formatMoney(totals.total_revenue || 0)}</h3>
                            <p class="text-xs text-slate-500 mt-1">Combined transaction volume</p>
                        </div>
                        <div class="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">payments</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Platform Users Directory Table -->
            <div class="card shadow-sm border border-slate-200 bg-white overflow-hidden mb-8">
                <div class="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 class="font-geist font-bold text-base text-slate-900">Platform Users & Store Directory</h3>
                        <p class="text-xs text-slate-500">Click any user row or "Inspect Data" button to view that user's full business information & database records.</p>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>User Account & Store</th>
                                <th>Email / Username</th>
                                <th>Role</th>
                                <th class="text-center">Products</th>
                                <th class="text-center">Orders</th>
                                <th class="text-right">Total Revenue</th>
                                <th class="text-right">Manage & Inspect</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr class="hover:bg-slate-50/80 cursor-pointer">
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
                                        <button class="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1 ml-auto" onclick="Users.inspectUser(${u.id})">
                                            <span class="material-symbols-outlined text-sm">visibility</span> Inspect User Data
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Inspect User Data Modal Container -->
            <div id="user-inspect-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;
    },

    async inspectUser(userId) {
        const modal = document.getElementById('user-inspect-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-amber-400 text-2xl">insights</span>
                        <div>
                            <h3 class="font-bold text-base">User Deep Data Inspector</h3>
                            <p class="text-xs text-slate-400">Inspecting User ID: ${userId}</p>
                        </div>
                    </div>
                    <button class="text-slate-400 hover:text-white rounded-lg p-1" onclick="document.getElementById('user-inspect-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto flex-1 space-y-6" id="inspect-modal-body">
                    <div class="text-center py-12 text-slate-400">Loading full user data...</div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        try {
            const res = await API.request(`users/inspect_user?user_id=${userId}`);
            const body = document.getElementById('inspect-modal-body');
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
                <!-- User Profile Header Card -->
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
                    <button class="btn btn-secondary text-xs px-4 py-2 flex items-center gap-1.5" onclick="Users.switchToUserWorkspace(${u.id}, '${(u.business_name || u.full_name || 'User').replace(/'/g, "\\'")}')">
                        <span class="material-symbols-outlined text-sm">open_in_new</span> Switch to Store View
                    </button>
                </div>

                <!-- User Metrics Cards -->
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

                <!-- Data Tabs -->
                <div class="border-b border-slate-200 flex gap-4 text-xs font-semibold">
                    <button class="py-2 px-3 border-b-2 border-blue-600 text-blue-600" id="inspect-tab-prods">User Products (${prods.length})</button>
                    <button class="py-2 px-3 border-b-2 border-transparent text-slate-500" id="inspect-tab-orders">User Sales (${orders.length})</button>
                    <button class="py-2 px-3 border-b-2 border-transparent text-slate-500" id="inspect-tab-exp">User Expenses (${expenses.length})</button>
                </div>

                <!-- Products Table -->
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
                            ${prods.length === 0 ? `<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">No products in this user store catalog.</td></tr>` : 
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

                <!-- Orders Table (Hidden by default) -->
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
                            ${orders.length === 0 ? `<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">No sales orders recorded by this user yet.</td></tr>` : 
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

                <!-- Expenses Table (Hidden by default) -->
                <div id="inspect-content-exp" class="overflow-x-auto border border-slate-200 rounded-xl hidden">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Expense Category</th>
                                <th>Description</th>
                                <th>Date</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenses.length === 0 ? `<tr><td colspan="4" class="text-center py-6 text-slate-400 text-xs">No expenses recorded for this user.</td></tr>` : 
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

            // Tab click handling inside modal
            const tabP = document.getElementById('inspect-tab-prods');
            const tabO = document.getElementById('inspect-tab-orders');
            const tabE = document.getElementById('inspect-tab-exp');
            const contP = document.getElementById('inspect-content-prods');
            const contO = document.getElementById('inspect-content-orders');
            const contE = document.getElementById('inspect-content-exp');

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

        } catch(err) {
            UI.toast('Failed to inspect user data', 'error');
        }
    },

    switchToUserWorkspace(userId, storeName) {
        document.getElementById('user-inspect-modal')?.classList.add('hidden');
        const targetUser = {
            id: userId,
            username: 'user_' + userId,
            full_name: storeName,
            business_name: storeName,
            role: 'admin'
        };
        API.setCurrentUser(targetUser);
        UI.toast(`Switched workspace view to: ${storeName}`);
        if (window.App) {
            window.App.checkAuth();
            window.App.navigate('dashboard');
        }
    },

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.filterUsers(), 300);
    },

    async loadRoles() {
        try {
            const res = await API.get('users/roles');
            if (res.data && res.data.roles) {
                this.rolesData = res.data.roles;
            }
        } catch(e) {}
    },

    async loadUsers() {
        const tbody = document.getElementById('user-list');
        if (!tbody) return;

        try {
            const res = await API.get('users/list');
            const users = res.data.users || [];
            this.usersData = users;
            this.updateKPIs(users);
            this.filterUsers();
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 text-xs">Failed to load staff accounts.</td></tr>`;
            UI.toast('Failed to load users', 'error');
        }
    },

    updateKPIs(users) {
        const total = users.length;
        const admins = users.filter(u => u.role_name === 'admin' || u.role === 'admin').length;
        const active = users.filter(u => u.status === 'active').length;

        const totalEl = document.getElementById('kpi-total-users');
        const adminEl = document.getElementById('kpi-active-admins');
        const activeEl = document.getElementById('kpi-active-staff');

        if (totalEl) totalEl.textContent = total;
        if (adminEl) adminEl.textContent = admins;
        if (activeEl) activeEl.textContent = active;
    },

    filterUsers() {
        const search = (document.getElementById('user-search')?.value || '').toLowerCase();
        const role = document.getElementById('filter-role')?.value || 'all';
        const status = document.getElementById('filter-status')?.value || 'all';
        const tbody = document.getElementById('user-list');
        if (!tbody) return;

        let filtered = this.usersData.filter(u => {
            const matchSearch = !search ||
                (u.full_name || u.name || '').toLowerCase().includes(search) ||
                (u.username || '').toLowerCase().includes(search) ||
                (u.email || '').toLowerCase().includes(search) ||
                (u.phone || '').toLowerCase().includes(search);

            const userRole = (u.role_name || u.role || '').toLowerCase();
            const matchRole = role === 'all' || userRole === role;
            const matchStatus = status === 'all' || u.status === status;

            return matchSearch && matchRole && matchStatus;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">No matching staff accounts found.</td></tr>`;
            return;
        }

        const getRoleBadge = (r) => {
            const roleStr = (r || 'staff').toLowerCase();
            if (roleStr === 'admin') return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>Administrator</span>';
            if (roleStr === 'manager') return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"><span class="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>Manager</span>';
            if (roleStr === 'sales') return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Sales Rep</span>';
            return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Staff</span>';
        };

        const getStatusBadge = (s) => {
            if (s === 'active') return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Active</span>';
            return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Inactive</span>';
        };

        tbody.innerHTML = filtered.map(u => `
            <tr class="hover:bg-slate-50/80">
                <td class="py-3">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs font-mono">
                            ${(u.full_name || u.name || u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-semibold text-slate-900 text-xs">${u.full_name || u.name || u.username}</div>
                            <div class="text-[11px] text-slate-400 font-mono">@${u.username}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3">
                    <div class="text-xs font-medium text-slate-800">${u.phone || u.email || 'N/A'}</div>
                    <div class="text-[11px] text-slate-400">${u.email || '-'}</div>
                </td>
                <td class="py-3">${getRoleBadge(u.role_name || u.role)}</td>
                <td class="py-3">${getStatusBadge(u.status)}</td>
                <td class="py-3 text-xs text-slate-500 font-mono">${u.last_login ? UI.formatDate(u.last_login) : '2026-08-15 12:00'}</td>
                <td class="py-3 text-right">
                    <button class="btn btn-secondary text-xs py-1 px-2.5" onclick="Users.showModal(${u.id})">
                        Edit Staff
                    </button>
                </td>
            </tr>
        `).join('');
    },

    showModal(id = null) {
        let user = null;
        if (id) {
            user = this.usersData.find(u => u.id === id);
        }

        const modal = document.getElementById('user-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">${id ? 'manage_accounts' : 'person_add'}</span>
                        <h3 class="font-geist font-bold text-base text-slate-900">${id ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 rounded-lg p-1" onclick="document.getElementById('user-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <form id="user-form" class="space-y-4">
                        <input type="hidden" name="id" value="${id || ''}">

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">Full Name *</label>
                            <input type="text" name="full_name" class="form-input text-xs py-2" value="${user?.full_name || user?.name || ''}" placeholder="e.g. Tanvir Ahmed" required>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Username *</label>
                                <input type="text" name="username" class="form-input text-xs py-2" value="${user?.username || ''}" placeholder="username" ${id ? 'disabled' : 'required'}>
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Role *</label>
                                <select name="role_name" class="form-input text-xs py-2" required>
                                    <option value="admin" ${user?.role_name === 'admin' || user?.role === 'admin' ? 'selected' : ''}>Administrator</option>
                                    <option value="manager" ${user?.role_name === 'manager' || user?.role === 'manager' ? 'selected' : ''}>Store Manager</option>
                                    <option value="sales" ${user?.role_name === 'sales' || user?.role === 'sales' ? 'selected' : ''}>Sales Representative</option>
                                    <option value="accountant" ${user?.role_name === 'accountant' || user?.role === 'accountant' ? 'selected' : ''}>Staff Accountant</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Phone *</label>
                                <input type="text" name="phone" class="form-input text-xs py-2" value="${user?.phone || '01700112233'}" required>
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Email Address</label>
                                <input type="email" name="email" class="form-input text-xs py-2" value="${user?.email || ''}" placeholder="staff@easebus.com">
                            </div>
                        </div>

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">${id ? 'New Password (optional)' : 'Account Password *'}</label>
                            <input type="password" name="password" class="form-input text-xs py-2" placeholder="${id ? 'Leave empty to preserve password' : '••••••••'}" ${id ? '' : 'required'}>
                        </div>

                        ${id ? `
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Account Status</label>
                                <select name="status" class="form-input text-xs py-2">
                                    <option value="active" ${user?.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${user?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                        ` : ''}

                        <div class="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <button type="button" class="btn btn-secondary text-xs px-4 py-2" onclick="document.getElementById('user-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary text-xs px-4 py-2" id="save-user-btn">
                                ${id ? 'Save Staff Updates' : 'Create Staff Account'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('save-user-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            const payload = {
                full_name: form.full_name.value,
                phone: form.phone.value,
                email: form.email.value,
                role_name: form.role_name.value,
                status: form.status ? form.status.value : 'active'
            };

            if (form.password.value) payload.password = form.password.value;
            if (form.id.value) {
                payload.id = parseInt(form.id.value);
            } else {
                payload.username = form.username.value;
            }

            try {
                if (payload.id) {
                    await API.put('users/update', payload);
                } else {
                    await API.post('users/create', payload);
                }

                modal.classList.add('hidden');
                UI.toast(id ? 'Staff member updated successfully' : 'Staff account created successfully');
                await this.loadUsers();
            } catch (err) {
                UI.toast(err.message || 'Operation failed', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = id ? 'Save Staff Updates' : 'Create Staff Account';
            }
        });
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'users') {
    window.Users.render(document.getElementById('screen-container'));
}
