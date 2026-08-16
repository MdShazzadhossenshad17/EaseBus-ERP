/**
 * EaseBus — Inventory Management UI Module
 */

window.Inventory = {
    activeTab: 'stock', // 'stock' or 'movements'
    inventoryData: [],
    movementsData: [],

    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Inventory Management</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Real-time stock level monitoring, low-stock alerts, asset valuation, and movement logs.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-secondary flex items-center gap-1 text-xs" onclick="Inventory.loadSummary(); Inventory.loadData();">
                        <span class="material-symbols-outlined text-sm">refresh</span> Refresh
                    </button>
                    <button class="btn btn-primary flex items-center gap-1 text-xs" onclick="Inventory.showAdjustModal()">
                        <span class="material-symbols-outlined text-sm">tune</span> Adjust Stock
                    </button>
                </div>
            </div>

            <!-- KPI Summary Cards Header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="inv-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-orange-500 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-red-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
            </div>

            <!-- Tabs Navigation -->
            <div class="card shadow-sm border-slate-200">
                <div class="border-b border-slate-200 px-6 pt-3 bg-slate-50/70 flex justify-between items-center flex-wrap gap-4">
                    <div class="flex gap-6">
                        <button id="tab-btn-stock" class="py-3 font-medium text-sm border-b-2 border-blue-600 text-blue-600 flex items-center gap-2" onclick="Inventory.switchTab('stock')">
                            <span class="material-symbols-outlined text-lg">inventory_2</span> Stock Inventory & Levels
                        </button>
                        <button id="tab-btn-movements" class="py-3 font-medium text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2" onclick="Inventory.switchTab('movements')">
                            <span class="material-symbols-outlined text-lg">history</span> Movement Audit Logs
                        </button>
                    </div>

                    <!-- Search Filter Bar -->
                    <div class="py-2">
                        <div class="relative w-64">
                            <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                            <input type="text" id="inv-search" placeholder="Search SKU or product..." class="form-input text-xs py-1.5 pl-9 pr-3 rounded border-slate-300" onkeyup="Inventory.debounceSearch()">
                        </div>
                    </div>
                </div>

                <!-- Tab Content 1: Stock Inventory Table -->
                <div id="tab-content-stock" class="p-0 overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Variant SKU</th>
                                <th>Product Item</th>
                                <th>Variant</th>
                                <th>Location</th>
                                <th class="text-center">Stock Status</th>
                                <th class="text-right">Current Stock</th>
                                <th class="text-right">Avg Unit Cost</th>
                                <th class="text-right">Asset Valuation</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="inv-list">
                            <tr><td colspan="9" class="text-center py-8 text-slate-400">Loading stock inventory...</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Tab Content 2: Stock Movement Logs -->
                <div id="tab-content-movements" class="p-0 overflow-x-auto hidden">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Product & SKU</th>
                                <th>Type</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right">Stock Before</th>
                                <th class="text-right">Stock After</th>
                                <th>Reason / Order</th>
                                <th>Operator</th>
                            </tr>
                        </thead>
                        <tbody id="movements-list">
                            <tr><td colspan="8" class="text-center py-8 text-slate-400">Loading movement audit logs...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Adjust & Timeline Modal -->
            <div id="inv-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await Promise.all([
            this.loadSummary(),
            this.loadInventory()
        ]);

        this.startLivePolling();
    },

    pollingTimer: null,

    startLivePolling() {
        this.stopLivePolling();
        this.pollingTimer = setInterval(() => {
            if (window.App && window.App.currentRoute === 'inventory') {
                this.loadSummary(true);
                if (this.activeTab === 'stock') {
                    this.loadInventory(true);
                } else {
                    this.loadMovements(true);
                }
            }
        }, 4000);
    },

    stopLivePolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
    },

    searchTimeout: null,
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadData(), 400);
    },

    loadData() {
        if (this.activeTab === 'stock') {
            this.loadInventory();
        } else {
            this.loadMovements();
        }
    },

    switchTab(tab) {
        this.activeTab = tab;
        const stockBtn = document.getElementById('tab-btn-stock');
        const moveBtn = document.getElementById('tab-btn-movements');
        const stockContent = document.getElementById('tab-content-stock');
        const moveContent = document.getElementById('tab-content-movements');

        if (tab === 'stock') {
            stockBtn.className = 'py-3 font-medium text-sm border-b-2 border-blue-600 text-blue-600 flex items-center gap-2';
            moveBtn.className = 'py-3 font-medium text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2';
            stockContent.classList.remove('hidden');
            moveContent.classList.add('hidden');
            this.loadInventory();
        } else {
            moveBtn.className = 'py-3 font-medium text-sm border-b-2 border-blue-600 text-blue-600 flex items-center gap-2';
            stockBtn.className = 'py-3 font-medium text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2';
            moveContent.classList.remove('hidden');
            stockContent.classList.add('hidden');
            this.loadMovements();
        }
    },

    async loadSummary(isSilent = false) {
        try {
            const res = await API.get('inventory/summary');
            const s = res.data.summary;
            const container = document.getElementById('inv-kpi-container');
            if (!container) return;

            const jsonStr = JSON.stringify(s);
            if (isSilent && this._lastSummaryJsonStr === jsonStr) {
                return; // Omit re-rendering KPI summary cards if data hasn't changed (zero blinking!)
            }
            this._lastSummaryJsonStr = jsonStr;

            container.innerHTML = `
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Stock Items</p>
                    <h3 class="text-2xl font-mono-data font-bold text-slate-900">${s.total_items.toLocaleString()}</h3>
                    <p class="text-xs text-slate-500 mt-1">Total physical stock in warehouse</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-orange-500 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Low Stock Alerts</p>
                    <h3 class="text-2xl font-mono-data font-bold text-orange-600">${s.low_stock_count}</h3>
                    <p class="text-xs text-slate-500 mt-1">Items at or below reorder threshold</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-red-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Out of Stock</p>
                    <h3 class="text-2xl font-mono-data font-bold text-red-600">${s.out_of_stock_count}</h3>
                    <p class="text-xs text-slate-500 mt-1">Variants requiring immediate restock</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Asset Value</p>
                    <h3 class="text-2xl font-mono-data font-bold text-emerald-700">${UI.formatMoney(s.total_asset_value)}</h3>
                    <p class="text-xs text-slate-500 mt-1">Total cost value of current stock</p>
                </div>
            `;
        } catch (e) {
            console.error('Failed to load inventory summary', e);
        }
    },

    async loadInventory(isSilent = false) {
        const search = document.getElementById('inv-search')?.value || '';
        const tbody = document.getElementById('inv-list');
        if (!tbody) return;

        try {
            if (!isSilent && (!this.inventoryData || this.inventoryData.length === 0)) {
                tbody.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-slate-400 text-xs">Loading stock inventory...</td></tr>`;
            }
            const res = await API.get(`inventory/list?search=${encodeURIComponent(search)}`);
            const data = res.data.inventory;

            const jsonStr = JSON.stringify(data);
            if (isSilent && this._lastInvJsonStr === jsonStr) {
                return; // Omit DOM re-rendering if data hasn't changed (zero blinking!)
            }
            this._lastInvJsonStr = jsonStr;
            this.inventoryData = data;

            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-400 text-xs">No matching inventory items found.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(v => {
                const stock = parseInt(v.current_stock);
                const minStock = parseInt(v.min_stock_level || 5);
                const cost = parseFloat(v.avg_cost_price || 0);
                const val = stock * cost;

                let badge = `<span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">In Stock</span>`;
                if (stock <= 0) {
                    badge = `<span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">Out of Stock</span>`;
                } else if (stock <= minStock) {
                    badge = `<span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-orange-50 text-orange-700 border border-orange-200">Low Stock (${stock}/${minStock})</span>`;
                }

                return `
                    <tr class="hover:bg-slate-50/80">
                        <td class="font-mono-data text-xs text-slate-700 font-medium py-3">${v.variant_sku}</td>
                        <td class="font-medium text-slate-900 text-xs py-3">${v.product_name}</td>
                        <td class="text-xs text-slate-600 py-3">${v.variant_name}</td>
                        <td class="text-xs text-slate-500 py-3">${v.location_name}</td>
                        <td class="text-center py-3">${badge}</td>
                        <td class="data-number text-right font-bold text-xs py-3 ${stock <= 0 ? 'text-red-600' : 'text-slate-900'}">${stock}</td>
                        <td class="data-number text-right text-xs py-3">${UI.formatMoney(cost)}</td>
                        <td class="data-number text-right font-semibold text-xs py-3 text-blue-700">${UI.formatMoney(val)}</td>
                        <td class="text-right py-3">
                            <div class="flex justify-end gap-1 font-outfit">
                                <button class="btn btn-primary bg-blue-600 hover:bg-blue-500 text-white text-[11px] py-1 px-2.5 font-bold rounded-lg shadow-sm border border-blue-400/30 cursor-pointer inline-flex items-center gap-1" onclick="Inventory.showAdjustModal(${v.variant_id}, '${v.variant_sku}', '${(v.product_name || '').replace(/'/g, "\\'")}')">
                                    <span class="material-symbols-outlined text-xs">tune</span> Adjust
                                </button>
                                <button class="btn btn-secondary text-xs py-1 px-2.5 text-[11px] inline-flex items-center gap-1 font-semibold rounded-lg hover:text-white cursor-pointer" onclick="Inventory.showEditModal(${v.product_id})">
                                    <span class="material-symbols-outlined text-xs">edit</span> Edit
                                </button>
                                <button class="btn btn-secondary text-xs py-1 px-2.5 text-[11px] inline-flex items-center gap-1 font-semibold rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 cursor-pointer" onclick="Inventory.confirmDelete(${v.product_id}, '${(v.product_name || '').replace(/'/g, "\\'")}')">
                                    <span class="material-symbols-outlined text-xs">delete</span> Remove
                                </button>
                                <button class="btn btn-secondary text-xs py-1 px-2.5 text-[11px] inline-flex items-center gap-1 font-semibold rounded-lg hover:text-white cursor-pointer" onclick="Inventory.showHistoryModal(${v.variant_id}, '${(v.product_name || '').replace(/'/g, "\\'")}')">
                                    <span class="material-symbols-outlined text-xs">history</span> History
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-red-500 text-xs">Failed to load inventory.</td></tr>`;
        }
    },

    async loadMovements(isSilent = false) {
        const tbody = document.getElementById('movements-list');
        if (!tbody) return;

        try {
            if (!isSilent && (!this.movementsData || this.movementsData.length === 0)) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-slate-400 text-xs">Loading movement logs...</td></tr>`;
            }
            const res = await API.get('inventory/movements');
            const data = res.data.movements;

            const jsonStr = JSON.stringify(data);
            if (isSilent && this._lastMovJsonStr === jsonStr) {
                return; // Omit DOM re-rendering if data hasn't changed (zero blinking!)
            }
            this._lastMovJsonStr = jsonStr;
            this.movementsData = data;

            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400 text-xs">No stock movement logs found.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(m => {
                const qty = parseInt(m.quantity);
                const isPositive = qty > 0;
                
                let typeBadge = `<span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700">${m.movement_type}</span>`;
                if (m.movement_type === 'manual_add' || m.movement_type === 'purchase') {
                    typeBadge = `<span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700">+ Add Stock</span>`;
                } else if (m.movement_type === 'sale') {
                    typeBadge = `<span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700">- Sale</span>`;
                } else if (m.movement_type === 'damage' || m.movement_type === 'lost') {
                    typeBadge = `<span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-50 text-red-700">- ${m.movement_type}</span>`;
                } else if (m.movement_type === 'return') {
                    typeBadge = `<span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-50 text-purple-700">+ Return</span>`;
                }

                return `
                    <tr class="hover:bg-slate-50/80 text-xs">
                        <td class="text-slate-500 py-2.5">${UI.formatDate(m.created_at)}</td>
                        <td class="font-medium text-slate-900 py-2.5">${m.product_name} <span class="text-slate-400 font-mono text-[11px]">(${m.variant_sku})</span></td>
                        <td class="py-2.5">${typeBadge}</td>
                        <td class="data-number text-right font-bold py-2.5 ${isPositive ? 'text-emerald-600' : 'text-red-600'}">
                            ${isPositive ? '+' : ''}${qty}
                        </td>
                        <td class="data-number text-right text-slate-500 py-2.5">${m.stock_before}</td>
                        <td class="data-number text-right font-semibold text-slate-900 py-2.5">${m.stock_after}</td>
                        <td class="text-slate-600 py-2.5">${m.reason || '--'}</td>
                        <td class="text-slate-500 py-2.5">${m.created_by_name || 'System'}</td>
                    </tr>
                `;
            }).join('');

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-red-500 text-xs">Failed to load movement logs.</td></tr>`;
        }
    },

    showAdjustModal(variantId = null, sku = '', name = '') {
        const modal = document.getElementById('inv-modal');
        const selectOptions = (this.inventoryData || []).map(v => 
            `<option value="${v.variant_id}" ${v.variant_id == variantId ? 'selected' : ''}>${v.product_name} (${v.variant_sku}) - Current Stock: ${v.current_stock}</option>`
        ).join('');

        modal.innerHTML = `
            <div class="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-800 animate-fade-in font-jakarta">
                <div class="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
                    <div class="flex items-center gap-2.5">
                        <span class="material-symbols-outlined text-blue-400">tune</span>
                        <h3 class="font-outfit font-bold text-lg text-white">Stock Adjustment Inflow / Outflow</h3>
                    </div>
                    <button class="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer" onclick="document.getElementById('inv-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
                
                <form id="adjust-form" class="p-6 space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Select Product Variant *</label>
                        <select name="select_variant_id" id="adj-select-variant" class="form-input bg-slate-950 border-slate-800 text-white font-semibold text-xs py-2.5" required>
                            ${variantId ? `<option value="${variantId}" selected>${name} (${sku})</option>` : selectOptions}
                        </select>
                        <input type="hidden" name="variant_id" id="adj-hidden-variant" value="${variantId || ''}">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Adjustment Type *</label>
                            <select name="adjustment_type" id="adj-type" class="form-input bg-slate-950 border-slate-800 text-white text-xs py-2.5" required>
                                <option value="manual_add" selected>Manual Add (+ Stock Inflow)</option>
                                <option value="manual_remove">Manual Remove (- Stock Outflow)</option>
                                <option value="damage">Damage (- Damaged Items)</option>
                                <option value="lost">Lost (- Lost/Stolen Stock)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Quantity *</label>
                            <input type="number" name="quantity" id="adj-qty" class="form-input bg-slate-950 border-slate-800 text-white font-digit text-xs py-2.5" min="1" required placeholder="e.g. 50">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Reason / Notes *</label>
                        <input type="text" name="reason" id="adj-reason" class="form-input bg-slate-950 border-slate-800 text-white text-xs py-2.5" required placeholder="e.g. Restock from supplier / Warehouse shipment">
                    </div>

                    <div class="pt-4 flex justify-end gap-2 border-t border-slate-800/80 font-outfit">
                        <button type="button" class="btn btn-secondary text-xs px-4 py-2 bg-slate-800 text-slate-300 hover:text-white" onclick="document.getElementById('inv-modal').classList.add('hidden')">Cancel</button>
                        <button type="submit" class="btn btn-primary text-xs px-5 py-2 bg-blue-600 hover:bg-blue-500 font-bold shadow-md border border-blue-400/30" id="save-adj-btn">Confirm Stock Adjustment</button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.remove('hidden');

        document.getElementById('adjust-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-adj-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            const sel = document.getElementById('adj-select-variant');
            const hid = document.getElementById('adj-hidden-variant');
            const selectedVariantId = hid.value || sel.value;

            try {
                await API.post('inventory/adjust', {
                    variant_id: selectedVariantId,
                    adjustment_type: document.getElementById('adj-type').value,
                    quantity: document.getElementById('adj-qty').value,
                    reason: document.getElementById('adj-reason').value
                });

                modal.classList.add('hidden');
                UI.toast('Stock adjusted successfully!', 'success');
                await Promise.all([this.loadSummary(), this.loadInventory()]);

            } catch (err) {
                UI.toast(err.message || 'Failed to adjust stock', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Confirm Stock Adjustment';
            }
        });
    },

    async showHistoryModal(variantId, productName) {
        const modal = document.getElementById('inv-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                    <div>
                        <h3 class="font-geist font-semibold text-lg text-slate-900">Stock Movement Audit History</h3>
                        <p class="text-xs text-slate-500 mt-0.5">${productName}</p>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('inv-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
                <div class="p-0 max-h-[400px] overflow-y-auto" id="history-modal-body">
                    <div class="py-8 text-center text-slate-400 text-xs">Loading movement timeline...</div>
                </div>
                <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button class="btn btn-secondary text-xs px-4 py-1.5" onclick="document.getElementById('inv-modal').classList.add('hidden')">Close</button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        try {
            const res = await API.get(`inventory/movements?variant_id=${variantId}`);
            const logs = res.data.movements;
            const body = document.getElementById('history-modal-body');

            if (!logs || logs.length === 0) {
                body.innerHTML = `<div class="py-8 text-center text-slate-400 text-xs">No movement history recorded for this item.</div>`;
                return;
            }

            body.innerHTML = `
                <table class="data-table text-xs">
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Type</th>
                            <th class="text-right">Qty</th>
                            <th class="text-right">Before</th>
                            <th class="text-right">After</th>
                            <th>Reason</th>
                            <th>Operator</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(m => `
                            <tr class="hover:bg-slate-50/80">
                                <td class="text-slate-500 py-2.5">${UI.formatDate(m.created_at)}</td>
                                <td class="py-2.5 font-medium">${m.movement_type}</td>
                                <td class="data-number text-right font-bold py-2.5 ${parseInt(m.quantity) > 0 ? 'text-emerald-600' : 'text-red-600'}">
                                    ${parseInt(m.quantity) > 0 ? '+' : ''}${m.quantity}
                                </td>
                                <td class="data-number text-right text-slate-500 py-2.5">${m.stock_before}</td>
                                <td class="data-number text-right font-semibold text-slate-900 py-2.5">${m.stock_after}</td>
                                <td class="text-slate-600 py-2.5">${m.reason || '--'}</td>
                                <td class="text-slate-500 py-2.5">${m.created_by_name || 'System'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (e) {
            document.getElementById('history-modal-body').innerHTML = `<div class="py-8 text-center text-red-500 text-xs">Failed to load movement timeline.</div>`;
        }
    },

    async showEditModal(productId) {
        const modal = document.getElementById('inv-modal');
        try {
            UI.setLoading(true);
            const res = await API.get(`products/details?id=${productId}`);
            const p = res.data.product;

            modal.innerHTML = `
                <div class="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-800 animate-fade-in font-jakarta">
                    <div class="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-400">edit_note</span>
                            <h3 class="font-outfit font-bold text-lg text-white">Edit Inventory Item & Prices</h3>
                        </div>
                        <button class="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer" onclick="document.getElementById('inv-modal').classList.add('hidden')">
                            <span class="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>

                    <form id="edit-inv-item-form" class="p-6 space-y-4">
                        <input type="hidden" name="id" value="${p.id}">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-outfit">Product Name *</label>
                                <input type="text" name="name" class="form-input bg-slate-950 border-slate-800 text-white font-semibold text-xs py-2" value="${p.name || ''}" required>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-outfit">SKU Code *</label>
                                <input type="text" name="sku" class="form-input bg-slate-950 border-slate-800 text-white font-mono text-xs py-2" value="${p.sku || ''}" required>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-outfit">Unit Purchase Cost (৳)</label>
                                <input type="number" step="0.01" name="purchase_price" class="form-input bg-slate-950 border-slate-800 text-white font-digit text-xs py-2" value="${p.purchase_price || 0}">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-outfit">Selling Price (৳) *</label>
                                <input type="number" step="0.01" name="selling_price" class="form-input bg-slate-950 border-slate-800 text-white font-digit text-xs py-2" value="${p.selling_price || 0}" required>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 font-outfit">Min Stock Alert Threshold</label>
                                <input type="number" name="min_stock_level" class="form-input bg-slate-950 border-slate-800 text-white font-digit text-xs py-2" value="${p.min_stock_level || 5}">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-outfit">Status</label>
                                <select name="status" class="form-input bg-slate-950 border-slate-800 text-white text-xs py-2">
                                    <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${p.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="archived" ${p.status === 'archived' ? 'selected' : ''}>Archived</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-outfit">Category Name</label>
                            <input type="text" name="category_name" class="form-input bg-slate-950 border-slate-800 text-white text-xs py-2" value="${p.category_name || ''}">
                        </div>

                        <div class="pt-4 flex justify-end gap-2 border-t border-slate-800 font-outfit">
                            <button type="button" class="btn btn-secondary text-xs px-4 py-2 bg-slate-800 text-slate-300 hover:text-white" onclick="document.getElementById('inv-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary text-xs px-5 py-2 bg-amber-600 hover:bg-amber-500 font-bold shadow-md border border-amber-400/30 cursor-pointer" id="save-edit-inv-btn">Save Changes</button>
                        </div>
                    </form>
                </div>
            `;
            modal.classList.remove('hidden');

            document.getElementById('edit-inv-item-form').onsubmit = async (e) => {
                e.preventDefault();
                const form = e.target;
                const btn = document.getElementById('save-edit-inv-btn');
                btn.disabled = true;
                btn.textContent = 'Saving...';

                try {
                    await API.post('products/update', {
                        id: form.id.value,
                        name: form.name.value,
                        sku: form.sku.value,
                        purchase_price: form.purchase_price.value || 0,
                        selling_price: form.selling_price.value || 0,
                        min_stock_level: form.min_stock_level.value || 5,
                        category_name: form.category_name.value,
                        status: form.status.value
                    });

                    modal.classList.add('hidden');
                    UI.toast('Inventory item updated successfully!', 'success');
                    await Promise.all([this.loadSummary(), this.loadInventory()]);

                } catch (err) {
                    UI.toast(err.message || 'Failed to update item', 'error');
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Save Changes';
                }
            };
        } catch (err) {
            UI.toast('Failed to load item details: ' + (err.message || err), 'error');
        } finally {
            UI.setLoading(false);
        }
    },

    confirmDelete(productId, productName) {
        const modal = document.getElementById('inv-modal');
        modal.innerHTML = `
            <div class="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-500/30 animate-fade-in font-jakarta">
                <div class="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-red-950/40">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-red-400">warning</span>
                        <h3 class="font-outfit font-bold text-lg text-white">Remove Product from Inventory</h3>
                    </div>
                    <button class="text-slate-400 hover:text-white p-1 transition-colors cursor-pointer" onclick="document.getElementById('inv-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div class="p-6 space-y-4">
                    <p class="text-xs text-slate-300 font-inter">Are you sure you want to permanently delete <strong class="text-white font-bold">${productName}</strong> and all its stock inventory records?</p>
                    <div class="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-[11px] text-red-300 font-inter">
                        ⚠️ This action will remove all stock levels, SKUs, and movement logs for this item.
                    </div>

                    <div class="pt-3 flex justify-end gap-2 border-t border-slate-800 font-outfit">
                        <button type="button" class="btn btn-secondary text-xs px-4 py-2 bg-slate-800 text-slate-300 hover:text-white" onclick="document.getElementById('inv-modal').classList.add('hidden')">Cancel</button>
                        <button type="button" onclick="Inventory.executeDelete(${productId})" class="btn btn-primary text-xs px-5 py-2 bg-red-600 hover:bg-red-500 font-bold shadow-md border border-red-400/30 cursor-pointer" id="confirm-del-btn">Yes, Delete Item</button>
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    },

    async executeDelete(productId) {
        const btn = document.getElementById('confirm-del-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Deleting...'; }

        try {
            await API.request('products/delete', 'POST', { id: productId });
            document.getElementById('inv-modal').classList.add('hidden');
            UI.toast('Product removed from inventory successfully!', 'success');
            await Promise.all([this.loadSummary(), this.loadInventory()]);
        } catch (err) {
            UI.toast(err.message || 'Failed to delete product', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Yes, Delete Item'; }
        }
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'inventory') {
    window.Inventory.render(document.getElementById('screen-container'));
}
