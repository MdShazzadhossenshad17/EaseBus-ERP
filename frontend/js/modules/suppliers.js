/**
 * EaseBus — Suppliers & Vendors UI Module
 */

window.Suppliers = {
    suppliersData: [],

    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Suppliers & Vendors</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Manage procurement sources, manufacturer contacts, and purchase orders.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-secondary flex items-center gap-1 text-xs" onclick="Suppliers.loadSummary(); Suppliers.loadSuppliers();">
                        <span class="material-symbols-outlined text-sm">refresh</span> Refresh
                    </button>
                    <button class="btn btn-primary flex items-center gap-1 text-xs" onclick="Suppliers.showModal()">
                        <span class="material-symbols-outlined text-sm">add_business</span> Add Supplier
                    </button>
                </div>
            </div>

            <!-- KPI Cards Header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="sup-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-amber-500 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
            </div>

            <!-- Suppliers Table Card -->
            <div class="card shadow-sm border-slate-200">
                <div class="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50/70 gap-4">
                    <div class="flex items-center gap-3 flex-wrap">
                        <div class="relative w-64">
                            <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                            <input type="text" id="sup-search" placeholder="Search supplier name, company, phone..." class="form-input text-xs py-1.5 pl-9 pr-3 rounded border-slate-300" onkeyup="Suppliers.debounceSearch()">
                        </div>
                        <select id="sup-status-filter" class="form-input text-xs py-1.5 px-3 rounded border-slate-300 w-36" onchange="Suppliers.loadSuppliers()">
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Contact & Company</th>
                                <th>Phone & Email</th>
                                <th>Factory / Address</th>
                                <th class="text-center">Linked Products</th>
                                <th class="text-center">Purchase Orders</th>
                                <th class="text-center">Status</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="sup-list">
                            <tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">Loading suppliers catalog...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="sup-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await Promise.all([
            this.loadSummary(),
            this.loadSuppliers()
        ]);
    },

    searchTimeout: null,
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadSuppliers(), 400);
    },

    async loadSummary() {
        try {
            const res = await API.get('suppliers/summary');
            const s = res.data.summary;
            const container = document.getElementById('sup-kpi-container');
            if (!container) return;

            container.innerHTML = `
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Active Suppliers</p>
                    <h3 class="text-2xl font-mono-data font-bold text-slate-900">${s.active_suppliers}</h3>
                    <p class="text-xs text-slate-500 mt-1">Vendor partners</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Linked Products</p>
                    <h3 class="text-2xl font-mono-data font-bold text-indigo-700">${s.total_products}</h3>
                    <p class="text-xs text-slate-500 mt-1">Products supplied</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Purchase Orders</p>
                    <h3 class="text-2xl font-mono-data font-bold text-emerald-700">${s.total_purchases}</h3>
                    <p class="text-xs text-slate-500 mt-1">Procurement orders</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-amber-500 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Procurement</p>
                    <h3 class="text-2xl font-mono-data font-bold text-amber-600">${UI.formatMoney(s.procurement_value)}</h3>
                    <p class="text-xs text-slate-500 mt-1">Total order value</p>
                </div>
            `;
        } catch (e) {
            console.error('Failed to load suppliers summary', e);
        }
    },

    async loadSuppliers() {
        const search = document.getElementById('sup-search')?.value || '';
        const status = document.getElementById('sup-status-filter')?.value || 'all';
        const tbody = document.getElementById('sup-list');
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">Loading suppliers...</td></tr>`;
            const res = await API.get(`suppliers/list?status=${status}&search=${encodeURIComponent(search)}`);
            const suppliers = res.data.suppliers || [];
            this.suppliersData = suppliers;

            if (suppliers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">No matching suppliers found.</td></tr>`;
                return;
            }

            tbody.innerHTML = suppliers.map(s => `
                <tr class="hover:bg-slate-50/80 text-xs">
                    <td class="py-3">
                        <div class="font-semibold text-slate-900">${s.name}</div>
                        ${s.company ? `<div class="text-[11px] text-slate-500 font-medium">${s.company}</div>` : ''}
                    </td>
                    <td class="py-3">
                        <div class="font-mono text-slate-800">${s.phone || '-'}</div>
                        <div class="text-[11px] text-slate-400 font-mono">${s.email || ''}</div>
                    </td>
                    <td class="py-3 text-slate-600 max-w-xs truncate" title="${s.address || ''}">
                        ${s.address || '-'}
                    </td>
                    <td class="text-center py-3">
                        <span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                            ${s.total_products}
                        </span>
                    </td>
                    <td class="text-center py-3">
                        <span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                            ${s.total_purchases}
                        </span>
                    </td>
                    <td class="text-center py-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            s.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }">${s.status}</span>
                    </td>
                    <td class="text-right py-3">
                        <button class="btn btn-secondary text-[11px] py-0.5 px-2" onclick="Suppliers.showModal(${s.id})">
                            <span class="material-symbols-outlined text-xs">edit</span> Edit
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500 text-xs">Failed to load suppliers.</td></tr>`;
        }
    },

    showModal(id = null) {
        let sup = null;
        if (id) {
            sup = (this.suppliersData || []).find(s => s.id === id);
        }

        const modal = document.getElementById('sup-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">${id ? 'edit_square' : 'add_business'}</span>
                        <h3 class="font-geist font-semibold text-lg text-slate-900">${id ? 'Edit Supplier' : 'Add New Supplier'}</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('sup-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <form id="sup-form" class="p-6 space-y-4">
                    <input type="hidden" name="id" value="${id || ''}">

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Contact Name *</label>
                            <input type="text" name="name" class="form-input text-xs" value="${(sup?.name || '').replace(/"/g, '&quot;')}" placeholder="e.g. Tanvir Ahmed" required>
                        </div>
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Company Name</label>
                            <input type="text" name="company" class="form-input text-xs" value="${(sup?.company || '').replace(/"/g, '&quot;')}" placeholder="e.g. Apex Textiles Ltd">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Phone Number</label>
                            <input type="text" name="phone" class="form-input text-xs font-mono" value="${(sup?.phone || '').replace(/"/g, '&quot;')}" placeholder="017xxxxxxxx">
                        </div>
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Email Address</label>
                            <input type="email" name="email" class="form-input text-xs" value="${(sup?.email || '').replace(/"/g, '&quot;')}" placeholder="vendor@domain.com">
                        </div>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Factory / Warehouse Address</label>
                        <textarea name="address" class="form-input text-xs h-20" placeholder="Street address, City, Country...">${sup?.address || ''}</textarea>
                    </div>

                    ${id ? `
                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Supplier Status *</label>
                        <select name="status" class="form-input text-xs" required>
                            <option value="active" ${sup?.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${sup?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    ` : ''}

                    <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                        <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('sup-modal').classList.add('hidden')">Cancel</button>
                        <button type="submit" class="btn btn-primary text-xs px-4" id="save-sup-btn">Save Supplier</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('sup-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('save-sup-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            const payload = {
                name: form.name.value,
                company: form.company.value || '',
                phone: form.phone.value || '',
                email: form.email.value || '',
                address: form.address.value || ''
            };

            if (form.id.value) {
                payload.id = form.id.value;
                payload.status = form.status.value;
            }

            try {
                if (payload.id) {
                    await API.put('suppliers/update', payload);
                } else {
                    await API.post('suppliers/create', payload);
                }

                modal.classList.add('hidden');
                UI.toast('Supplier saved successfully!');
                await Promise.all([this.loadSummary(), this.loadSuppliers()]);
            } catch (err) {
                UI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Supplier';
            }
        };
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'suppliers') {
    window.Suppliers.render(document.getElementById('screen-container'));
}
