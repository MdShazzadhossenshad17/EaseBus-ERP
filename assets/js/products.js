/**
 * EaseBus — Products & Stock UI Module
 */

window.Products = {
    categories: [],

    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Products & Stock Catalog</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Manage your product catalog, prices, suppliers, and variant inventory levels.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-secondary flex items-center gap-1 text-xs" onclick="Products.loadSummary(); Products.loadProducts();">
                        <span class="material-symbols-outlined text-sm">refresh</span> Refresh
                    </button>
                    <button class="btn btn-primary flex items-center gap-1 text-xs" onclick="Products.showCreateModal()">
                        <span class="material-symbols-outlined text-sm">add</span> Add Product
                    </button>
                </div>
            </div>

            <!-- KPI Cards Header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="prod-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-amber-500 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
            </div>

            <!-- Products Table Card -->
            <div class="card shadow-sm border-slate-200">
                <div class="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50/70 gap-4">
                    <div class="flex items-center gap-3 flex-wrap">
                        <div class="relative w-64">
                            <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                            <input type="text" id="product-search" placeholder="Search product name, SKU, brand..." class="form-input text-xs py-1.5 pl-9 pr-3 rounded border-slate-300" onkeyup="Products.debounceSearch()">
                        </div>
                        <select id="product-cat-filter" class="form-input text-xs py-1.5 px-3 rounded border-slate-300 w-44" onchange="Products.loadProducts()">
                            <option value="all">All Categories</option>
                        </select>
                        <select id="product-status-filter" class="form-input text-xs py-1.5 px-3 rounded border-slate-300 w-36" onchange="Products.loadProducts()">
                            <option value="active">Active Products</option>
                            <option value="inactive">Inactive</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Product Name</th>
                                <th>Category & Brand</th>
                                <th class="text-right">Selling Price</th>
                                <th class="text-right">Total Stock</th>
                                <th class="text-center">Status</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="products-list">
                            <tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">Loading product catalog...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="product-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await Promise.all([
            this.loadSummary(),
            this.loadMetadata(),
            this.loadProducts()
        ]);
    },

    searchTimeout: null,
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadProducts(), 400);
    },

    async loadSummary() {
        try {
            const res = await API.get('products/summary');
            const s = res.data.summary;
            const container = document.getElementById('prod-kpi-container');
            if (!container) return;

            container.innerHTML = `
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Active Products</p>
                    <h3 class="text-2xl font-mono-data font-bold text-slate-900">${s.total_products}</h3>
                    <p class="text-xs text-slate-500 mt-1">Catalog items</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Variant SKUs</p>
                    <h3 class="text-2xl font-mono-data font-bold text-indigo-700">${s.total_skus}</h3>
                    <p class="text-xs text-slate-500 mt-1">Unique variant SKUs</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Inventory Stock</p>
                    <h3 class="text-2xl font-mono-data font-bold text-emerald-700">${s.total_stock} Units</h3>
                    <p class="text-xs text-slate-500 mt-1">Stock across warehouses</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-amber-500 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Low Stock Alerts</p>
                    <h3 class="text-2xl font-mono-data font-bold text-amber-600">${s.low_stock_count} SKUs</h3>
                    <p class="text-xs text-slate-500 mt-1">Items below threshold</p>
                </div>
            `;
        } catch (e) {
            console.error('Failed to load products summary', e);
        }
    },

    async loadMetadata() {
        try {
            const res = await API.get('products/categories');
            this.categories = res.data.categories || [];
            const filterSel = document.getElementById('product-cat-filter');
            if (filterSel) {
                filterSel.innerHTML = `<option value="all">All Categories</option>` +
                    this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }
        } catch (e) {
            console.error('Failed to load categories', e);
        }
    },

    async loadProducts() {
        const search = document.getElementById('product-search')?.value || '';
        const catId = document.getElementById('product-cat-filter')?.value || 'all';
        const status = document.getElementById('product-status-filter')?.value || 'active';
        const tbody = document.getElementById('products-list');
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400 text-xs">Loading products...</td></tr>`;
            let url = `products/list?status=${status}&search=${encodeURIComponent(search)}`;
            if (catId !== 'all') url += `&category_id=${catId}`;

            const res = await API.get(url);
            const products = res.data.products || [];

            if (products.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">No matching products found in catalog.</td></tr>`;
                return;
            }

            tbody.innerHTML = products.map(p => `
                <tr class="hover:bg-slate-50/80 text-xs">
                    <td class="font-mono-data font-bold text-slate-900 py-3">${p.sku}</td>
                    <td class="py-3 font-semibold text-slate-900">${p.name}</td>
                    <td class="py-3">
                        <span class="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-700 border border-slate-200">${p.category_name || 'General'}</span>
                        ${p.brand ? `<span class="text-[11px] text-slate-400 ml-1">(${p.brand})</span>` : ''}
                    </td>
                    <td class="data-number text-right font-bold text-slate-900 py-3">${UI.formatMoney(p.selling_price)}</td>
                    <td class="data-number text-right font-mono py-3 font-bold ${p.total_stock <= 5 ? 'text-amber-600' : 'text-slate-900'}">
                        ${p.total_stock || 0}
                    </td>
                    <td class="text-center py-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }">${p.status}</span>
                    </td>
                    <td class="text-right py-3">
                        <button class="btn btn-secondary text-[11px] py-0.5 px-2 mr-1" onclick="Products.viewDetails(${p.id})">
                            <span class="material-symbols-outlined text-xs">visibility</span> View
                        </button>
                        <button class="btn btn-secondary text-[11px] py-0.5 px-2" onclick="Products.edit(${p.id})">
                            <span class="material-symbols-outlined text-xs">edit</span> Edit
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500 text-xs">Failed to load product catalog.</td></tr>`;
        }
    },

    fillExistingCategory(catId, targetInputId) {
        if (!catId) return;
        const c = (this.categories || []).find(item => item.id == catId);
        if (!c) return;
        const input = document.getElementById(targetInputId);
        if (input) input.value = c.name || '';
    },

    showCreateModal() {
        const modal = document.getElementById('product-modal');
        const catOptions = (this.categories || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        const popularPills = ['Apparel & Clothing', 'Electronics & Gadgets', 'Footwear & Shoes', 'Bags & Accessories', 'Home & Living', 'General Sales', 'Groceries & Foods', 'Health & Beauty'];

        const pillButtons = (inputId) => popularPills.map(pill => 
            `<button type="button" class="px-2 py-0.5 text-[10px] rounded-full border border-slate-200 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition font-medium" onclick="document.getElementById('${inputId}').value='${pill}'">${pill}</button>`
        ).join('');

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">add_box</span>
                        <h3 class="font-geist font-semibold text-lg text-slate-900">Add New Product</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('product-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <form id="product-form" class="p-6 space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Product Name *</label>
                            <input type="text" name="name" class="form-input text-xs" placeholder="e.g. Leather Jacket, T-Shirt" required>
                        </div>
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">SKU Code *</label>
                            <input type="text" name="sku" class="form-input text-xs font-mono" value="PRD-${Math.floor(1000 + Math.random() * 9000)}" required>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Selling Price (৳) *</label>
                            <input type="number" step="0.01" name="selling_price" class="form-input text-xs font-mono" min="0" placeholder="0.00" required>
                        </div>
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Purchase Price / Cost (৳)</label>
                            <input type="number" step="0.01" name="purchase_price" class="form-input text-xs font-mono" min="0" placeholder="0.00">
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <label class="form-label text-xs font-semibold uppercase text-slate-600 mb-0">Category (Write Directly) *</label>
                            <select class="text-xs text-blue-600 bg-transparent border-none py-0 font-medium hover:underline cursor-pointer" onchange="Products.fillExistingCategory(this.value, 'create-write-category')">
                                <option value="">Or Pick Category...</option>
                                ${catOptions}
                            </select>
                        </div>
                        <input type="text" id="create-write-category" name="category_name" class="form-input text-xs" placeholder="Write e.g. Apparel & Clothing, Electronics, Footwear..." required>
                        <div class="flex flex-wrap gap-1 mt-1.5">
                            ${pillButtons('create-write-category')}
                        </div>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Brand</label>
                        <input type="text" name="brand" class="form-input text-xs" placeholder="e.g. EaseBus Signature">
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Description</label>
                        <textarea name="description" class="form-input text-xs h-20" placeholder="Product details, specs, features..."></textarea>
                    </div>

                    <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                        <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('product-modal').classList.add('hidden')">Cancel</button>
                        <button type="submit" class="btn btn-primary text-xs px-4" id="save-product-btn">Save Product</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('product-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('save-product-btn');
            btn.disabled = true;
            btn.textContent = 'Saving Product...';

            try {
                await API.post('products/create', {
                    name: form.name.value,
                    sku: form.sku.value,
                    selling_price: form.selling_price.value,
                    purchase_price: form.purchase_price.value || 0,
                    category_name: form.category_name.value,
                    brand: form.brand.value || '',
                    description: form.description.value || ''
                });

                modal.classList.add('hidden');
                UI.toast('Product created successfully');
                await Promise.all([this.loadSummary(), this.loadProducts()]);
            } catch (err) {
                UI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Product';
            }
        };
    },

    async viewDetails(id) {
        const modal = document.getElementById('product-modal');
        if (!modal) return;

        try {
            UI.setLoading(true);
            const res = await API.get(`products/details?id=${id}`);
            const p = res.data.product;
            const variants = res.data.variants || [];

            const variantRows = variants.map(v => `
                <tr class="text-xs">
                    <td class="font-mono py-2">${v.sku}</td>
                    <td class="py-2">${v.variant_name || 'Default'}</td>
                    <td class="py-2">${v.location_name || 'Main Warehouse'}</td>
                    <td class="text-right font-bold py-2 ${v.current_stock <= 5 ? 'text-amber-600' : 'text-slate-900'}">${v.current_stock}</td>
                </tr>
            `).join('');

            modal.innerHTML = `
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-fade-in">
                    <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-600">inventory_2</span>
                            <h3 class="font-geist font-semibold text-lg text-slate-900">Product Specification (${p.sku})</h3>
                        </div>
                        <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('product-modal').classList.add('hidden')">
                            <span class="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>

                    <div class="p-6 space-y-4 text-xs">
                        <div class="flex justify-between items-start pb-3 border-b border-slate-100">
                            <div>
                                <h4 class="font-geist font-bold text-base text-slate-900">${p.name}</h4>
                                <p class="text-slate-500">${p.category_name || 'General Category'} ${p.brand ? '• Brand: ' + p.brand : ''}</p>
                            </div>
                            <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">${p.status}</span>
                        </div>

                        <div class="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div>
                                <span class="text-slate-500 font-medium">Selling Price</span>
                                <div class="font-mono-data font-bold text-slate-900 text-sm">${UI.formatMoney(p.selling_price)}</div>
                            </div>
                            <div>
                                <span class="text-slate-500 font-medium">Purchase Cost</span>
                                <div class="font-mono-data font-bold text-slate-700 text-sm">${UI.formatMoney(p.purchase_price)}</div>
                            </div>
                        </div>

                        ${p.description ? `
                            <div>
                                <span class="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Description</span>
                                <p class="text-slate-600 mt-1">${p.description}</p>
                            </div>
                        ` : ''}

                        <div>
                            <span class="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Variant Inventory Stock</span>
                            <div class="mt-2 overflow-x-auto border border-slate-200 rounded-lg">
                                <table class="w-full text-left">
                                    <thead class="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th class="p-2 font-semibold text-slate-600">SKU</th>
                                            <th class="p-2 font-semibold text-slate-600">Variant</th>
                                            <th class="p-2 font-semibold text-slate-600">Location</th>
                                            <th class="p-2 text-right font-semibold text-slate-600">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 p-2">
                                        ${variantRows || `<tr><td colspan="4" class="p-3 text-center text-slate-400">No variant stock data</td></tr>`}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                            <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('product-modal').classList.add('hidden')">Close</button>
                            <button type="button" class="btn btn-primary text-xs px-4" onclick="Products.edit(${p.id})">Edit Product</button>
                        </div>
                    </div>
                </div>
            `;
            modal.classList.remove('hidden');

        } catch (e) {
            UI.toast(e.message, 'error');
        } finally {
            UI.setLoading(false);
        }
    },

    async edit(id) {
        const modal = document.getElementById('product-modal');
        if (!modal) return;

        try {
            UI.setLoading(true);
            const res = await API.get(`products/details?id=${id}`);
            const p = res.data.product;

            const catOptions = (this.categories || []).map(c => 
                `<option value="${c.id}" ${c.id == p.category_id ? 'selected' : ''}>${c.name}</option>`
            ).join('');

            const popularPills = ['Apparel & Clothing', 'Electronics & Gadgets', 'Footwear & Shoes', 'Bags & Accessories', 'Home & Living', 'General Sales', 'Groceries & Foods', 'Health & Beauty'];

            const pillButtons = (inputId) => popularPills.map(pill => 
                `<button type="button" class="px-2 py-0.5 text-[10px] rounded-full border border-slate-200 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition font-medium" onclick="document.getElementById('${inputId}').value='${pill}'">${pill}</button>`
            ).join('');

            modal.innerHTML = `
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-fade-in">
                    <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-600">edit_square</span>
                            <h3 class="font-geist font-semibold text-lg text-slate-900">Edit Product (${p.sku})</h3>
                        </div>
                        <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('product-modal').classList.add('hidden')">
                            <span class="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>

                    <form id="edit-product-form" class="p-6 space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold uppercase text-slate-600">Product Name *</label>
                                <input type="text" name="name" class="form-input text-xs" value="${(p.name || '').replace(/"/g, '&quot;')}" required>
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold uppercase text-slate-600">SKU Code *</label>
                                <input type="text" name="sku" class="form-input text-xs font-mono" value="${(p.sku || '').replace(/"/g, '&quot;')}" required>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold uppercase text-slate-600">Selling Price (৳) *</label>
                                <input type="number" step="0.01" name="selling_price" class="form-input text-xs font-mono" value="${p.selling_price}" required>
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold uppercase text-slate-600">Purchase Price / Cost (৳)</label>
                                <input type="number" step="0.01" name="purchase_price" class="form-input text-xs font-mono" value="${p.purchase_price}">
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="form-label text-xs font-semibold uppercase text-slate-600 mb-0">Category (Write Directly) *</label>
                                <select class="text-xs text-blue-600 bg-transparent border-none py-0 font-medium hover:underline cursor-pointer" onchange="Products.fillExistingCategory(this.value, 'edit-write-category')">
                                    <option value="">Or Pick Category...</option>
                                    ${catOptions}
                                </select>
                            </div>
                            <input type="text" id="edit-write-category" name="category_name" class="form-input text-xs" value="${(p.category_name || '').replace(/"/g, '&quot;')}" placeholder="Write e.g. Apparel & Clothing, Electronics, Footwear..." required>
                            <div class="flex flex-wrap gap-1 mt-1.5">
                                ${pillButtons('edit-write-category')}
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold uppercase text-slate-600">Brand</label>
                                <input type="text" name="brand" class="form-input text-xs" value="${(p.brand || '').replace(/"/g, '&quot;')}">
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold uppercase text-slate-600">Status *</label>
                                <select name="status" class="form-input text-xs" required>
                                    <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${p.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="archived" ${p.status === 'archived' ? 'selected' : ''}>Archived</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Description</label>
                            <textarea name="description" class="form-input text-xs h-20">${p.description || ''}</textarea>
                        </div>

                        <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                            <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('product-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary text-xs px-4" id="submit-edit-prod-btn">Update Product</button>
                        </div>
                    </form>
                </div>
            `;
            modal.classList.remove('hidden');

            document.getElementById('edit-product-form').onsubmit = async (e) => {
                e.preventDefault();
                const form = e.target;
                const btn = document.getElementById('submit-edit-prod-btn');
                btn.disabled = true;
                btn.textContent = 'Updating...';

                try {
                    await API.put('products/update', {
                        id: p.id,
                        name: form.name.value,
                        sku: form.sku.value,
                        selling_price: form.selling_price.value,
                        purchase_price: form.purchase_price.value || 0,
                        category_name: form.category_name.value,
                        status: form.status.value,
                        brand: form.brand.value || '',
                        description: form.description.value || ''
                    });

                    modal.classList.add('hidden');
                    UI.toast('Product updated successfully!');
                    await Promise.all([this.loadSummary(), this.loadProducts()]);
                } catch (err) {
                    UI.toast(err.message, 'error');
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Update Product';
                }
            };

        } catch (e) {
            UI.toast(e.message, 'error');
        } finally {
            UI.setLoading(false);
        }
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'products') {
    window.Products.render(document.getElementById('screen-container'));
}
