/**
 * EaseBus — Orders & Sales UI Module (Write System)
 */

window.Orders = {
    customersList: [],
    variantsList: [],
    cartItems: [],

    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Orders & Sales</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Write custom sales orders, process transactions, and generate printable tax invoices.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-primary flex items-center gap-1 text-xs" onclick="Orders.showCreateView()">
                        <span class="material-symbols-outlined text-sm">edit_note</span> Write New Order
                    </button>
                </div>
            </div>

            <!-- KPI Cards Header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="ord-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-orange-500 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
            </div>
            
            <!-- Main Orders Table View -->
            <div id="orders-main-view">
                <div class="card shadow-sm border-slate-200">
                    <div class="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50/70 gap-4">
                        <div class="flex items-center gap-3 flex-wrap">
                            <div class="relative w-64">
                                <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                                <input type="text" id="ord-search" placeholder="Search order #, customer..." class="form-input text-xs py-1.5 pl-9 pr-3 rounded border-slate-300" onkeyup="Orders.debounceSearch()">
                            </div>
                        </div>
                        <button class="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1" onclick="Orders.loadSummary(); Orders.loadOrders();">
                            <span class="material-symbols-outlined text-xs">refresh</span> Refresh List
                        </button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Order #</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th class="text-right">Total Amount</th>
                                    <th class="text-center">Payment Status</th>
                                    <th class="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="ord-list">
                                <tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">Loading orders...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Write System: Create Order View -->
            <div id="orders-create-view" class="hidden">
                <div class="card shadow-sm border-slate-200">
                    <div class="card-header bg-slate-50 border-b border-slate-200 flex justify-between items-center py-3.5 px-6">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-600 text-lg">edit_note</span>
                            <h3 class="card-title text-base font-semibold text-slate-900">Write New Sales Order</h3>
                        </div>
                        <button class="btn btn-secondary text-xs flex items-center gap-1" onclick="Orders.showMainView()">
                            <span class="material-symbols-outlined text-xs">arrow_back</span> Back to Orders
                        </button>
                    </div>
                    <div class="p-6">
                        <form id="create-order-form" class="space-y-6">
                            
                            <!-- 1. Customer Write Section -->
                            <div class="customer-info-box border border-slate-800 rounded-xl p-5 bg-slate-900/90 shadow-lg">
                                <div class="flex justify-between items-center mb-3">
                                    <h4 class="font-semibold text-sm text-white flex items-center gap-2">
                                        <span class="material-symbols-outlined text-blue-400 text-base">person</span> Customer Information (Write Directly)
                                    </h4>
                                    <select id="pick-cust-dropdown" class="form-input text-xs w-56 py-1 px-2 border-slate-700 bg-slate-950 text-white" onchange="Orders.fillExistingCustomer(this.value)">
                                        <option value="">Or Pick Existing Customer...</option>
                                    </select>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label class="form-label text-xs font-semibold text-slate-300">Customer Name *</label>
                                        <input type="text" id="cust-write-name" class="form-input text-xs bg-slate-950 border-slate-700 text-white" required placeholder="Write customer full name...">
                                    </div>
                                    <div>
                                        <label class="form-label text-xs font-semibold text-slate-300">Phone Number *</label>
                                        <input type="tel" id="cust-write-phone" class="form-input text-xs bg-slate-950 border-slate-700 text-white" required placeholder="Write phone e.g. 01711223344">
                                    </div>
                                    <div>
                                        <label class="form-label text-xs font-semibold text-slate-300">Delivery Address</label>
                                        <input type="text" id="cust-write-address" class="form-input text-xs bg-slate-950 border-slate-700 text-white" placeholder="Write delivery address e.g. Mirpur, Dhaka">
                                    </div>
                                </div>
                            </div>

                            <!-- 2. Write Product Items Section -->
                            <div class="border border-slate-200 rounded-lg p-5 bg-white">
                                <div class="flex justify-between items-center mb-3">
                                    <h4 class="font-semibold text-sm text-slate-900 flex items-center gap-2">
                                        <span class="material-symbols-outlined text-blue-600 text-base">shopping_bag</span> Order Line Items (Write Product Details)
                                    </h4>
                                    <select id="pick-prod-dropdown" class="form-input text-xs w-60 py-1 px-2 border-slate-300" onchange="Orders.fillExistingProduct(this.value)">
                                        <option value="">Or Pick Existing Inventory Item...</option>
                                    </select>
                                </div>

                                <!-- Write Item Input Bar -->
                                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div class="sm:col-span-5">
                                        <label class="form-label text-[11px] font-medium text-slate-600">Product / Item Name *</label>
                                        <input type="text" id="item-write-name" class="form-input text-xs" placeholder="Write item name e.g. Cotton T-Shirt">
                                    </div>
                                    <div class="sm:col-span-2">
                                        <label class="form-label text-[11px] font-medium text-slate-600">Item Code / SKU</label>
                                        <input type="text" id="item-write-sku" class="form-input text-xs font-mono" placeholder="e.g. TSHIRT-01">
                                    </div>
                                    <div class="sm:col-span-2">
                                        <label class="form-label text-[11px] font-medium text-slate-600">Unit Price (৳) *</label>
                                        <input type="number" id="item-write-price" class="form-input text-xs" min="0" placeholder="0.00">
                                    </div>
                                    <div class="sm:col-span-1">
                                        <label class="form-label text-[11px] font-medium text-slate-600">Qty *</label>
                                        <input type="number" id="item-write-qty" class="form-input text-xs" min="1" value="1">
                                    </div>
                                    <div class="sm:col-span-2">
                                        <button type="button" class="btn btn-primary text-xs w-full justify-center py-2" onclick="Orders.addWrittenCartItem()">
                                            <span class="material-symbols-outlined text-xs mr-1">add</span> Add Line
                                        </button>
                                    </div>
                                </div>

                                <!-- Cart Table -->
                                <div class="overflow-x-auto border border-slate-200 rounded-lg">
                                    <table class="data-table text-xs">
                                        <thead>
                                            <tr class="bg-slate-100">
                                                <th>#</th>
                                                <th>Product Description</th>
                                                <th>SKU / Code</th>
                                                <th class="text-right">Unit Price</th>
                                                <th class="text-right">Qty</th>
                                                <th class="text-right">Total</th>
                                                <th class="text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="cart-items-list">
                                            <tr><td colspan="7" class="text-center py-6 text-slate-400">No items written yet. Write product details above to add items.</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- 3. Payment & Calculation Summary -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-4">
                                    <div>
                                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Payment Status *</label>
                                        <select id="ord-pay-status" class="form-input text-xs" required>
                                            <option value="unpaid">Unpaid (Cash on Delivery)</option>
                                            <option value="paid">Paid (Payment Received)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Order Notes / Delivery Instructions</label>
                                        <textarea id="ord-notes" class="form-input text-xs h-20" placeholder="Write special delivery notes or instructions..."></textarea>
                                    </div>
                                </div>

                                <div class="p-5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                                    <div class="flex justify-between text-xs text-slate-600">
                                        <span class="font-medium">Items Subtotal (Before Discount):</span>
                                        <span class="font-mono-data font-bold text-slate-900 text-sm" id="summary-subtotal">৳ 0.00</span>
                                    </div>
                                    <div class="flex justify-between items-center text-xs">
                                        <span class="text-slate-600 font-medium">Order Discount Rate:</span>
                                        <div class="flex items-center gap-1">
                                            <input type="number" id="ord-discount" class="form-input text-xs w-20 text-right py-1" value="0" min="0" onkeyup="Orders.recalculateTotals()" onchange="Orders.recalculateTotals()">
                                            <select id="ord-discount-type" class="form-input text-xs w-20 py-1 px-1 border-slate-300 rounded bg-white" onchange="Orders.recalculateTotals()">
                                                <option value="fixed">৳ Flat</option>
                                                <option value="percent">% Off</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="flex justify-between text-xs text-slate-600">
                                        <span class="font-medium">Calculated Discount Deduction:</span>
                                        <span class="font-mono-data font-bold text-red-600" id="summary-discount-deduction">-৳ 0.00</span>
                                    </div>
                                    <div class="flex justify-between text-xs text-slate-600 pt-1 border-t border-slate-200">
                                        <span class="font-medium">Subtotal (After Discount):</span>
                                        <span class="font-mono-data font-bold text-slate-800" id="summary-after-discount">৳ 0.00</span>
                                    </div>
                                    <div class="flex justify-between items-center text-xs">
                                        <span class="text-slate-600 font-medium">Shipping Charge (৳):</span>
                                        <input type="number" id="ord-shipping" class="form-input text-xs w-24 text-right py-1" value="60" min="0" onkeyup="Orders.recalculateTotals()" onchange="Orders.recalculateTotals()">
                                    </div>
                                    <div class="flex justify-between text-xs pt-3 border-t border-slate-300">
                                        <span class="font-bold text-slate-900 text-sm">Total Amount Payable:</span>
                                        <span class="font-mono-data font-bold text-blue-700 text-base" id="summary-grandtotal">৳ 0.00</span>
                                    </div>
                                </div>
                            </div>

                            <div class="pt-4 flex justify-end gap-3 border-t border-slate-200">
                                <button type="button" class="btn btn-secondary text-xs px-4" onclick="Orders.showMainView()">Cancel</button>
                                <button type="submit" class="btn btn-primary text-xs px-5" id="submit-ord-btn">Create Sales Order & Generate Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Invoice & Detail Modal Container -->
            <div id="ord-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await Promise.all([
            this.loadSummary(),
            this.loadOrders(),
            this.loadFormDropdowns()
        ]);
    },

    searchTimeout: null,
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadOrders(), 400);
    },

    async loadSummary() {
        try {
            const res = await API.get('orders/summary');
            const s = res.data.summary;
            const container = document.getElementById('ord-kpi-container');
            if (!container) return;

            container.innerHTML = `
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Sales Orders</p>
                    <h3 class="text-2xl font-mono-data font-bold text-slate-900">${s.total_orders}</h3>
                    <p class="text-xs text-slate-500 mt-1">Total lifetime sales orders</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Sales Revenue</p>
                    <h3 class="text-2xl font-mono-data font-bold text-emerald-700">${UI.formatMoney(s.total_revenue)}</h3>
                    <p class="text-xs text-slate-500 mt-1">Total generated sales volume</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-orange-500 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Pending Orders</p>
                    <h3 class="text-2xl font-mono-data font-bold text-orange-600">${s.pending_orders}</h3>
                    <p class="text-xs text-slate-500 mt-1">Orders waiting to be confirmed</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Completed Deliveries</p>
                    <h3 class="text-2xl font-mono-data font-bold text-indigo-600">${s.delivered_orders}</h3>
                    <p class="text-xs text-slate-500 mt-1">Delivered & fulfilled orders</p>
                </div>
            `;
        } catch (e) {
            console.error('Failed to load orders summary', e);
        }
    },

    async loadOrders() {
        const search = document.getElementById('ord-search')?.value || '';
        const status = document.getElementById('ord-status')?.value || 'all';
        const tbody = document.getElementById('ord-list');
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">Loading orders...</td></tr>`;
            const res = await API.get(`orders/list?status=${status}&search=${encodeURIComponent(search)}`);
            const orders = res.data.orders;

            if (!orders || orders.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">No matching orders found.</td></tr>`;
                return;
            }

            const getStatusColor = (s) => {
                const colors = {
                    'pending': 'bg-amber-50 text-amber-700 border-amber-200',
                    'confirmed': 'bg-blue-50 text-blue-700 border-blue-200',
                    'processing': 'bg-purple-50 text-purple-700 border-purple-200',
                    'shipped': 'bg-cyan-50 text-cyan-700 border-cyan-200',
                    'delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'cancelled': 'bg-red-50 text-red-700 border-red-200',
                };
                return colors[s] || 'bg-slate-50 text-slate-700 border-slate-200';
            };

            const getPaymentColor = (p) => {
                const colors = {
                    'unpaid': 'bg-red-50 text-red-700 border-red-200',
                    'partial': 'bg-orange-50 text-orange-700 border-orange-200',
                    'paid': 'bg-emerald-50 text-emerald-700 border-emerald-200'
                };
                return colors[p] || 'bg-slate-50 text-slate-700 border-slate-200';
            };

            tbody.innerHTML = orders.map(o => `
                <tr class="hover:bg-slate-50/80 text-xs">
                    <td class="font-mono-data font-bold text-slate-900 py-3">${o.order_number || o.order_no || 'N/A'}</td>
                    <td class="text-slate-600 py-3">${UI.formatDate(o.created_at || o.order_date)}</td>
                    <td class="py-3">
                        <div class="font-medium text-slate-900">${o.customer_name || 'Walk-in'}</div>
                        <div class="text-[11px] text-slate-400 font-mono">${o.customer_phone || ''}</div>
                    </td>
                    <td class="data-number text-right font-bold text-slate-900 py-3">${UI.formatMoney(o.total_amount)}</td>
                    <td class="text-center py-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getPaymentColor(o.payment_status)}">${o.payment_status || 'paid'}</span>
                    </td>
                    <td class="text-right py-3">
                        <button class="btn btn-secondary text-xs py-1 px-3 text-[11px] inline-flex items-center gap-1" onclick="Orders.showInvoiceModal(${o.id})">
                            <span class="material-symbols-outlined text-xs">receipt_long</span> Invoice
                        </button>
                    </td>
                </tr>
            `).join('');


        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500 text-xs">Failed to load orders.</td></tr>`;
        }
    },

    async updateStatus(id, newStatus) {
        if (!newStatus) return;

        let confirmMsg = `Update order status to ${newStatus.toUpperCase()}?`;
        if (newStatus === 'delivered') confirmMsg += `\n\nThis will record revenue and update customer purchase totals.`;
        if (newStatus === 'cancelled') confirmMsg += `\n\nThis will return items to stock inventory.`;

        if (!confirm(confirmMsg)) {
            this.loadOrders();
            return;
        }

        try {
            await API.put('orders/status', { order_id: id, status: newStatus });
            UI.toast('Order status updated');
            await Promise.all([this.loadSummary(), this.loadOrders()]);
        } catch (e) {
            UI.toast(e.message, 'error');
            this.loadOrders();
        }
    },

    async loadFormDropdowns() {
        try {
            const [custRes, invRes] = await Promise.all([
                API.get('customers/list'),
                API.get('inventory/list')
            ]);

            this.customersList = custRes.data.customers || [];
            this.variantsList = invRes.data.inventory || [];

            const custSelect = document.getElementById('pick-cust-dropdown');
            if (custSelect) {
                custSelect.innerHTML = `<option value="">Or Pick Existing Customer...</option>` +
                    this.customersList.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');
            }

            const varSelect = document.getElementById('pick-prod-dropdown');
            if (varSelect) {
                varSelect.innerHTML = `<option value="">Or Pick Existing Inventory Item...</option>` +
                    this.variantsList.map(v => 
                        `<option value="${v.variant_id}">${v.product_name} - ${v.variant_name} (${v.variant_sku}) - ৳${v.avg_cost_price}</option>`
                    ).join('');
            }

        } catch (e) {
            console.error('Failed to load form dropdowns', e);
        }
    },

    fillExistingCustomer(custId) {
        if (!custId) return;
        const c = this.customersList.find(item => item.id == custId);
        if (!c) return;
        document.getElementById('cust-write-name').value = c.name || '';
        document.getElementById('cust-write-phone').value = c.phone || '';
        document.getElementById('cust-write-address').value = c.address || '';
    },

    fillExistingProduct(variantId) {
        if (!variantId) return;
        const v = this.variantsList.find(item => item.variant_id == variantId);
        if (!v) return;
        document.getElementById('item-write-name').value = `${v.product_name} - ${v.variant_name}`;
        document.getElementById('item-write-sku').value = v.variant_sku || '';
        document.getElementById('item-write-price').value = v.selling_price || v.v_price || v.avg_cost_price || 0;
    },

    showCreateView() {
        this.cartItems = [];
        this.renderCartTable();
        document.getElementById('orders-main-view').classList.add('hidden');
        document.getElementById('orders-create-view').classList.remove('hidden');

        const form = document.getElementById('create-order-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (this.cartItems.length === 0) {
                UI.toast('Please write and add at least one product line item to the order.', 'error');
                return;
            }

            const submitBtn = document.getElementById('submit-ord-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing Order...';

            try {
                const { subtotal, actualDiscount, shipping, grandTotal } = this.recalculateTotals();

                const res = await API.post('orders/create', {
                    customer_name: document.getElementById('cust-write-name').value,
                    customer_phone: document.getElementById('cust-write-phone').value,
                    customer_address: document.getElementById('cust-write-address').value,
                    payment_status: document.getElementById('ord-pay-status').value,
                    payment_method: document.getElementById('ord-pay-method')?.value || 'cash',
                    subtotal: subtotal,
                    discount_amount: actualDiscount,
                    delivery_charge: parseFloat(document.getElementById('ord-shipping')?.value || 0),
                    total_amount: grandTotal,
                    notes: document.getElementById('ord-notes').value || '',
                    items: this.cartItems.map(item => ({
                        product_id: item.product_id || item.variant_id || 0,
                        variant_id: item.variant_id || 0,
                        item_name: item.item_name,
                        product_name: item.item_name,
                        variant_sku: item.variant_sku,
                        unit_price: item.unit_price,
                        quantity: item.quantity,
                        total: item.unit_price * item.quantity,
                        discount: 0
                    }))
                });

                UI.toast('Sales Order created successfully!');
                const newOrderId = res.data.order_id;
                this.showMainView();
                await Promise.all([this.loadSummary(), this.loadOrders()]);

                // Open Tax Invoice instantly
                this.showInvoiceModal(newOrderId);

            } catch (err) {
                UI.toast(err.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Sales Order & Generate Invoice';
            }
        };
    },

    showMainView() {
        document.getElementById('orders-create-view').classList.add('hidden');
        document.getElementById('orders-main-view').classList.remove('hidden');
    },

    addWrittenCartItem() {
        const nameInput = document.getElementById('item-write-name');
        const skuInput = document.getElementById('item-write-sku');
        const priceInput = document.getElementById('item-write-price');
        const qtyInput = document.getElementById('item-write-qty');

        const itemName = nameInput.value.trim();
        const sku = skuInput.value.trim();
        const price = parseFloat(priceInput.value || 0);
        const qty = parseInt(qtyInput.value || 1);

        if (!itemName) {
            UI.toast('Please write item name', 'error');
            return;
        }

        if (price < 0) {
            UI.toast('Price cannot be negative', 'error');
            return;
        }

        this.cartItems.push({
            variant_id: 0,
            item_name: itemName,
            variant_sku: sku || 'ITEM-' + Math.floor(Math.random() * 8999 + 1000),
            unit_price: price,
            quantity: qty
        });

        // Clear item inputs for next line
        nameInput.value = '';
        skuInput.value = '';
        priceInput.value = '';
        qtyInput.value = 1;

        this.renderCartTable();
    },

    removeCartItem(index) {
        this.cartItems.splice(index, 1);
        this.renderCartTable();
    },

    renderCartTable() {
        const tbody = document.getElementById('cart-items-list');
        if (!tbody) return;

        if (this.cartItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">No items written yet. Write product details above to add items.</td></tr>`;
            this.recalculateTotals();
            return;
        }

        tbody.innerHTML = this.cartItems.map((item, idx) => {
            const total = item.unit_price * item.quantity;
            return `
                <tr class="hover:bg-slate-50/80">
                    <td class="text-slate-400 font-medium py-2.5">${idx + 1}</td>
                    <td class="font-medium text-slate-900 py-2.5">${item.item_name}</td>
                    <td class="font-mono text-xs text-slate-500 py-2.5">${item.variant_sku}</td>
                    <td class="data-number text-right py-2.5">${UI.formatMoney(item.unit_price)}</td>
                    <td class="data-number text-right font-bold py-2.5">${item.quantity}</td>
                    <td class="data-number text-right font-semibold text-blue-700 py-2.5">${UI.formatMoney(total)}</td>
                    <td class="text-center py-2.5">
                        <button type="button" class="text-red-500 hover:text-red-700 p-1" onclick="Orders.removeCartItem(${idx})">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.recalculateTotals();
    },

    recalculateTotals() {
        const subtotal = this.cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        const discountVal = parseFloat(document.getElementById('ord-discount')?.value || 0);
        const discountType = document.getElementById('ord-discount-type')?.value || 'fixed';
        const shipping = parseFloat(document.getElementById('ord-shipping')?.value || 0);

        let actualDiscount = discountVal;
        if (discountType === 'percent') {
            actualDiscount = (subtotal * discountVal) / 100;
        }

        actualDiscount = Math.min(subtotal, Math.max(0, actualDiscount));
        const subAfterDiscount = Math.max(0, subtotal - actualDiscount);
        const grandTotal = Math.max(0, subAfterDiscount + shipping);

        const subEl = document.getElementById('summary-subtotal');
        const discDedEl = document.getElementById('summary-discount-deduction');
        const afterDiscEl = document.getElementById('summary-after-discount');
        const grandEl = document.getElementById('summary-grandtotal');

        if (subEl) subEl.textContent = UI.formatMoney(subtotal);
        if (discDedEl) discDedEl.textContent = `-${UI.formatMoney(actualDiscount)}`;
        if (afterDiscEl) afterDiscEl.textContent = UI.formatMoney(subAfterDiscount);
        if (grandEl) grandEl.textContent = UI.formatMoney(grandTotal);

        return { subtotal, actualDiscount, shipping, grandTotal };
    },

    async showInvoiceModal(orderId) {
        const modal = document.getElementById('ord-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-fade-in">
                <div class="p-8 text-center text-slate-500 text-xs">Loading invoice details...</div>
            </div>
        `;
        modal.classList.remove('hidden');

        try {
            const res = await API.get(`orders/detail?id=${orderId}`);
            const o = res.data.order;
            const items = res.data.items;
            const biz = res.data.business;

            modal.innerHTML = `
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-300 animate-fade-in" id="invoice-printable">
                    <!-- Invoice Header Bar -->
                    <div class="p-6 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
                        <div class="flex items-center gap-3">
                            <img src="../assets/img/logo.png" alt="EaseBus Logo" class="w-10 h-10 rounded-lg object-cover ring-1 ring-white/20">
                            <div>
                                <h2 class="font-geist font-extrabold text-xl tracking-tight text-white">${biz.name || 'EaseBus'}</h2>
                                <p class="text-xs text-slate-300 font-medium">Official Sales Tax Invoice</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="font-mono-data font-extrabold text-lg block text-blue-400">${o.order_no}</span>
                            <span class="text-xs text-slate-300 font-semibold">${UI.formatDate(o.order_date)}</span>
                        </div>
                    </div>

                    <div class="p-6 space-y-6 bg-white text-slate-900">
                        <!-- Addresses Grid -->
                        <div class="grid grid-cols-2 gap-6 text-xs pb-4 border-b border-slate-300">
                            <div>
                                <p class="font-bold text-slate-700 uppercase tracking-wider mb-1">BILLED FROM:</p>
                                <p class="font-extrabold text-slate-900 text-sm">${biz.name}</p>
                                <p class="text-slate-800 font-medium mt-1">${biz.address || 'Dhaka, Bangladesh'}</p>
                                <p class="text-slate-800 font-medium">Phone: ${biz.phone || '--'}</p>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-slate-700 uppercase tracking-wider mb-1">BILLED TO:</p>
                                <p class="font-extrabold text-slate-900 text-sm">${o.customer_name}</p>
                                <p class="text-slate-800 font-medium mt-1">${o.customer_address || 'Customer Delivery Address'}</p>
                                <p class="text-slate-800 font-medium">Phone: ${o.customer_phone}</p>
                            </div>
                        </div>

                        <!-- Status Bar -->
                        <div class="flex justify-between items-center p-3 bg-slate-100 rounded border border-slate-300 text-xs">
                            <div>
                                <span class="text-slate-700 font-bold mr-2">Payment Status:</span>
                                <span class="font-extrabold uppercase px-2.5 py-1 rounded text-[11px] ${o.payment_status === 'paid' ? 'bg-emerald-200 text-emerald-950 border border-emerald-400' : 'bg-red-200 text-red-950 border border-red-400'}">${o.payment_status}</span>
                            </div>
                            <div>
                                <span class="text-slate-700 font-bold mr-2">Order Status:</span>
                                <span class="font-extrabold uppercase px-2.5 py-1 rounded text-[11px] bg-blue-200 text-blue-950 border border-blue-400">${o.order_status}</span>
                            </div>
                        </div>

                        <!-- Items Table -->
                        <div class="overflow-x-auto border border-slate-300 rounded">
                            <table class="data-table text-xs w-full text-slate-900">
                                <thead>
                                    <tr class="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                                        <th class="text-slate-900 font-bold">#</th>
                                        <th class="text-slate-900 font-bold">Item Description</th>
                                        <th class="text-right text-slate-900 font-bold">Unit Price</th>
                                        <th class="text-right text-slate-900 font-bold">Qty</th>
                                        <th class="text-right text-slate-900 font-bold">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${items.map((item, idx) => `
                                        <tr class="border-b border-slate-200">
                                            <td class="text-slate-700 font-bold py-2.5">${idx + 1}</td>
                                            <td class="font-bold text-slate-900 py-2.5">
                                                ${item.product_name} <span class="text-slate-700 font-mono text-[11px]">(${item.variant_sku})</span>
                                            </td>
                                            <td class="data-number text-right py-2.5 font-bold text-slate-900">${UI.formatMoney(item.unit_price)}</td>
                                            <td class="data-number text-right font-extrabold py-2.5 text-slate-900">${item.quantity}</td>
                                            <td class="data-number text-right font-extrabold text-slate-900 py-2.5">${UI.formatMoney(item.total_price)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- Summary -->
                        <div class="flex justify-end text-xs">
                            <div class="w-72 space-y-2 pt-2">
                                <div class="flex justify-between text-slate-800 font-medium">
                                    <span class="font-semibold text-slate-700">Subtotal:</span>
                                    <span class="font-mono-data font-bold text-slate-900">${UI.formatMoney(o.subtotal)}</span>
                                </div>
                                ${parseFloat(o.discount_amount) > 0 ? `
                                    <div class="flex justify-between text-slate-800 font-medium">
                                        <span class="font-semibold text-slate-700">Discount:</span>
                                        <span class="font-mono-data font-extrabold text-red-700">-${UI.formatMoney(o.discount_amount)}</span>
                                    </div>
                                ` : ''}
                                ${parseFloat(o.delivery_charge) > 0 ? `
                                    <div class="flex justify-between text-slate-800 font-medium">
                                        <span class="font-semibold text-slate-700">Delivery Fee:</span>
                                        <span class="font-mono-data font-bold text-slate-900">${UI.formatMoney(o.delivery_charge)}</span>
                                    </div>
                                ` : ''}
                                <div class="flex justify-between text-sm font-extrabold text-slate-950 pt-2 border-t-2 border-slate-900">
                                    <span>Total Amount:</span>
                                    <span class="font-mono-data font-extrabold text-blue-900 text-lg">${UI.formatMoney(o.total_amount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Actions Footer -->
                    <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                        <button type="button" class="btn btn-secondary text-xs px-3 py-1.5" onclick="document.getElementById('ord-modal').classList.add('hidden')">Close</button>
                        <div class="flex items-center gap-2">
                            ${o.payment_status === 'unpaid' ? `
                                <button type="button" class="btn btn-secondary text-xs py-1.5 px-3 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" onclick="Orders.markAsPaid(${o.id})">
                                    <span class="material-symbols-outlined text-xs mr-1">check_circle</span> Mark Paid
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-primary text-xs py-1.5 px-4 flex items-center gap-1" onclick="window.print()">
                                <span class="material-symbols-outlined text-xs">print</span> Print Invoice
                            </button>
                        </div>
                    </div>
                </div>
            `;

        } catch (e) {
            modal.innerHTML = `
                <div class="bg-white rounded-xl p-8 max-w-md text-center">
                    <p class="text-red-500 text-sm mb-4">Failed to load invoice details.</p>
                    <button class="btn btn-secondary text-xs" onclick="document.getElementById('ord-modal').classList.add('hidden')">Close</button>
                </div>
            `;
        }
    },

    async markAsPaid(orderId) {
        try {
            await API.put('orders/payment_status', { order_id: orderId, payment_status: 'paid' });
            UI.toast('Order marked as paid');
            document.getElementById('ord-modal').classList.add('hidden');
            await Promise.all([this.loadSummary(), this.loadOrders()]);
        } catch (e) {
            UI.toast(e.message, 'error');
        }
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'orders') {
    window.Orders.render(document.getElementById('screen-container'));
}
