/**
 * EaseBus — Customer Returns UI Module
 */

window.Returns = {
    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Customer Returns</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Process order return requests, restock inventory items, and manage customer refunds.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-secondary flex items-center gap-1 text-xs" onclick="Returns.loadSummary(); Returns.loadReturns();">
                        <span class="material-symbols-outlined text-sm">refresh</span> Refresh
                    </button>
                    <button class="btn btn-primary flex items-center gap-1 text-xs" onclick="Returns.showCreateModal()">
                        <span class="material-symbols-outlined text-sm">assignment_return</span> Log Customer Return
                    </button>
                </div>
            </div>

            <!-- KPI Cards Header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="ret-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-slate-700 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-amber-500 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-red-500 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
            </div>

            <!-- Returns Table Card -->
            <div class="card shadow-sm border-slate-200">
                <div class="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50/70 gap-4">
                    <div class="flex items-center gap-3 flex-wrap">
                        <div class="relative w-64">
                            <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                            <input type="text" id="ret-search" placeholder="Search return #, order, customer..." class="form-input text-xs py-1.5 pl-9 pr-3 rounded border-slate-300" onkeyup="Returns.debounceSearch()">
                        </div>
                        <select id="ret-status" class="form-input text-xs py-1.5 px-3 rounded border-slate-300 w-44" onchange="Returns.loadReturns()">
                            <option value="all">All Return Statuses</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Return # & Date</th>
                                <th>Order #</th>
                                <th>Customer Details</th>
                                <th>Return Reason</th>
                                <th class="text-right">Total Refunded</th>
                                <th class="text-center">Return Status</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="ret-list">
                            <tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">Loading customer returns...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="ret-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await Promise.all([
            this.loadSummary(),
            this.loadReturns()
        ]);
    },

    searchTimeout: null,
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadReturns(), 400);
    },

    async loadSummary() {
        try {
            const res = await API.get('returns/summary');
            const s = res.data.summary;
            const container = document.getElementById('ret-kpi-container');
            if (!container) return;

            container.innerHTML = `
                <div class="card p-5 bg-white border-l-4 border-slate-700 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Returns</p>
                    <h3 class="text-2xl font-mono-data font-bold text-slate-900">${s.total_returns}</h3>
                    <p class="text-xs text-slate-500 mt-1">Total return requests</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Completed Returns</p>
                    <h3 class="text-2xl font-mono-data font-bold text-emerald-700">${s.completed_returns}</h3>
                    <p class="text-xs text-slate-500 mt-1">Restocked & completed</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-amber-500 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Pending Review</p>
                    <h3 class="text-2xl font-mono-data font-bold text-amber-600">${s.pending_returns}</h3>
                    <p class="text-xs text-slate-500 mt-1">Awaiting approval</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-red-500 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Refund Value</p>
                    <h3 class="text-2xl font-mono-data font-bold text-red-600">${UI.formatMoney(s.total_refund_amount)}</h3>
                    <p class="text-xs text-slate-500 mt-1">Total refunded value</p>
                </div>
            `;
        } catch (e) {
            console.error('Failed to load returns summary', e);
        }
    },

    async loadReturns() {
        const search = document.getElementById('ret-search')?.value || '';
        const status = document.getElementById('ret-status')?.value || 'all';
        const tbody = document.getElementById('ret-list');
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">Loading customer returns...</td></tr>`;
            const res = await API.get(`returns/list?status=${status}&search=${encodeURIComponent(search)}`);
            const returns = res.data.returns;

            if (!returns || returns.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">No matching customer returns found.</td></tr>`;
                return;
            }

            const getReasonBadge = (r) => {
                const map = {
                    'damaged': 'Damaged Item',
                    'wrong_product': 'Wrong Product',
                    'size_issue': 'Size Issue',
                    'changed_mind': 'Changed Mind',
                    'defect': 'Defective Item',
                    'other': 'Delivery Returned / Other'
                };
                return map[r] || 'Returned / Other';
            };

            const getStatusColor = (s) => {
                const colors = {
                    'pending': 'bg-amber-50 text-amber-700 border-amber-200',
                    'approved': 'bg-blue-50 text-blue-700 border-blue-200',
                    'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'rejected': 'bg-red-50 text-red-700 border-red-200'
                };
                return colors[s] || 'bg-slate-50 text-slate-700 border-slate-200';
            };

            tbody.innerHTML = returns.map(r => `
                <tr class="hover:bg-slate-50/80 text-xs">
                    <td class="py-3">
                        <div class="font-mono-data font-bold text-slate-900">${r.return_no}</div>
                        <div class="text-[11px] text-slate-500">${UI.formatDate(r.return_date || r.created_at)}</div>
                    </td>
                    <td class="font-mono-data py-3 font-semibold text-slate-700">${r.order_no}</td>
                    <td class="py-3">
                        <div class="font-medium text-slate-900">${r.customer_name}</div>
                        <div class="text-[11px] text-slate-400 font-mono">${r.customer_phone || ''}</div>
                    </td>
                    <td class="py-3">
                        <span class="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-700 border border-slate-200">${getReasonBadge(r.reason)}</span>
                        ${r.notes ? `<div class="text-[11px] text-slate-400 italic truncate max-w-xs" title="${r.notes}">${r.notes}</div>` : ''}
                    </td>
                    <td class="data-number text-right font-bold text-red-600 py-3">${UI.formatMoney(r.total_refund)}</td>
                    <td class="text-center py-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(r.status)}">
                            ${r.status}
                        </span>
                    </td>
                    <td class="text-right py-3">
                        <div class="flex items-center justify-end gap-1.5">
                            <select class="form-input text-[11px] py-1 px-2 inline-block w-28 rounded border-slate-300 bg-white" onchange="Returns.updateStatus(${r.id}, this.value)">
                                <option value="">Status...</option>
                                ${['pending', 'approved', 'completed', 'rejected']
                                    .filter(s => s !== r.status)
                                    .map(s => `<option value="${s}">${s.toUpperCase()}</option>`)
                                    .join('')}
                            </select>
                            <button type="button" onclick="Returns.deleteReturn(${r.id}, '${r.return_no}')" class="px-2 py-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors flex items-center gap-0.5 cursor-pointer" title="Remove Return Order">
                                <span class="material-symbols-outlined text-xs">delete</span> Remove
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500 text-xs">Failed to load customer returns.</td></tr>`;
        }
    },

    async deleteReturn(id, returnNo) {
        if (!confirm(`Are you sure you want to remove Return Order #${returnNo}?`)) return;

        try {
            await API.request(`returns?action=delete&id=${id}`, 'DELETE');
            UI.toast(`Return Order #${returnNo} removed successfully!`, 'success');
            await Promise.all([this.loadSummary(), this.loadReturns()]);
        } catch (e) {
            UI.toast(e.message || 'Failed to remove return order', 'error');
        }
    },

    async showCreateModal() {
        const modal = document.getElementById('ret-modal');
        if (!modal) return;

        let ordersList = [];
        try {
            const res = await API.get('orders/list?status=all');
            ordersList = res.data.orders || [];
        } catch (e) {}

        const orderOptions = ordersList.map(o => 
            `<option value="${o.id}">${o.order_no} - ${o.customer_name} (${UI.formatMoney(o.total_amount)})</option>`
        ).join('');

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-red-600">assignment_return</span>
                        <h3 class="font-geist font-semibold text-lg text-slate-900">Log Customer Return</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('ret-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <form id="create-return-form" class="p-6 space-y-4">
                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Select Sales Order *</label>
                        <select name="order_id" class="form-input text-xs" required>
                            <option value="">-- Choose Sales Order to Return --</option>
                            ${orderOptions}
                        </select>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Return Reason *</label>
                        <select name="reason" class="form-input text-xs" required>
                            <option value="other">Delivery Returned / Courier Refused</option>
                            <option value="damaged">Damaged Item / Broken Packaging</option>
                            <option value="wrong_product">Wrong Product / Wrong Variant</option>
                            <option value="size_issue">Size / Fit Issue</option>
                            <option value="changed_mind">Customer Changed Mind</option>
                            <option value="defect">Product Defect / Quality Issue</option>
                        </select>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Refund Amount (৳)</label>
                        <input type="number" name="total_refund" class="form-input text-xs" placeholder="Leave empty for order total amount" min="0">
                    </div>

                    <div class="flex items-center gap-2 p-3 bg-slate-50 rounded border border-slate-200">
                        <input type="checkbox" id="restock_inventory" name="restock_inventory" checked class="rounded border-slate-300 text-blue-600 focus:ring-blue-500">
                        <label for="restock_inventory" class="text-xs font-medium text-slate-700 cursor-pointer">Automatically restock items back into inventory stock</label>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Return Notes / Reason Details</label>
                        <textarea name="notes" class="form-input text-xs h-20" placeholder="Write additional return reason notes or customer feedback..."></textarea>
                    </div>

                    <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                        <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('ret-modal').classList.add('hidden')">Cancel</button>
                        <button type="submit" class="btn btn-primary text-xs px-4" id="submit-ret-btn">Complete Return</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('create-return-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('submit-ret-btn');
            btn.disabled = true;
            btn.textContent = 'Processing Return...';

            try {
                await API.post('returns/create', {
                    order_id: form.order_id.value,
                    reason: form.reason.value,
                    total_refund: form.total_refund.value || null,
                    restock_inventory: form.restock_inventory.checked,
                    notes: form.notes.value || ''
                });

                modal.classList.add('hidden');
                UI.toast('Customer return logged successfully!');
                await Promise.all([this.loadSummary(), this.loadReturns()]);

            } catch (err) {
                UI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Complete Return';
            }
        };
    },

    async updateStatus(id, newStatus) {
        if (!newStatus) return;

        let confirmMsg = `Update return status to ${newStatus.toUpperCase()}?`;
        if (!confirm(confirmMsg)) {
            this.loadReturns();
            return;
        }

        try {
            await API.put('returns/status', { id: id, status: newStatus });
            UI.toast('Return status updated');
            await Promise.all([this.loadSummary(), this.loadReturns()]);
        } catch (e) {
            UI.toast(e.message, 'error');
            this.loadReturns();
        }
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'returns') {
    window.Returns.render(document.getElementById('screen-container'));
}
