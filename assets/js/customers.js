/**
 * EaseBus — Real-Time Customers Management UI Module
 */

window.Customers = {
    customersData: [],
    searchTimeout: null,

    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Customer Relationship Management</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Manage customer database, purchase history, delivery addresses, and lifetime value.</p>
                </div>
                <button class="btn btn-primary flex items-center gap-2 shadow-sm" onclick="Customers.showModal()">
                    <span class="material-symbols-outlined text-sm">person_add</span> Add New Customer
                </button>
            </div>

            <!-- Top Executive KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="cust-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Customers</p>
                            <h3 class="text-2xl font-mono-data font-bold text-slate-900 mt-1" id="kpi-total-customers">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Registered client database</p>
                        </div>
                        <div class="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">people</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Lifetime Revenue</p>
                            <h3 class="text-2xl font-mono-data font-bold text-indigo-600 mt-1" id="kpi-lifetime-revenue">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Gross sales generated</p>
                        </div>
                        <div class="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">payments</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Orders Placed</p>
                            <h3 class="text-2xl font-mono-data font-bold text-emerald-600 mt-1" id="kpi-total-orders">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Completed & pending sales</p>
                        </div>
                        <div class="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">shopping_bag</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-amber-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Spend / Customer</p>
                            <h3 class="text-2xl font-mono-data font-bold text-amber-600 mt-1" id="kpi-avg-spend">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Client average order value</p>
                        </div>
                        <div class="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">insights</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Table & Filters Container -->
            <div class="card shadow-sm border border-slate-200 bg-white">
                <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div class="relative flex-1 max-w-md">
                        <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                        <input type="text" id="cust-search" placeholder="Search customer name, phone, email, address..." class="form-input pl-9 text-xs py-2" onkeyup="Customers.debounceSearch()">
                    </div>

                    <div class="flex items-center gap-3">
                        <select id="filter-segment" class="form-input text-xs py-2 w-44" onchange="Customers.filterCustomers()">
                            <option value="all">All Clients</option>
                            <option value="repeat">Repeat Buyers (2+ Orders)</option>
                            <option value="vip">VIP Buyers (৳5,000+)</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table" id="cust-table">
                        <thead>
                            <tr>
                                <th>Customer Name</th>
                                <th>Contact Information</th>
                                <th>Shipping Address</th>
                                <th class="text-center">Total Orders</th>
                                <th class="text-right">Purchased Value</th>
                                <th class="text-right">Manage</th>
                            </tr>
                        </thead>
                        <tbody id="cust-list">
                            <tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">Loading customers...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="cust-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await this.loadCustomers();
    },

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.filterCustomers(), 300);
    },

    async loadCustomers() {
        const tbody = document.getElementById('cust-list');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 text-xs">Loading customers...</td></tr>`;

        try {
            const res = await API.get('customers/list');
            const summary = res?.data?.summary || null;
            const customers = res?.data?.customers || [];

            this.customersData = customers;
            this.updateKPIs(summary, customers);
            this.filterCustomers();
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 text-xs">Failed to load customer records.</td></tr>`;
            UI.toast('Failed to load customers', 'error');
        }
    },

    updateKPIs(summary, customers) {
        let totalCount = summary?.total_customers || customers.length;
        let totalRevenue = summary?.total_spent || 0;
        let totalOrders = summary?.total_orders || 0;

        if (!summary) {
            totalRevenue = customers.reduce((sum, c) => sum + parseFloat(c.total_purchased || 0), 0);
            totalOrders = customers.reduce((sum, c) => sum + parseInt(c.total_orders || 0), 0);
        }

        const avgSpend = totalCount > 0 ? (totalRevenue / totalCount) : 0;

        const countEl = document.getElementById('kpi-total-customers');
        const revEl = document.getElementById('kpi-lifetime-revenue');
        const ordersEl = document.getElementById('kpi-total-orders');
        const avgEl = document.getElementById('kpi-avg-spend');

        if (countEl) countEl.textContent = totalCount;
        if (revEl) revEl.textContent = UI.formatMoney(totalRevenue);
        if (ordersEl) ordersEl.textContent = totalOrders;
        if (avgEl) avgEl.textContent = UI.formatMoney(avgSpend);
    },

    filterCustomers() {
        const search = (document.getElementById('cust-search')?.value || '').toLowerCase();
        const segment = document.getElementById('filter-segment')?.value || 'all';
        const tbody = document.getElementById('cust-list');
        if (!tbody) return;

        let filtered = (this.customersData || []).filter(c => {
            const matchSearch = !search ||
                (c.name || '').toLowerCase().includes(search) ||
                (c.phone || '').toLowerCase().includes(search) ||
                (c.email || '').toLowerCase().includes(search) ||
                (c.address || '').toLowerCase().includes(search);

            const orders = parseInt(c.total_orders || 0);
            const spent = parseFloat(c.total_purchased || 0);

            let matchSegment = true;
            if (segment === 'repeat') matchSegment = orders >= 2;
            if (segment === 'vip') matchSegment = spent >= 5000;

            return matchSearch && matchSegment;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">No matching customer records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(c => `
            <tr class="hover:bg-slate-50/80">
                <td class="py-3">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs font-mono">
                            ${(c.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-semibold text-slate-900 text-xs">${c.name}</div>
                            <div class="text-[11px] text-slate-400">${c.email || 'No email provided'}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3">
                    <div class="text-xs font-semibold text-slate-800 font-mono">${c.phone || '-'}</div>
                    <div class="text-[11px] text-slate-400">${c.notes ? c.notes : 'Standard Client'}</div>
                </td>
                <td class="py-3 text-xs text-slate-600 max-w-xs truncate" title="${c.address || ''}">
                    ${c.address || 'Dhaka, Bangladesh'}
                </td>
                <td class="py-3 text-center">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        ${c.total_orders || 0} Orders
                    </span>
                </td>
                <td class="data-number text-right font-bold text-blue-600 text-xs py-3">
                    ${UI.formatMoney(c.total_purchased || 0)}
                </td>
                <td class="py-3 text-right">
                    <button class="btn btn-secondary text-xs py-1 px-2.5" onclick="Customers.showModal(${c.id})">
                        Edit Profile
                    </button>
                </td>
            </tr>
        `).join('');
    },

    showModal(id = null) {
        let cust = null;
        if (id) {
            cust = this.customersData.find(c => c.id === id);
        }

        const modal = document.getElementById('cust-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">${id ? 'edit_note' : 'person_add'}</span>
                        <h3 class="font-geist font-bold text-base text-slate-900">${id ? 'Edit Customer Profile' : 'Add New Customer'}</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 rounded-lg p-1" onclick="document.getElementById('cust-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <form id="cust-form" class="space-y-4">
                        <input type="hidden" name="id" value="${id || ''}">

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">Full Name *</label>
                            <input type="text" name="name" class="form-input text-xs py-2" value="${cust?.name || ''}" placeholder="e.g. Tanvir Ahmed" required>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Phone Number *</label>
                                <input type="text" name="phone" class="form-input text-xs py-2" value="${cust?.phone || ''}" placeholder="01700112233" required>
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Email Address</label>
                                <input type="email" name="email" class="form-input text-xs py-2" value="${cust?.email || ''}" placeholder="client@domain.com">
                            </div>
                        </div>

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">Primary Delivery Address</label>
                            <textarea name="address" class="form-input text-xs py-2 h-20" placeholder="Street, Area, City, Postcode">${cust?.address || ''}</textarea>
                        </div>

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">Customer Notes</label>
                            <input type="text" name="notes" class="form-input text-xs py-2" value="${cust?.notes || ''}" placeholder="e.g. Preferred delivery time 2PM - 6PM">
                        </div>

                        <div class="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <button type="button" class="btn btn-secondary text-xs px-4 py-2" onclick="document.getElementById('cust-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary text-xs px-4 py-2" id="save-cust-btn">
                                ${id ? 'Save Customer Updates' : 'Create Customer Account'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('cust-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('save-cust-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            const payload = {
                name: form.name.value,
                phone: form.phone.value,
                email: form.email.value,
                address: form.address.value,
                notes: form.notes.value
            };

            if (form.id.value) payload.id = parseInt(form.id.value);

            try {
                if (payload.id) {
                    await API.put('customers/update', payload);
                } else {
                    await API.post('customers/create', payload);
                }

                modal.classList.add('hidden');
                UI.toast(id ? 'Customer updated successfully' : 'Customer created successfully');
                await this.loadCustomers();
            } catch (err) {
                UI.toast(err.message || 'Operation failed', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = id ? 'Save Customer Updates' : 'Create Customer Account';
            }
        });
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'customers') {
    window.Customers.render(document.getElementById('screen-container'));
}
