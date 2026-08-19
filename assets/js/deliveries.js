/**
 * EaseBus — Deliveries & Logistics UI Module
 */

window.Deliveries = {
    couriersList: [],
    unfulfilledOrders: [],

    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Deliveries & Logistics</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Track courier dispatches, manage order shipments, and monitor delivery fulfillment.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-secondary flex items-center gap-1 text-xs" onclick="Deliveries.loadSummary(); Deliveries.loadDeliveries();">
                        <span class="material-symbols-outlined text-sm">refresh</span> Refresh
                    </button>
                    <button class="btn btn-primary flex items-center gap-1 text-xs" onclick="Deliveries.showDispatchModal()">
                        <span class="material-symbols-outlined text-sm">local_shipping</span> Dispatch Shipment
                    </button>
                </div>
            </div>

            <!-- KPI Cards Header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="del-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-orange-500 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
            </div>

            <!-- Deliveries Table Card -->
            <div class="card shadow-sm border-slate-200">
                <div class="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50/70 gap-4">
                    <div class="flex items-center gap-3 flex-wrap">
                        <div class="relative w-64">
                            <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                            <input type="text" id="del-search" placeholder="Search order #, tracking, customer..." class="form-input text-xs py-1.5 pl-9 pr-3 rounded border-slate-300" onkeyup="Deliveries.debounceSearch()">
                        </div>
                        <select id="del-status" class="form-input text-xs py-1.5 px-3 rounded border-slate-300 w-52" onchange="Deliveries.loadDeliveries()">
                            <option value="all">All Delivery Statuses</option>
                            <option value="order_placed">Order Placed</option>
                            <option value="processing">Processing & Packing</option>
                            <option value="pending">Pending Pickup</option>
                            <option value="picked_up">Picked Up</option>
                            <option value="in_transit">In Transit</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="failed">Failed</option>
                            <option value="returned">Returned</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Order & Date</th>
                                <th>Customer & Delivery Address</th>
                                <th>Courier Partner</th>
                                <th>Tracking Number</th>
                                <th class="text-right">Total Order Price</th>
                                <th class="text-right">Shipping Fee</th>
                                <th class="text-center">Delivery Status</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="del-list">
                            <tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">Loading deliveries...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="del-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await Promise.all([
            this.loadSummary(),
            this.loadDeliveries(),
            this.loadCouriers()
        ]);
    },

    searchTimeout: null,
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadDeliveries(), 400);
    },

    async loadSummary() {
        try {
            const res = await API.get('deliveries/summary');
            const s = res.data.summary;
            const container = document.getElementById('del-kpi-container');
            if (!container) return;

            container.innerHTML = `
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Shipments</p>
                    <h3 class="text-2xl font-mono-data font-bold text-slate-900">${s.total_deliveries}</h3>
                    <p class="text-xs text-slate-500 mt-1">Total delivery consignments</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-orange-500 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Pending Pickups</p>
                    <h3 class="text-2xl font-mono-data font-bold text-orange-600">${s.pending_pickups}</h3>
                    <p class="text-xs text-slate-500 mt-1">Awaiting courier dispatch</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">In Transit</p>
                    <h3 class="text-2xl font-mono-data font-bold text-indigo-600">${s.in_transit}</h3>
                    <p class="text-xs text-slate-500 mt-1">Out on road for delivery</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Delivered</p>
                    <h3 class="text-2xl font-mono-data font-bold text-emerald-700">${s.delivered_count}</h3>
                    <p class="text-xs text-slate-500 mt-1">Successfully fulfilled consignments</p>
                </div>
            `;
        } catch (e) {
            console.error('Failed to load deliveries summary', e);
        }
    },

    async loadDeliveries() {
        const search = document.getElementById('del-search')?.value || '';
        const status = document.getElementById('del-status')?.value || 'all';
        const tbody = document.getElementById('del-list');
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-slate-400 text-xs">Loading deliveries...</td></tr>`;
            const res = await API.get(`deliveries/list?status=${status}&search=${encodeURIComponent(search)}`);
            const deliveries = res.data.deliveries;

            if (!deliveries || deliveries.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">No matching delivery shipments found.</td></tr>`;
                return;
            }

            const getStatusColor = (s) => {
                const colors = {
                    'order_placed': 'bg-blue-50 text-blue-700 border-blue-200',
                    'processing': 'bg-purple-50 text-purple-700 border-purple-200',
                    'pending': 'bg-amber-50 text-amber-700 border-amber-200',
                    'picked_up': 'bg-sky-50 text-sky-700 border-sky-200',
                    'in_transit': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    'out_for_delivery': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
                    'delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'failed': 'bg-red-50 text-red-700 border-red-200',
                    'returned': 'bg-orange-50 text-orange-700 border-orange-200',
                    'cancelled': 'bg-slate-100 text-slate-700 border-slate-300'
                };
                return colors[s] || 'bg-slate-50 text-slate-700 border-slate-200';
            };

            this.deliveriesList = deliveries;

            tbody.innerHTML = deliveries.map((d, idx) => `
                <tr class="hover:bg-slate-50/80 text-xs">
                    <td class="py-3">
                        <div class="font-mono-data font-bold text-slate-900">${d.order_no}</div>
                        <div class="text-[11px] text-slate-500">${UI.formatDate(d.created_at)}</div>
                    </td>
                    <td class="py-3">
                        <div class="font-medium text-slate-900">${d.customer_name}</div>
                        <div class="text-[11px] text-slate-500">${d.phone}</div>
                        <div class="text-[11px] text-slate-400 truncate max-w-xs" title="${d.address}">${d.address}</div>
                    </td>
                    <td class="py-3">
                        <div class="flex items-center gap-1">
                            <span class="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-700 border border-slate-200">${d.courier_name || 'Self Delivery'}</span>
                            <button type="button" class="text-slate-400 hover:text-slate-600 p-0.5" title="Write / Edit Delivery Partner" onclick="Deliveries.showEditShipmentModal(${idx})">
                                <span class="material-symbols-outlined text-xs">edit</span>
                            </button>
                        </div>
                    </td>
                    <td class="font-mono text-xs py-3 font-semibold text-slate-700">${d.tracking_number}</td>
                    <td class="data-number text-right font-bold text-blue-600 py-3">${UI.formatMoney(d.total_amount || 0)}</td>
                    <td class="data-number text-right font-medium text-slate-900 py-3">${UI.formatMoney(d.delivery_fee)}</td>
                    <td class="text-center py-3">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(d.status)}">
                            ${d.status.replace(/_/g, ' ')}
                        </span>
                    </td>
                    <td class="text-right py-3">
                        <select class="form-input text-[11px] py-1 px-2 inline-block w-36 rounded border-slate-300 bg-white" onchange="Deliveries.updateStatus(${d.id}, this.value)">
                            <option value="">Update Status...</option>
                            ${[
                                { id: 'order_placed', name: 'Order Placed' },
                                { id: 'processing', name: 'Processing & Packing' },
                                { id: 'pending', name: 'Pending Pickup' },
                                { id: 'picked_up', name: 'Picked Up' },
                                { id: 'in_transit', name: 'In Transit' },
                                { id: 'out_for_delivery', name: 'Out for Delivery' },
                                { id: 'delivered', name: 'Delivered' },
                                { id: 'failed', name: 'Failed' },
                                { id: 'returned', name: 'Returned' },
                                { id: 'cancelled', name: 'Cancelled' }
                            ]
                            .filter(st => st.id !== d.status)
                            .map(st => `<option value="${st.id}">${st.name}</option>`)
                            .join('')}
                        </select>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500 text-xs">Failed to load deliveries.</td></tr>`;
        }
    },

    async loadCouriers() {
        try {
            const res = await API.get('deliveries/couriers');
            this.couriersList = res.data.couriers || [];
        } catch (e) {
            console.error('Failed to load couriers', e);
        }
    },

    fillExistingCourier(courierId) {
        if (!courierId) return;
        const c = this.couriersList.find(item => item.id == courierId);
        if (!c) return;
        const input = document.getElementById('courier-write-name');
        if (input) input.value = c.name || '';
    },

    showEditShipmentModal(idx) {
        const d = (this.deliveriesList && this.deliveriesList[idx]) ? this.deliveriesList[idx] : null;
        if (!d) return;

        const modal = document.getElementById('del-modal');
        if (!modal) return;

        const quickPills = ['Pathao', 'Steadfast', 'CarryBee', 'Uber', 'SA Paribahan', 'Sundarban', 'Paperfly', 'RedX', 'Self Delivery']
            .map(p => `<button type="button" class="px-2.5 py-1 text-[11px] rounded-full border border-slate-200 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 font-medium transition" onclick="document.getElementById('edit-courier-name').value='${p}'">${p}</button>`)
            .join('');

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">edit_square</span>
                        <h3 class="font-geist font-semibold text-base text-slate-900">Edit Shipment Details (${d.order_no})</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('del-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <form id="edit-shipment-form" class="p-6 space-y-4">
                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Delivery Partner (Write Directly) *</label>
                        <input type="text" id="edit-courier-name" name="courier_name" class="form-input text-xs" value="${(d.courier_name || '').replace(/"/g, '&quot;')}" placeholder="Write partner name e.g. Pathao, Steadfast..." required>
                        <div class="flex flex-wrap gap-1.5 mt-2">
                            ${quickPills}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Tracking Number</label>
                            <input type="text" name="tracking_number" class="form-input text-xs font-mono" value="${(d.tracking_number || '').replace(/"/g, '&quot;')}">
                        </div>

                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Delivery Fee (৳)</label>
                            <input type="number" name="delivery_fee" class="form-input text-xs" value="${d.delivery_fee || 0}" min="0">
                        </div>
                    </div>

                    <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                        <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('del-modal').classList.add('hidden')">Cancel</button>
                        <button type="submit" class="btn btn-primary text-xs px-4" id="submit-edit-shipment-btn">Save & Update</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('edit-shipment-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('submit-edit-shipment-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                await API.put('deliveries/status', {
                    id: d.id,
                    courier_name: form.courier_name.value,
                    tracking_number: form.tracking_number.value,
                    delivery_fee: form.delivery_fee.value
                });

                modal.classList.add('hidden');
                UI.toast('Shipment details updated successfully!');
                await Promise.all([this.loadSummary(), this.loadDeliveries()]);
            } catch (err) {
                UI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save & Update';
            }
        };
    },

    async showDispatchModal() {
        const modal = document.getElementById('del-modal');
        
        // Fetch existing orders for dispatch
        let ordersList = [];
        try {
            const res = await API.get('orders/list?status=all');
            ordersList = res.data.orders || [];
        } catch (e) {}

        const courierOptions = this.couriersList.map(c => 
            `<option value="${c.id}">${c.name} ${c.phone ? '(' + c.phone + ')' : ''}</option>`
        ).join('');

        const orderOptions = ordersList.map(o => 
            `<option value="${o.id}">${o.order_no} - ${o.customer_name} (${UI.formatMoney(o.total_amount)})</option>`
        ).join('');

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">local_shipping</span>
                        <h3 class="font-geist font-semibold text-lg text-slate-900">Dispatch New Shipment</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('del-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <form id="dispatch-form" class="p-6 space-y-4">
                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Select Order to Dispatch *</label>
                        <select name="order_id" class="form-input text-xs" required>
                            <option value="">-- Choose Sales Order --</option>
                            ${orderOptions}
                        </select>
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <label class="form-label text-xs font-semibold uppercase text-slate-600 mb-0">Delivery Partner (Write Directly) *</label>
                            <select id="pick-courier-dropdown" class="text-xs text-blue-600 bg-transparent border-none py-0 font-medium hover:underline cursor-pointer" onchange="Deliveries.fillExistingCourier(this.value)">
                                <option value="">Or Pick Existing...</option>
                                ${courierOptions}
                            </select>
                        </div>
                        <input type="text" id="courier-write-name" name="courier_name" class="form-input text-xs" placeholder="Write partner name e.g. Steadfast, Pathao, RedX, Personal Rider..." required>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Tracking Number</label>
                            <input type="text" name="tracking_number" class="form-input text-xs font-mono" placeholder="Auto-generated if empty">
                        </div>
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Delivery Fee (৳)</label>
                            <input type="number" name="delivery_fee" class="form-input text-xs" value="60" min="0">
                        </div>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Special Notes / Instructions</label>
                        <input type="text" name="notes" class="form-input text-xs" placeholder="e.g. Handle with care, fragile item">
                    </div>

                    <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                        <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('del-modal').classList.add('hidden')">Cancel</button>
                        <button type="submit" class="btn btn-primary text-xs px-4" id="submit-dispatch-btn">Dispatch Shipment</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('dispatch-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('submit-dispatch-btn');
            btn.disabled = true;
            btn.textContent = 'Dispatching...';

            try {
                await API.post('deliveries/create', {
                    order_id: form.order_id.value,
                    courier_name: form.courier_name.value,
                    tracking_number: form.tracking_number.value,
                    delivery_fee: form.delivery_fee.value || 0,
                    notes: form.notes.value || ''
                });

                modal.classList.add('hidden');
                UI.toast('Shipment dispatched successfully!');
                await Promise.all([this.loadSummary(), this.loadDeliveries()]);

            } catch (err) {
                UI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Dispatch Shipment';
            }
        };
    },

    async updateStatus(id, newStatus) {
        if (!newStatus) return;

        let confirmMsg = `Update delivery status to ${newStatus.replace(/_/g, ' ').toUpperCase()}?`;
        if (newStatus === 'delivered') confirmMsg += `\n\nThis will mark the order as delivered and record sales revenue.`;

        if (!confirm(confirmMsg)) {
            this.loadDeliveries();
            return;
        }

        try {
            await API.put('deliveries/status', { id: id, status: newStatus });
            UI.toast('Delivery status updated');
            await Promise.all([this.loadSummary(), this.loadDeliveries()]);
        } catch (e) {
            UI.toast(e.message, 'error');
            this.loadDeliveries();
        }
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'deliveries') {
    window.Deliveries.render(document.getElementById('screen-container'));
}
