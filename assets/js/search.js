/**
 * EaseBus ERP — Global Enterprise Search Bar Module
 * Provides fast multi-module search across Products, Orders, Customers, Suppliers, and Deliveries by name or ID.
 */

window.GlobalSearch = {
    isOpen: false,
    query: '',
    activeFilter: 'all',
    selectedIndex: -1,
    searchResults: {
        products: [],
        orders: [],
        customers: [],
        suppliers: [],
        deliveries: []
    },
    debounceTimer: null,
    RECENT_KEY: 'easebus_recent_searches',

    init() {
        this.bindEvents();
    },

    bindEvents() {
        const input = document.getElementById('global-search-input');
        const mobileInput = document.getElementById('global-search-mobile-input');
        const clearBtn = document.getElementById('global-search-clear-btn');

        // Keyboard Shortcut: Cmd+K / Ctrl+K / '/' to focus
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.focusSearch();
            } else if (e.key === '/' && document.activeElement !== input && document.activeElement !== mobileInput && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.focusSearch();
            } else if (e.key === 'Escape' && this.isOpen) {
                this.closeDropdown();
                this.closeMobileSearch();
            }
        });

        // Search Input listeners (Desktop)
        if (input) {
            input.addEventListener('focus', () => {
                this.openDropdown();
                if (!input.value.trim()) {
                    this.renderRecentOrPopular();
                } else {
                    this.handleInput(input.value);
                }
            });

            input.addEventListener('input', (e) => {
                this.handleInput(e.target.value);
            });

            input.addEventListener('keydown', (e) => {
                this.handleKeydown(e);
            });
        }

        // Mobile input listeners
        if (mobileInput) {
            mobileInput.addEventListener('focus', () => {
                if (!mobileInput.value.trim()) {
                    this.renderRecentOrPopular();
                } else {
                    this.handleInput(mobileInput.value);
                }
            });

            mobileInput.addEventListener('input', (e) => {
                this.handleInput(e.target.value);
            });

            mobileInput.addEventListener('keydown', (e) => {
                this.handleKeydown(e);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Click outside dismiss
        document.addEventListener('click', (e) => {
            if (this.isOpen) {
                const container = document.getElementById('global-search-container');
                const mobileOverlay = document.getElementById('global-search-mobile-overlay');
                if (container && !container.contains(e.target) && (!mobileOverlay || !mobileOverlay.contains(e.target))) {
                    this.closeDropdown();
                }
            }
        });
    },

    focusSearch() {
        const input = document.getElementById('global-search-input');
        const mobileInput = document.getElementById('global-search-mobile-input');
        
        if (window.innerWidth < 768) {
            this.openMobileSearch();
            if (mobileInput) {
                mobileInput.focus();
                mobileInput.select();
                if (!mobileInput.value.trim()) {
                    this.renderRecentOrPopular();
                } else {
                    this.handleInput(mobileInput.value);
                }
            }
        } else {
            if (input) {
                input.focus();
                input.select();
            }
            this.openDropdown();
            if (input && !input.value.trim()) {
                this.renderRecentOrPopular();
            } else if (input) {
                this.handleInput(input.value);
            }
        }
    },

    openMobileSearch() {
        const mobileOverlay = document.getElementById('global-search-mobile-overlay');
        if (mobileOverlay) {
            mobileOverlay.classList.remove('hidden');
            const mobileInput = document.getElementById('global-search-mobile-input');
            if (mobileInput) {
                mobileInput.focus();
            }
            if (!mobileInput || !mobileInput.value.trim()) {
                this.renderRecentOrPopular();
            }
        }
    },

    closeMobileSearch() {
        const mobileOverlay = document.getElementById('global-search-mobile-overlay');
        if (mobileOverlay) {
            mobileOverlay.classList.add('hidden');
        }
    },

    openDropdown() {
        const dropdown = document.getElementById('global-search-dropdown');
        const clearBtn = document.getElementById('global-search-clear-btn');
        if (dropdown) {
            dropdown.classList.remove('hidden');
            this.isOpen = true;
        }
        const input = document.getElementById('global-search-input');
        if (clearBtn && input && input.value) {
            clearBtn.classList.remove('hidden');
        }
    },

    closeDropdown() {
        const dropdown = document.getElementById('global-search-dropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
            this.isOpen = false;
        }
        this.selectedIndex = -1;
    },

    clearSearch() {
        const input = document.getElementById('global-search-input');
        const mobileInput = document.getElementById('global-search-mobile-input');
        const clearBtn = document.getElementById('global-search-clear-btn');
        if (input) input.value = '';
        if (mobileInput) mobileInput.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');
        this.query = '';
        this.renderRecentOrPopular();
        if (input && window.innerWidth >= 768) input.focus();
        else if (mobileInput) mobileInput.focus();
    },

    handleInput(val) {
        this.query = (val || '').trim();
        const clearBtn = document.getElementById('global-search-clear-btn');
        if (clearBtn) {
            if (this.query) clearBtn.classList.remove('hidden');
            else clearBtn.classList.add('hidden');
        }

        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (!this.query) {
                this.renderRecentOrPopular();
            } else {
                this.performSearch(this.query);
            }
        }, 150);
    },

    handleKeydown(e) {
        const items = document.querySelectorAll('.global-search-result-item');
        if (!items || items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % items.length;
            this.updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
            this.updateSelection(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                items[this.selectedIndex].click();
            } else if (items.length > 0) {
                items[0].click();
            }
        }
    },

    updateSelection(items) {
        items.forEach((it, idx) => {
            if (idx === this.selectedIndex) {
                it.classList.add('bg-blue-50', 'border-blue-300', 'ring-1', 'ring-blue-400/50');
                it.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                it.classList.remove('bg-blue-50', 'border-blue-300', 'ring-1', 'ring-blue-400/50');
            }
        });
    },

    setFilter(filter) {
        this.activeFilter = filter;
        if (this.query) {
            this.renderSearchResults();
        } else {
            this.renderRecentOrPopular();
        }
    },

    getRecentSearches() {
        try {
            const raw = localStorage.getItem(this.RECENT_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch(e) {
            return [];
        }
    },

    addRecentSearch(term) {
        if (!term || typeof term !== 'string' || term.trim().length < 2) return;
        try {
            let list = this.getRecentSearches();
            list = list.filter(item => item.toLowerCase() !== term.toLowerCase());
            list.unshift(term.trim());
            if (list.length > 6) list = list.slice(0, 6);
            localStorage.setItem(this.RECENT_KEY, JSON.stringify(list));
        } catch(e) {}
    },

    clearRecentSearches() {
        try {
            localStorage.removeItem(this.RECENT_KEY);
            this.renderRecentOrPopular();
        } catch(e) {}
    },

    highlightMatch(text, query) {
        if (!text) return '';
        const str = String(text);
        if (!query) return this.escapeHtml(str);
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        return this.escapeHtml(str).replace(regex, `<mark class="bg-amber-200/80 text-slate-900 font-semibold px-0.5 rounded">$1</mark>`);
    },

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    fetchAllData() {
        let products = [];
        let orders = [];
        let customers = [];
        let suppliers = [];
        let deliveries = [];

        try {
            if (typeof getStorage === 'function') {
                products = getStorage('products', []) || [];
                orders = getStorage('orders', []) || [];
                customers = getStorage('customers', []) || [];
                suppliers = getStorage('suppliers', []) || [];
                deliveries = getStorage('deliveries', []) || [];
            } else {
                const storeId = window.getStoreOwnerId ? window.getStoreOwnerId() : 1;
                products = JSON.parse(localStorage.getItem(`easebus_u${storeId}_products`) || localStorage.getItem('easebus_products') || '[]');
                orders = JSON.parse(localStorage.getItem(`easebus_u${storeId}_orders`) || localStorage.getItem('easebus_orders') || '[]');
                customers = JSON.parse(localStorage.getItem(`easebus_u${storeId}_customers`) || localStorage.getItem('easebus_customers') || '[]');
                suppliers = JSON.parse(localStorage.getItem(`easebus_u${storeId}_suppliers`) || localStorage.getItem('easebus_suppliers') || '[]');
                deliveries = JSON.parse(localStorage.getItem(`easebus_u${storeId}_deliveries`) || localStorage.getItem('easebus_deliveries') || '[]');
            }
        } catch(e) {
            console.warn('Error reading local search collections', e);
        }

        return { products, orders, customers, suppliers, deliveries };
    },

    performSearch(rawQuery) {
        const query = rawQuery.toLowerCase().trim();
        const { products, orders, customers, suppliers, deliveries } = this.fetchAllData();

        // 1. Search Products by Name, SKU, ID, Category, Brand, Description
        const matchedProducts = products.filter(p => {
            if (!p) return false;
            const name = String(p.name || '').toLowerCase();
            const sku = String(p.sku || '').toLowerCase();
            const id = String(p.id || '').toLowerCase();
            const cat = String(p.category_name || '').toLowerCase();
            const brand = String(p.brand || '').toLowerCase();
            const desc = String(p.description || '').toLowerCase();
            const price = String(p.selling_price || '').toLowerCase();
            return name.includes(query) || sku.includes(query) || id === query || id.includes(query) || cat.includes(query) || brand.includes(query) || desc.includes(query) || price === query;
        });

        // 2. Search Orders by Order #, ID, Customer Name, Customer Phone, Payment Status, Order Status
        const matchedOrders = orders.filter(o => {
            if (!o) return false;
            const orderNo = String(o.order_no || o.order_number || '').toLowerCase();
            const id = String(o.id || '').toLowerCase();
            const custName = String(o.customer_name || '').toLowerCase();
            const custPhone = String(o.customer_phone || '').toLowerCase();
            const payStatus = String(o.payment_status || '').toLowerCase();
            const ordStatus = String(o.order_status || '').toLowerCase();
            const amt = String(o.total_amount || '').toLowerCase();
            return orderNo.includes(query) || id === query || id.includes(query) || custName.includes(query) || custPhone.includes(query) || payStatus.includes(query) || ordStatus.includes(query) || amt === query;
        });

        // 3. Search Customers by Name, Phone, Email, Customer Code, Address, ID
        const matchedCustomers = customers.filter(c => {
            if (!c) return false;
            const name = String(c.name || '').toLowerCase();
            const phone = String(c.phone || '').toLowerCase();
            const email = String(c.email || '').toLowerCase();
            const code = String(c.customer_code || '').toLowerCase();
            const address = String(c.address || '').toLowerCase();
            const id = String(c.id || '').toLowerCase();
            return name.includes(query) || phone.includes(query) || email.includes(query) || code.includes(query) || address.includes(query) || id === query || id.includes(query);
        });

        // 4. Search Suppliers by Name, Code, Phone, Contact Person, ID
        const matchedSuppliers = suppliers.filter(s => {
            if (!s) return false;
            const name = String(s.name || '').toLowerCase();
            const code = String(s.supplier_code || '').toLowerCase();
            const contact = String(s.contact_person || s.contact || '').toLowerCase();
            const phone = String(s.phone || '').toLowerCase();
            const id = String(s.id || '').toLowerCase();
            return name.includes(query) || code.includes(query) || contact.includes(query) || phone.includes(query) || id === query || id.includes(query);
        });

        // 5. Search Deliveries by Tracking #, Order #, Recipient Name
        const matchedDeliveries = deliveries.filter(d => {
            if (!d) return false;
            const tracking = String(d.tracking_no || '').toLowerCase();
            const orderNo = String(d.order_no || d.order_number || '').toLowerCase();
            const custName = String(d.customer_name || d.recipient_name || '').toLowerCase();
            const courier = String(d.courier || '').toLowerCase();
            const status = String(d.status || '').toLowerCase();
            return tracking.includes(query) || orderNo.includes(query) || custName.includes(query) || courier.includes(query) || status.includes(query);
        });

        this.searchResults = {
            products: matchedProducts,
            orders: matchedOrders,
            customers: matchedCustomers,
            suppliers: matchedSuppliers,
            deliveries: matchedDeliveries
        };

        this.renderSearchResults();
    },

    renderSearchResults() {
        const dropdown = document.getElementById('global-search-dropdown');
        const mobileContainer = document.getElementById('global-search-mobile-results');
        if (!dropdown && !mobileContainer) return;

        const { products, orders, customers, suppliers, deliveries } = this.searchResults;
        const totalCount = products.length + orders.length + customers.length + suppliers.length + deliveries.length;
        const query = this.query;
        this.selectedIndex = -1;

        let contentHtml = '';

        // Filter tabs bar
        const tabsHtml = `
            <div class="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold text-slate-600 no-scrollbar">
                <button type="button" onclick="GlobalSearch.setFilter('all')" class="px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'all' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}">
                    All <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${this.activeFilter === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}">${totalCount}</span>
                </button>
                <button type="button" onclick="GlobalSearch.setFilter('products')" class="px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'products' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}">
                    Products <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${this.activeFilter === 'products' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}">${products.length}</span>
                </button>
                <button type="button" onclick="GlobalSearch.setFilter('orders')" class="px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'orders' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}">
                    Orders <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${this.activeFilter === 'orders' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}">${orders.length}</span>
                </button>
                <button type="button" onclick="GlobalSearch.setFilter('customers')" class="px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'customers' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}">
                    Customers <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${this.activeFilter === 'customers' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}">${customers.length}</span>
                </button>
                ${suppliers.length > 0 ? `
                <button type="button" onclick="GlobalSearch.setFilter('suppliers')" class="px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'suppliers' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}">
                    Suppliers <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${this.activeFilter === 'suppliers' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}">${suppliers.length}</span>
                </button>
                ` : ''}
                ${deliveries.length > 0 ? `
                <button type="button" onclick="GlobalSearch.setFilter('deliveries')" class="px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'deliveries' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}">
                    Logistics <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${this.activeFilter === 'deliveries' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}">${deliveries.length}</span>
                </button>
                ` : ''}
            </div>
        `;

        if (totalCount === 0) {
            contentHtml = `
                <div class="p-8 text-center bg-white">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <span class="material-symbols-outlined text-2xl">search_off</span>
                    </div>
                    <p class="text-xs font-bold text-slate-800">No records found for "${this.escapeHtml(query)}"</p>
                    <p class="text-[11px] text-slate-400 mt-1">Try searching with a different product name, order #, SKU, or customer phone.</p>
                    
                    <div class="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2">
                        <button onclick="GlobalSearch.closeDropdown(); GlobalSearch.closeMobileSearch(); App.navigate('orders'); setTimeout(() => { if (window.Orders && typeof window.Orders.showCreateView === 'function') window.Orders.showCreateView(); }, 200);" class="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 cursor-pointer">
                            <span class="material-symbols-outlined text-sm">add_shopping_cart</span> New Order
                        </button>
                        <button onclick="GlobalSearch.closeDropdown(); GlobalSearch.closeMobileSearch(); App.navigate('products'); setTimeout(() => { if (window.Products && typeof window.Products.showCreateModal === 'function') window.Products.showCreateModal(); }, 200);" class="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1 cursor-pointer">
                            <span class="material-symbols-outlined text-sm">add_box</span> Add Product
                        </button>
                        <button onclick="GlobalSearch.closeDropdown(); GlobalSearch.closeMobileSearch(); App.navigate('customers'); setTimeout(() => { if (window.Customers && typeof window.Customers.showModal === 'function') window.Customers.showModal(); }, 200);" class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1 cursor-pointer">
                            <span class="material-symbols-outlined text-sm">person_add</span> Add Customer
                        </button>
                    </div>
                </div>
            `;
        } else {
            let sectionsHtml = '';

            // Section: Products
            if ((this.activeFilter === 'all' || this.activeFilter === 'products') && products.length > 0) {
                sectionsHtml += `
                    <div class="p-3">
                        <div class="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <span class="flex items-center gap-1.5 text-blue-600">
                                <span class="material-symbols-outlined text-sm">inventory_2</span> Products (${products.length})
                            </span>
                            <span class="text-[10px] text-slate-400 font-normal">Click to manage stock</span>
                        </div>
                        <div class="space-y-1.5 mt-1">
                            ${products.slice(0, this.activeFilter === 'products' ? 20 : 4).map(p => {
                                const stock = p.current_stock !== undefined ? p.current_stock : (p.total_stock || 0);
                                const isLow = stock <= (p.min_stock_level || 5);
                                const stockBadge = stock <= 0 
                                    ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Out of Stock</span>`
                                    : (isLow 
                                        ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Low Stock (${stock})</span>`
                                        : `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">${stock} In Stock</span>`);

                                const formattedPrice = (window.UI && typeof window.UI.formatMoney === 'function') ? window.UI.formatMoney(p.selling_price) : `৳${p.selling_price || 0}`;

                                return `
                                    <div onclick="GlobalSearch.selectProduct(${p.id}, '${this.escapeHtml(p.name)}')" class="global-search-result-item group p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-white hover:bg-blue-50/50 transition-all flex items-center justify-between gap-3 cursor-pointer">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <div class="w-9 h-9 rounded-lg bg-blue-100/80 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                                                <span class="material-symbols-outlined text-lg">package_2</span>
                                            </div>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <h4 class="font-bold text-slate-900 text-xs truncate">${this.highlightMatch(p.name, query)}</h4>
                                                    <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">${this.highlightMatch(p.sku, query)}</span>
                                                </div>
                                                <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <span>${p.category_name || 'General'}</span> &bull;
                                                    <span class="font-bold text-slate-700">${formattedPrice}</span>
                                                    ${p.brand ? `&bull; <span>${p.brand}</span>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2 shrink-0">
                                            ${stockBadge}
                                            <span class="material-symbols-outlined text-slate-400 group-hover:text-blue-600 text-sm">arrow_forward</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            // Section: Orders
            if ((this.activeFilter === 'all' || this.activeFilter === 'orders') && orders.length > 0) {
                sectionsHtml += `
                    <div class="p-3 border-t border-slate-100">
                        <div class="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <span class="flex items-center gap-1.5 text-emerald-600">
                                <span class="material-symbols-outlined text-sm">shopping_cart</span> Orders & Sales (${orders.length})
                            </span>
                            <span class="text-[10px] text-slate-400 font-normal">Click to view invoice</span>
                        </div>
                        <div class="space-y-1.5 mt-1">
                            ${orders.slice(0, this.activeFilter === 'orders' ? 20 : 4).map(o => {
                                const orderNo = o.order_no || o.order_number || ('ORD-' + o.id);
                                const isPaid = (o.payment_status || 'paid').toLowerCase() === 'paid';
                                const payBadge = isPaid 
                                    ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">PAID</span>`
                                    : `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">${o.payment_status || 'UNPAID'}</span>`;

                                const formattedAmt = (window.UI && typeof window.UI.formatMoney === 'function') ? window.UI.formatMoney(o.total_amount) : `৳${o.total_amount || 0}`;
                                const formattedDate = (window.UI && typeof window.UI.formatDate === 'function') ? window.UI.formatDate(o.created_at || o.order_date) : (o.created_at || '');

                                return `
                                    <div onclick="GlobalSearch.selectOrder(${o.id}, '${orderNo}')" class="global-search-result-item group p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 bg-white hover:bg-emerald-50/50 transition-all flex items-center justify-between gap-3 cursor-pointer">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <div class="w-9 h-9 rounded-lg bg-emerald-100/80 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                                                <span class="material-symbols-outlined text-lg">receipt_long</span>
                                            </div>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <span class="font-mono font-bold text-slate-900 text-xs">${this.highlightMatch(orderNo, query)}</span>
                                                    <span class="text-xs text-slate-700 font-semibold truncate">• ${this.highlightMatch(o.customer_name || 'Walk-in', query)}</span>
                                                </div>
                                                <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <span>${formattedDate}</span> &bull;
                                                    <span class="font-bold text-emerald-600">${formattedAmt}</span>
                                                    ${o.customer_phone ? `&bull; <span>📞 ${this.highlightMatch(o.customer_phone, query)}</span>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2 shrink-0">
                                            ${payBadge}
                                            <span class="material-symbols-outlined text-slate-400 group-hover:text-emerald-600 text-sm">arrow_forward</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            // Section: Customers
            if ((this.activeFilter === 'all' || this.activeFilter === 'customers') && customers.length > 0) {
                sectionsHtml += `
                    <div class="p-3 border-t border-slate-100">
                        <div class="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <span class="flex items-center gap-1.5 text-indigo-600">
                                <span class="material-symbols-outlined text-sm">people</span> Customers (${customers.length})
                            </span>
                            <span class="text-[10px] text-slate-400 font-normal">Click to view CRM details</span>
                        </div>
                        <div class="space-y-1.5 mt-1">
                            ${customers.slice(0, this.activeFilter === 'customers' ? 20 : 4).map(c => {
                                const formattedSpent = (window.UI && typeof window.UI.formatMoney === 'function') ? window.UI.formatMoney(c.total_spent) : `৳${c.total_spent || 0}`;

                                return `
                                    <div onclick="GlobalSearch.selectCustomer(${c.id}, '${this.escapeHtml(c.name)}')" class="global-search-result-item group p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 bg-white hover:bg-indigo-50/50 transition-all flex items-center justify-between gap-3 cursor-pointer">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <div class="w-9 h-9 rounded-lg bg-indigo-100/80 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                                                ${(c.name || 'C').charAt(0).toUpperCase()}
                                            </div>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <h4 class="font-bold text-slate-900 text-xs truncate">${this.highlightMatch(c.name, query)}</h4>
                                                    ${c.customer_code ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-600">${this.highlightMatch(c.customer_code, query)}</span>` : ''}
                                                </div>
                                                <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <span>📞 ${this.highlightMatch(c.phone || 'No phone', query)}</span> &bull;
                                                    <span class="truncate">${this.highlightMatch(c.address || 'Dhaka', query)}</span>
                                                    ${c.total_spent ? `&bull; <span class="font-bold text-slate-700">Spent: ${formattedSpent}</span>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2 shrink-0">
                                            <span class="material-symbols-outlined text-slate-400 group-hover:text-indigo-600 text-sm">arrow_forward</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            // Section: Suppliers
            if ((this.activeFilter === 'all' || this.activeFilter === 'suppliers') && suppliers.length > 0) {
                sectionsHtml += `
                    <div class="p-3 border-t border-slate-100">
                        <div class="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <span class="flex items-center gap-1.5 text-amber-600">
                                <span class="material-symbols-outlined text-sm">local_shipping</span> Suppliers (${suppliers.length})
                            </span>
                        </div>
                        <div class="space-y-1.5 mt-1">
                            ${suppliers.slice(0, this.activeFilter === 'suppliers' ? 20 : 3).map(s => {
                                return `
                                    <div onclick="GlobalSearch.selectSupplier(${s.id}, '${this.escapeHtml(s.name)}')" class="global-search-result-item group p-2.5 rounded-xl border border-slate-100 hover:border-amber-200 bg-white hover:bg-amber-50/50 transition-all flex items-center justify-between gap-3 cursor-pointer">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <div class="w-9 h-9 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                <span class="material-symbols-outlined text-lg">domain</span>
                                            </div>
                                            <div class="min-w-0">
                                                <h4 class="font-bold text-slate-900 text-xs truncate">${this.highlightMatch(s.name, query)}</h4>
                                                <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <span>${this.highlightMatch(s.supplier_code || 'SUP', query)}</span> &bull;
                                                    <span>📞 ${this.highlightMatch(s.phone || '--', query)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span class="material-symbols-outlined text-slate-400 group-hover:text-amber-600 text-sm">arrow_forward</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            // Section: Deliveries
            if ((this.activeFilter === 'all' || this.activeFilter === 'deliveries') && deliveries.length > 0) {
                sectionsHtml += `
                    <div class="p-3 border-t border-slate-100">
                        <div class="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <span class="flex items-center gap-1.5 text-teal-600">
                                <span class="material-symbols-outlined text-sm">moped</span> Logistics & Dispatch (${deliveries.length})
                            </span>
                        </div>
                        <div class="space-y-1.5 mt-1">
                            ${deliveries.slice(0, this.activeFilter === 'deliveries' ? 20 : 3).map(d => {
                                return `
                                    <div onclick="GlobalSearch.selectDelivery('${d.tracking_no}')" class="global-search-result-item group p-2.5 rounded-xl border border-slate-100 hover:border-teal-200 bg-white hover:bg-teal-50/50 transition-all flex items-center justify-between gap-3 cursor-pointer">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <div class="w-9 h-9 rounded-lg bg-teal-100/80 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                <span class="material-symbols-outlined text-lg">local_shipping</span>
                                            </div>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2">
                                                    <span class="font-mono font-bold text-slate-900 text-xs">${this.highlightMatch(d.tracking_no, query)}</span>
                                                    <span class="text-xs text-slate-600">• ${this.highlightMatch(d.customer_name || 'Customer', query)}</span>
                                                </div>
                                                <div class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <span>Order: ${d.order_no || '--'}</span> &bull;
                                                    <span class="capitalize">${d.courier || 'Courier'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">${d.status || 'in_transit'}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            contentHtml = sectionsHtml;
        }

        const fullHtml = `
            ${tabsHtml}
            <div class="max-h-[60vh] overflow-y-auto font-jakarta divide-y divide-slate-100">
                ${contentHtml}
            </div>
            <div class="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <div class="flex items-center gap-2">
                    <span class="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↑↓</span>
                    <span>to navigate</span>
                    <span class="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↵</span>
                    <span>to select</span>
                    <span class="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">ESC</span>
                    <span>to dismiss</span>
                </div>
                <span>${totalCount} result(s)</span>
            </div>
        `;

        if (dropdown) dropdown.innerHTML = fullHtml;
        if (mobileContainer) mobileContainer.innerHTML = fullHtml;
    },

    renderRecentOrPopular() {
        const dropdown = document.getElementById('global-search-dropdown');
        const mobileContainer = document.getElementById('global-search-mobile-results');
        if (!dropdown && !mobileContainer) return;

        const recent = this.getRecentSearches();
        const { products, orders, customers } = this.fetchAllData();

        let recentHtml = '';
        if (recent.length > 0) {
            recentHtml = `
                <div class="p-3">
                    <div class="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm">history</span> Recent Searches
                        </span>
                        <button onclick="GlobalSearch.clearRecentSearches()" class="text-[10px] text-slate-400 hover:text-red-500 transition-colors cursor-pointer">Clear</button>
                    </div>
                    <div class="flex flex-wrap gap-1.5 mt-1.5 px-2">
                        ${recent.map(term => `
                            <button onclick="GlobalSearch.setSearchTerm('${this.escapeHtml(term)}')" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs transition-colors cursor-pointer">
                                <span class="material-symbols-outlined text-xs text-slate-400">search</span>
                                <span>${this.escapeHtml(term)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Quick Jump shortcuts & Top Catalog Items
        let topItemsHtml = `
            <div class="p-3 ${recent.length > 0 ? 'border-t border-slate-100' : ''}">
                <div class="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-sm">bolt</span> Quick Navigation Shortcuts
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5 p-1">
                    <button onclick="GlobalSearch.closeDropdown(); GlobalSearch.closeMobileSearch(); App.navigate('orders');" class="p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 text-left transition-all flex items-center gap-2.5 cursor-pointer">
                        <span class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">shopping_cart</span>
                        <div>
                            <p class="font-bold text-xs text-slate-800">Orders & Sales</p>
                            <p class="text-[10px] text-slate-400">${orders.length} orders</p>
                        </div>
                    </button>
                    <button onclick="GlobalSearch.closeDropdown(); GlobalSearch.closeMobileSearch(); App.navigate('products');" class="p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 text-left transition-all flex items-center gap-2.5 cursor-pointer">
                        <span class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">inventory_2</span>
                        <div>
                            <p class="font-bold text-xs text-slate-800">Products Catalog</p>
                            <p class="text-[10px] text-slate-400">${products.length} products</p>
                        </div>
                    </button>
                    <button onclick="GlobalSearch.closeDropdown(); GlobalSearch.closeMobileSearch(); App.navigate('customers');" class="p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 text-left transition-all flex items-center gap-2.5 cursor-pointer">
                        <span class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">people</span>
                        <div>
                            <p class="font-bold text-xs text-slate-800">Customers CRM</p>
                            <p class="text-[10px] text-slate-400">${customers.length} clients</p>
                        </div>
                    </button>
                </div>
            </div>
        `;

        // Popular / Recent Orders preview
        let recentOrdersHtml = '';
        if (orders.length > 0) {
            recentOrdersHtml = `
                <div class="p-3 border-t border-slate-100">
                    <div class="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Latest Orders</span>
                        <span class="text-[10px] font-normal text-slate-400">Click to inspect</span>
                    </div>
                    <div class="space-y-1 mt-1">
                        ${orders.slice(0, 3).map(o => {
                            const formattedAmt = (window.UI && typeof window.UI.formatMoney === 'function') ? window.UI.formatMoney(o.total_amount) : `৳${o.total_amount || 0}`;
                            return `
                                <div onclick="GlobalSearch.selectOrder(${o.id}, '${o.order_no || o.order_number || o.id}')" class="global-search-result-item p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer">
                                    <div class="flex items-center gap-2">
                                        <span class="font-mono font-bold text-slate-800">${o.order_no || o.order_number || ('ORD-' + o.id)}</span>
                                        <span class="text-slate-500">• ${o.customer_name || 'Customer'}</span>
                                    </div>
                                    <span class="font-bold text-slate-700">${formattedAmt}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        const fullHtml = `
            <div class="max-h-[60vh] overflow-y-auto font-jakarta divide-y divide-slate-100">
                ${recentHtml}
                ${topItemsHtml}
                ${recentOrdersHtml}
            </div>
            <div class="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Start typing to search products, orders, or customers...</span>
                <span class="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">⌘K</span>
            </div>
        `;

        if (dropdown) dropdown.innerHTML = fullHtml;
        if (mobileContainer) mobileContainer.innerHTML = fullHtml;
    },

    setSearchTerm(term) {
        const input = document.getElementById('global-search-input');
        const mobileInput = document.getElementById('global-search-mobile-input');
        if (input) input.value = term;
        if (mobileInput) mobileInput.value = term;
        this.handleInput(term);
    },

    selectProduct(productId, productName) {
        this.addRecentSearch(productName);
        this.closeDropdown();
        this.closeMobileSearch();
        
        App.navigate('inventory');
        setTimeout(() => {
            if (window.Inventory && typeof window.Inventory.filterSearch === 'function') {
                const invSearch = document.getElementById('inv-search');
                if (invSearch) {
                    invSearch.value = productName;
                    window.Inventory.filterSearch();
                }
            } else if (window.Products && typeof window.Products.loadProducts === 'function') {
                App.navigate('products');
            }
            if (window.UI && typeof window.UI.toast === 'function') {
                window.UI.toast(`Viewing Product: ${productName}`, 'info');
            }
        }, 150);
    },

    selectOrder(orderId, orderNo) {
        this.addRecentSearch(orderNo);
        this.closeDropdown();
        this.closeMobileSearch();

        App.navigate('orders');
        setTimeout(() => {
            if (window.Orders && typeof window.Orders.showInvoiceModal === 'function') {
                window.Orders.showInvoiceModal(orderId);
            }
        }, 200);
    },

    selectCustomer(customerId, customerName) {
        this.addRecentSearch(customerName);
        this.closeDropdown();
        this.closeMobileSearch();

        App.navigate('customers');
        setTimeout(() => {
            if (window.Customers && typeof window.Customers.showModal === 'function') {
                window.Customers.showModal(customerId);
            }
        }, 200);
    },

    selectSupplier(supplierId, supplierName) {
        this.addRecentSearch(supplierName);
        this.closeDropdown();
        this.closeMobileSearch();

        App.navigate('suppliers');
        setTimeout(() => {
            if (window.Suppliers && typeof window.Suppliers.showModal === 'function') {
                window.Suppliers.showModal(supplierId);
            }
        }, 200);
    },

    selectDelivery(trackingNo) {
        this.addRecentSearch(trackingNo);
        this.closeDropdown();
        this.closeMobileSearch();

        App.navigate('deliveries');
        setTimeout(() => {
            if (window.UI && typeof window.UI.toast === 'function') {
                window.UI.toast(`Viewing Delivery Tracking: ${trackingNo}`, 'info');
            }
        }, 200);
    }
};

// Initialize on DOM ready or script load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.GlobalSearch.init());
} else {
    setTimeout(() => window.GlobalSearch.init(), 50);
}
