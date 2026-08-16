/**
 * EaseBus — API Client & Complete Live Cloud Engine Driver
 */

window.APP_CONFIG = window.APP_CONFIG || {
    name: "EaseBus",
    currency: "BDT",
    currencySymbol: "৳",
    userRole: "",
    username: "",
    csrfToken: ""
};

// Seed dataset for live web execution (Clean 0-state for new stores)
const SEED_DATA = {
    products: [],
    categories: ['Apparel & Clothing', 'Electronics & Gadgets', 'Footwear & Shoes', 'Bags & Accessories', 'Home & Living', 'General Sales'],
    orders: [],
    deliveries: [],
    returns: [],
    finance: {
        accounts: [
            { id: 1, name: 'Main Cash Register', type: 'cash', account_number: 'CASH-01', current_balance: 0, status: 'active' },
            { id: 2, name: 'Main Bank Account', type: 'bank', account_number: 'BANK-01', current_balance: 0, status: 'active' }
        ],
        transactions: []
    },
    expenses: [],
    suppliers: [],
    customers: [],
    investors: [],
    users: [],
    settings: {
        name: 'EaseBus Store',
        currency: 'BDT',
        currency_symbol: '৳',
        phone: '',
        email: '',
        address: '',
        tax_enabled: 0,
        tax_rate: 0
    }
};

// One-time Fresh Purge Migration (Wipe all test accounts & test data)
(function autoPurgeLegacyTestData() {
    try {
        if (!localStorage.getItem('easebus_fresh_v4')) {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('easebus_')) {
                    localStorage.removeItem(key);
                }
            });
            localStorage.setItem('easebus_fresh_v4', 'true');
        }
    } catch(e) {}
})();

function getCurrentUserId() {
    try {
        const u = localStorage.getItem('easebus_active_user');
        if (u) {
            const parsed = JSON.parse(u);
            if (parsed.id) return parsed.id;
        }
    } catch(e) {}
    // Stable fallback anonymous ID so storage never breaks
    let anonId = localStorage.getItem('easebus_anon_id');
    if (!anonId) {
        anonId = 'anon_' + Date.now();
        localStorage.setItem('easebus_anon_id', anonId);
    }
    return anonId;
}

function getGlobalUsers() {
    try {
        const stored = localStorage.getItem('easebus_global_users');
        let users = stored ? JSON.parse(stored) : [];
        // Exclude Creator account from store users registry
        users = users.filter(u => u.username !== 'shad@dbms.com' && u.email !== 'shad@dbms.com' && u.role !== 'creator');
        localStorage.setItem('easebus_global_users', JSON.stringify(users));
        return users;
    } catch(e) { return []; }
}

function registerGlobalUser(user) {
    try {
        let users = getGlobalUsers();
        const existingIdx = users.findIndex(u => u.id === user.id || u.username === user.username);
        if (existingIdx >= 0) {
            users[existingIdx] = { ...users[existingIdx], ...user };
        } else {
            users.push({ ...user, created_at: new Date().toISOString() });
        }
        localStorage.setItem('easebus_global_users', JSON.stringify(users));
    } catch(e) {}
}

// Initialize localStorage DB scoped by active User ID
function getStorage(key, fallback) {
    try {
        const uid = getCurrentUserId();
        const stored = localStorage.getItem('easebus_u' + uid + '_' + key);
        return stored ? JSON.parse(stored) : fallback;
    } catch(e) { return fallback; }
}

function setStorage(key, data) {
    try {
        const uid = getCurrentUserId();
        localStorage.setItem('easebus_u' + uid + '_' + key, JSON.stringify(data));
    } catch(e) {}
}

const API = {
    baseUrl: null,
    currentUser: null,
    _serverReachable: null,

    getBaseUrl() {
        if (this.baseUrl) return this.baseUrl;
        const path = window.location.pathname || '';
        if (path.includes('/pages/')) {
            this.baseUrl = '../api';
        } else {
            this.baseUrl = 'api';
        }
        return this.baseUrl;
    },

    getCsrfToken() {
        try {
            return sessionStorage.getItem('csrf_token')
                || window.APP_CONFIG?.csrfToken
                || '';
        } catch (e) {
            return window.APP_CONFIG?.csrfToken || '';
        }
    },

    setCsrfToken(token) {
        if (!token) return;
        try { sessionStorage.setItem('csrf_token', token); } catch (e) {}
        if (window.APP_CONFIG) window.APP_CONFIG.csrfToken = token;
    },

    emitDataChange(endpoint) {
        const module = (endpoint || '').replace(/^\//, '').split('/')[0];
        window.dispatchEvent(new CustomEvent('easebus:data-changed', { detail: { endpoint, module } }));
    },

    getCurrentUser() {
        if (this.currentUser) return this.currentUser;
        try {
            const stored = localStorage.getItem('easebus_active_user');
            if (stored) {
                this.currentUser = JSON.parse(stored);
                return this.currentUser;
            }
        } catch(e) {}
        if (window.APP_CONFIG && window.APP_CONFIG.username && window.APP_CONFIG.username !== 'User') {
            this.currentUser = {
                id: window.APP_CONFIG.userId || (window.APP_CONFIG.userRole === 'creator' ? 99999 : 1),
                username: window.APP_CONFIG.username,
                full_name: window.APP_CONFIG.username === 'shad@dbms.com' ? 'Md Shazzad Hossen Shad (Creator)' : window.APP_CONFIG.username,
                role: window.APP_CONFIG.userRole || 'admin'
            };
            return this.currentUser;
        }
        return null;
    },

    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('easebus_active_user', JSON.stringify(user));
            registerGlobalUser(user);
            if (window.APP_CONFIG) {
                window.APP_CONFIG.username = user.username || user.full_name;
                window.APP_CONFIG.userRole = user.role || 'admin';
            }
        } else {
            localStorage.removeItem('easebus_active_user');
        }
    },

    async isServerAvailable() {
        if (this._serverReachable !== null) return this._serverReachable;
        try {
            const res = await fetch(`${this.getBaseUrl()}/auth/session`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            // Any HTTP response (even 401) means the server is reachable
            this._serverReachable = res.status !== 0;
        } catch (e) {
            this._serverReachable = false;
        }
        return this._serverReachable;
    },

    async syncSession() {
        try {
            const res = await this.remoteRequest('auth/session', 'GET');
            if (res?.data?.csrf_token) this.setCsrfToken(res.data.csrf_token);
            if (res?.data?.user) {
                this.setCurrentUser(res.data.user);
                return res.data.user;
            }
        } catch (e) {}
        return null;
    },

    async init() {
        // Always try to sync with the real server first
        await this.syncSession();
    },

    async request(endpoint, method = 'GET', data = null) {
        const upperMethod = method.toUpperCase();
        const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(upperMethod);

        // Always try the real server first — never fall through to mock on the first attempt
        try {
            const res = await this.remoteRequest(endpoint, method, data);
            if (res?.data?.csrf_token) this.setCsrfToken(res.data.csrf_token);

            if (res && res.success !== false && res.status !== 'error') {
                this._serverReachable = true;
                if (isMutation) this.emitDataChange(endpoint);
                return res;
            }

            // Server returned an error response (e.g. validation error, auth error)
            if (isMutation) {
                throw new Error(res?.message || 'Request failed');
            }
            // For GET requests, surface the server error — do NOT fall back to mock
            throw new Error(res?.message || 'Request failed');
        } catch (e) {
            // Mark server as reachable if we got an HTTP response (even if it was an error)
            if (e.status) {
                this._serverReachable = true;
            }

            if (isMutation) {
                // Mutations always fail loudly — never silently use mock
                throw new Error(e.message || 'Failed to save data. Please refresh and try again.');
            }

            // For GET requests: if server is reachable but returned an error, surface it
            if (this._serverReachable) {
                throw e;
            }

            // Server genuinely unreachable — only then fall back to mock
            console.warn('Server unreachable, using offline mock engine for:', endpoint);
            return this.mockCloudEngine(endpoint, method, data);
        }
    },

    async remoteRequest(endpoint, method, data) {
        const cleanEp = endpoint.replace(/^\//, '');
        const url = `${this.getBaseUrl()}/${cleanEp}`;
        const upperMethod = method.toUpperCase();
        const headers = { 'Accept': 'application/json' };

        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(upperMethod)) {
            if (!(data instanceof FormData)) headers['Content-Type'] = 'application/json';
            const token = this.getCsrfToken();
            if (token) headers['X-CSRF-Token'] = token;
        }

        const options = { method: upperMethod, headers, credentials: 'include' };
        if (data && upperMethod !== 'GET') {
            options.body = data instanceof FormData ? data : JSON.stringify(data);
        }

        const res = await fetch(url, options);
        let json = {};
        try { json = await res.json(); } catch (e) {}

        if (!res.ok) {
            const err = new Error(json.message || `HTTP ${res.status}`);
            err.status = res.status;
            err.response = json;
            throw err;
        }
        return json;
    },

    // Standalone Client-Side Live Cloud Engine
    async mockCloudEngine(endpoint, method, data) {
        const cleanEp = endpoint.replace(/^\//, '');
        const [path, queryStr] = cleanEp.split('?');
        const params = new URLSearchParams(queryStr || '');
        const action = params.get('action') || (cleanEp.includes('/') ? cleanEp.split('/')[1] : '');
        const module = path.split('/')[0];

        // Auth
        if (module === 'auth') {
            if (action === 'login') {
                    // Always try the real server first — the request() method handles server vs mock routing
                    // This mock branch is ONLY a fallback when the server is genuinely unreachable
                    const username = (data?.username || '').trim();
                    const password = data?.password || '';

                    if (!username || !password) {
                        return { status: 'error', success: false, message: 'Username and password required.' };
                    }

                    // Check registered users in localStorage (fallback only)
                    const globalUsers = getGlobalUsers();
                    const found = globalUsers.find(u => u.username?.toLowerCase() === username.toLowerCase() || u.email?.toLowerCase() === username.toLowerCase());

                    if (found) {
                        API.setCurrentUser(found);
                        return {
                            status: 'success',
                            success: true,
                            message: 'Login successful',
                            data: { user: found }
                        };
                    } else {
                        return { status: 'error', success: false, message: 'User account not found. Please click "Create Account (Sign Up)" to register.' };
                    }
                }

            if (action === 'register') {
                const username = (data?.username || '').trim();
                const fullname = data?.full_name || data?.fullname || username;
                const business = data?.business_name || (fullname + "'s Store");
                const email = data?.email || (username + '@easebus.com');

                if (!username || !fullname) {
                    return { status: 'error', success: false, message: 'Full Name and Username are required.' };
                }

                const user = {
                    id: Date.now(),
                    username: username,
                    full_name: fullname,
                    business_name: business,
                    role: 'admin',
                    email: email
                };
                registerGlobalUser(user);
                API.setCurrentUser(user);
                return {
                    status: 'success',
                    success: true,
                    message: 'Account created successfully! Welcome to EaseBus.',
                    data: { user }
                };
            }
            if (action === 'logout') {
                API.setCurrentUser(null);
                return { status: 'success', success: true, message: 'Logged out successfully' };
            }
            if (action === 'session' || action === 'me') {
                const curr = API.getCurrentUser();
                if (curr) {
                    return { status: 'success', success: true, data: { user: curr } };
                } else {
                    return { status: 'error', success: false, message: 'Not logged in' };
                }
            }
        }

        // 1. Dashboard
        if (module === 'dashboard') {
            const orders = getStorage('orders', SEED_DATA.orders);
            const deliveries = getStorage('deliveries', SEED_DATA.deliveries);
            const products = getStorage('products', SEED_DATA.products);
            const finance = getStorage('finance', SEED_DATA.finance);
            const expenses = getStorage('expenses', SEED_DATA.expenses);

            const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
            const totalCash = finance.accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

            if (action === 'summary') {
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_sales_today: totalSales,
                            sales_today_count: orders.length,
                            active_deliveries: deliveries.filter(d => d.status !== 'delivered' && d.status !== 'returned').length,
                            orders_pending: orders.filter(o => o.order_status === 'pending').length,
                            low_stock_items: products.filter(p => p.current_stock <= (p.min_stock_level || 5)).length,
                            total_cash: totalCash,
                            monthly_revenue: totalSales,
                            monthly_expenses: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
                            monthly_net_profit: totalSales - expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
                            recent_orders: orders.slice(0, 5),
                            alerts: [
                                { type: 'success', icon: 'verified', text: 'EaseBus ERP live & running — all systems operational.', color: 'text-emerald-500' },
                                products.filter(p => p.current_stock <= (p.min_stock_level || 5)).length > 0
                                    ? { type: 'warning', icon: 'warning', text: `${products.filter(p => p.current_stock <= (p.min_stock_level || 5)).length} product(s) are low on stock.`, color: 'text-amber-500' }
                                    : null
                            ].filter(Boolean)
                        }
                    }
                };
            }
            if (action === 'revenue_chart') {
                // Build last 30 days chart from orders
                const chart = [];
                for (let i = 29; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                    const dayOrders = orders.filter(o => {
                        const od = new Date(o.created_at);
                        return od.toDateString() === d.toDateString();
                    });
                    chart.push({ label, revenue: dayOrders.reduce((s, o) => s + (o.total_amount || 0), 0), profit: dayOrders.reduce((s, o) => s + (o.total_amount || 0) * 0.3, 0) });
                }
                return { status: 'success', data: { chart } };
            }
        }

        // 2. Products
        if (module === 'products') {
            let products = getStorage('products', SEED_DATA.products);
            if (action === 'summary') {
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_products: products.length,
                            total_skus: products.length,
                            total_stock: products.reduce((sum, p) => sum + (p.current_stock || 0), 0),
                            low_stock_count: products.filter(p => p.current_stock <= p.min_stock_level).length
                        }
                    }
                };
            }
            if (action === 'list') {
                const cats = [...new Set(products.map(p => p.category_name).filter(Boolean))];
                const catObjs = cats.map((c, i) => ({ id: i + 1, name: c }));
                return { status: 'success', data: { products, categories: catObjs } };
            }
            if (action === 'categories') {
                const cats = [...new Set(products.map(p => p.category_name).filter(Boolean))];
                const catObjs = cats.map((c, i) => ({ id: i + 1, name: c }));
                return { status: 'success', data: { categories: catObjs } };
            }
            if (action === 'details') {
                const pid = params.get('id');
                const p = products.find(x => String(x.id) === String(pid)) || products[0];
                if (!p) return { status: 'error', message: 'Product not found' };
                return { status: 'success', data: { product: p, variants: p.variants || [{ sku: p.sku, variant_name: 'Default', location_name: 'Main Warehouse', current_stock: p.current_stock || 0 }] } };
            }
            if (action === 'create') {
                const stock = parseInt(data.initial_stock || data.current_stock || 0);
                const newP = {
                    id: Date.now(),
                    ...data,
                    selling_price: parseFloat(data.selling_price) || 0,
                    purchase_price: parseFloat(data.purchase_price) || 0,
                    current_stock: stock,
                    total_stock: stock,
                    min_stock_level: parseInt(data.min_stock_level || 5),
                    status: 'active',
                    created_at: new Date().toISOString(),
                    variants: [{ id: Date.now(), sku: data.sku || 'SKU-NEW', variant_name: 'Default', location_name: 'Main Warehouse', current_stock: stock, selling_price: parseFloat(data.selling_price) || 0 }]
                };
                products.unshift(newP);
                setStorage('products', products);
                return { status: 'success', message: 'Product created successfully', data: { id: newP.id } };
            }
            if (action === 'update') {
                products = products.map(p => p.id == data.id ? { ...p, ...data, selling_price: parseFloat(data.selling_price || p.selling_price), purchase_price: parseFloat(data.purchase_price || p.purchase_price) } : p);
                setStorage('products', products);
                return { status: 'success', message: 'Product updated successfully' };
            }
            if (action === 'delete') {
                products = products.filter(p => p.id != (data?.id || params.get('id')));
                setStorage('products', products);
                return { status: 'success', message: 'Product deleted' };
            }
        }

        // 3. Orders
        if (module === 'orders') {
            let orders = getStorage('orders', SEED_DATA.orders);
            if (action === 'summary') {
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_orders: orders.length,
                            total_revenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
                            pending_count: orders.filter(o => o.order_status === 'pending').length,
                            delivered_count: orders.filter(o => o.order_status === 'delivered' || o.order_status === 'completed').length
                        }
                    }
                };
            }
            if (action === 'list') {
                const customers = getStorage('customers', SEED_DATA.customers);
                return { status: 'success', data: { orders, customers } };
            }
            if (action === 'products') {
                const products = getStorage('products', SEED_DATA.products);
                return { status: 'success', data: { products } };
            }
            if (action === 'create') {
                const orderId = Date.now();
                const newO = {
                    id: orderId,
                    order_number: 'ORD-' + Math.floor(10000 + Math.random() * 90000),
                    customer_name: data.customer_name || 'Walk-in Customer',
                    customer_id: data.customer_id || null,
                    items: data.items || [],
                    subtotal: parseFloat(data.subtotal || data.total_amount || 0),
                    discount_amount: parseFloat(data.discount_amount || 0),
                    total_amount: parseFloat(data.total_amount || 0),
                    payment_method: data.payment_method || 'cash',
                    payment_status: 'paid',
                    order_status: 'completed',
                    notes: data.notes || '',
                    created_at: new Date().toISOString()
                };
                orders.unshift(newO);
                setStorage('orders', orders);
                // Update product stock
                if (Array.isArray(data.items) && data.items.length > 0) {
                    let products = getStorage('products', SEED_DATA.products);
                    data.items.forEach(item => {
                        products = products.map(p => p.id == item.product_id ? { ...p, current_stock: Math.max(0, (p.current_stock || 0) - (item.quantity || 1)), total_stock: Math.max(0, (p.total_stock || 0) - (item.quantity || 1)) } : p);
                    });
                    setStorage('products', products);
                }
                // Update customer spend
                if (data.customer_id) {
                    let customers = getStorage('customers', SEED_DATA.customers);
                    customers = customers.map(c => c.id == data.customer_id ? { ...c, total_spent: (c.total_spent || 0) + parseFloat(data.total_amount || 0), total_orders: (c.total_orders || 0) + 1 } : c);
                    setStorage('customers', customers);
                }
                return { status: 'success', message: 'Order created successfully', data: { id: newO.id, order_number: newO.order_number } };
            }
            if (action === 'update_status') {
                orders = orders.map(o => o.id == data.id ? { ...o, order_status: data.order_status } : o);
                setStorage('orders', orders);
                return { status: 'success', message: 'Order status updated' };
            }
        }

        // 4. Deliveries
        if (module === 'deliveries') {
            let deliveries = getStorage('deliveries', SEED_DATA.deliveries);
            if (action === 'summary') {
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_deliveries: deliveries.length,
                            in_transit_count: deliveries.filter(d => d.status === 'in_transit').length,
                            delivered_count: deliveries.filter(d => d.status === 'delivered').length,
                            returned_count: deliveries.filter(d => d.status === 'returned').length
                        }
                    }
                };
            }
            if (action === 'list') {
                const orders = getStorage('orders', SEED_DATA.orders);
                return { status: 'success', data: { deliveries, orders, couriers: ['Pathao', 'Steadfast', 'RedX', 'CarryBee', 'Uber', 'Paperfly', 'eCourier'] } };
            }
            if (action === 'create' || action === 'dispatch') {
                const newD = {
                    id: Date.now(),
                    tracking_no: 'TRK-' + Math.floor(100000 + Math.random() * 900000),
                    order_no: data.order_no || data.order_number || 'WALK-IN',
                    customer_name: data.customer_name || 'Customer',
                    customer_address: data.customer_address || data.address || '',
                    courier: data.courier || 'Pathao',
                    status: 'in_transit',
                    dispatch_date: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString()
                };
                deliveries.unshift(newD);
                setStorage('deliveries', deliveries);
                return { status: 'success', message: 'Shipment dispatched successfully', data: { id: newD.id, tracking_no: newD.tracking_no } };
            }
            if (action === 'status' || action === 'update_status') {
                deliveries = deliveries.map(d => d.id == data.id ? { ...d, ...data } : d);
                setStorage('deliveries', deliveries);
                if (data.status === 'returned') {
                    let returns = getStorage('returns', SEED_DATA.returns);
                    const delivery = deliveries.find(d => d.id == data.id);
                    returns.unshift({ id: Date.now(), return_no: 'RET-' + Math.floor(10000 + Math.random() * 90000), order_no: delivery?.order_no || 'N/A', customer_name: delivery?.customer_name || 'Customer', reason: data.return_reason || 'Returned Delivery', status: 'pending', refund_amount: 0, created_at: new Date().toISOString() });
                    setStorage('returns', returns);
                }
                return { status: 'success', message: 'Shipment status updated successfully' };
            }
        }

        // 5. Returns
        if (module === 'returns') {
            let returns = getStorage('returns', SEED_DATA.returns);
            if (action === 'summary') {
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_returns: returns.length,
                            pending_count: returns.filter(r => r.status === 'pending').length,
                            approved_count: returns.filter(r => r.status === 'approved').length,
                            total_refund_amount: returns.reduce((sum, r) => sum + (r.refund_amount || 0), 0)
                        }
                    }
                };
            }
            if (action === 'list') return { status: 'success', data: { returns } };
        }

        // 6. Finance / Accounts
        if (module === 'finance') {
            let finance = getStorage('finance', SEED_DATA.finance);
            if (action === 'summary') {
                const totalCash = finance.accounts.reduce((sum, a) => sum + a.current_balance, 0);
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_liquidity: totalCash,
                            monthly_inflow: 0,
                            monthly_outflow: 0,
                            net_cash_flow: 0
                        }
                    }
                };
            }
            if (action === 'list' || action === 'accounts') return { status: 'success', data: { accounts: finance.accounts, transactions: finance.transactions || [] } };
            if (action === 'transfer') {
                const fromIdx = finance.accounts.findIndex(a => a.id == data.from_account_id);
                const toIdx = finance.accounts.findIndex(a => a.id == data.to_account_id);
                const amount = parseFloat(data.amount || 0);
                if (fromIdx >= 0 && toIdx >= 0 && amount > 0) {
                    finance.accounts[fromIdx].current_balance -= amount;
                    finance.accounts[toIdx].current_balance += amount;
                    const tx = { id: Date.now(), type: 'transfer', amount, from: finance.accounts[fromIdx].name, to: finance.accounts[toIdx].name, note: data.note || '', created_at: new Date().toISOString() };
                    if (!finance.transactions) finance.transactions = [];
                    finance.transactions.unshift(tx);
                    setStorage('finance', finance);
                    return { status: 'success', message: 'Transfer completed successfully' };
                }
                return { status: 'error', message: 'Invalid transfer details' };
            }
            if (action === 'deposit' || action === 'withdraw') {
                const accIdx = finance.accounts.findIndex(a => a.id == data.account_id);
                const amount = parseFloat(data.amount || 0);
                if (accIdx >= 0 && amount > 0) {
                    finance.accounts[accIdx].current_balance += (action === 'deposit' ? amount : -amount);
                    const tx = { id: Date.now(), type: action, amount, account: finance.accounts[accIdx].name, note: data.note || '', created_at: new Date().toISOString() };
                    if (!finance.transactions) finance.transactions = [];
                    finance.transactions.unshift(tx);
                    setStorage('finance', finance);
                    return { status: 'success', message: action === 'deposit' ? 'Deposit recorded' : 'Withdrawal recorded' };
                }
                return { status: 'error', message: 'Invalid account or amount' };
            }
        }

        // 7. Expenses
        if (module === 'expenses') {
            let expenses = getStorage('expenses', SEED_DATA.expenses);
            if (action === 'summary') {
                const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
                return {
                    status: 'success',
                    data: {
                        summary: {
                            monthly_expenses: totalExp,
                            total_expenses: totalExp,
                            top_category: 'None',
                            avg_voucher: 0
                        }
                    }
                };
            }
            if (action === 'list') return { status: 'success', data: { expenses, categories: ['Rent & Utilities', 'Office Supplies', 'Marketing & Ads', 'Salaries & Wages', 'Logistics & Shipping'] } };
            if (action === 'create') {
                const newE = { id: Date.now(), voucher_no: 'EXP-' + Math.floor(1000 + Math.random() * 9000), ...data, expense_date: new Date().toISOString().split('T')[0] };
                expenses.unshift(newE);
                setStorage('expenses', expenses);
                return { status: 'success', message: 'Expense recorded successfully', data: { id: newE.id } };
            }
        }

        // 8. Suppliers
        if (module === 'suppliers') {
            let suppliers = getStorage('suppliers', SEED_DATA.suppliers);
            if (action === 'summary') {
                return {
                    status: 'success',
                    data: {
                        summary: {
                            active_suppliers: suppliers.length,
                            total_products: 0,
                            total_purchases: 0,
                            procurement_value: 0
                        }
                    }
                };
            }
            if (action === 'list') return { status: 'success', data: { suppliers } };
            if (action === 'create') {
                const newS = {
                    id: Date.now(),
                    supplier_code: 'SUP-' + Math.floor(1000 + Math.random() * 9000),
                    ...data,
                    status: 'active',
                    created_at: new Date().toISOString()
                };
                suppliers.unshift(newS);
                setStorage('suppliers', suppliers);
                return { status: 'success', message: 'Supplier added successfully', data: { id: newS.id } };
            }
            if (action === 'update') {
                suppliers = suppliers.map(s => s.id == data.id ? { ...s, ...data } : s);
                setStorage('suppliers', suppliers);
                return { status: 'success', message: 'Supplier updated successfully' };
            }
            if (action === 'delete') {
                suppliers = suppliers.filter(s => s.id != (data?.id || params.get('id')));
                setStorage('suppliers', suppliers);
                return { status: 'success', message: 'Supplier removed' };
            }
        }

        // 9. Customers
        if (module === 'customers') {
            let customers = getStorage('customers', SEED_DATA.customers);
            if (action === 'summary') {
                const orders = getStorage('orders', SEED_DATA.orders);
                const totalSpent = customers.reduce((s, c) => s + (c.total_spent || 0), 0);
                const totalOrders = orders.length;
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_customers: customers.length,
                            active_customers: customers.filter(c => c.status !== 'inactive').length,
                            total_spent: totalSpent,
                            total_orders: totalOrders,
                            avg_spend: customers.length > 0 ? Math.round(totalSpent / customers.length) : 0
                        }
                    }
                };
            }
            if (action === 'list') return { status: 'success', data: { customers } };
            if (action === 'create') {
                const newC = {
                    id: Date.now(),
                    customer_code: 'CUS-' + Math.floor(1000 + Math.random() * 9000),
                    ...data,
                    total_spent: 0,
                    total_orders: 0,
                    status: 'active',
                    created_at: new Date().toISOString()
                };
                customers.unshift(newC);
                setStorage('customers', customers);
                return { status: 'success', message: 'Customer added successfully', data: { id: newC.id } };
            }
            if (action === 'update') {
                customers = customers.map(c => c.id == data.id ? { ...c, ...data } : c);
                setStorage('customers', customers);
                return { status: 'success', message: 'Customer updated successfully' };
            }
            if (action === 'delete') {
                customers = customers.filter(c => c.id != (data?.id || params.get('id')));
                setStorage('customers', customers);
                return { status: 'success', message: 'Customer removed' };
            }
        }

        // 10. Settings
        if (module === 'settings') {
            let settings = getStorage('settings', SEED_DATA.settings);
            if (action === 'get' || action === 'business' || path.endsWith('business')) {
                return { status: 'success', data: { business: settings, settings } };
            }
            if (action === 'update' || method === 'PUT') {
                settings = { ...settings, ...data };
                setStorage('settings', settings);
                return { status: 'success', message: 'Settings saved successfully' };
            }
        }

        // 11. Users & Staff
        if (module === 'users') {
            let users = getStorage('users', SEED_DATA.users);
            if (action === 'roles') {
                return { status: 'success', data: { roles: [{ id: 1, name: 'admin' }, { id: 2, name: 'manager' }] } };
            }
            if (action === 'creator_summary' || action === 'all_data') {
                const globalUsers = getGlobalUsers();
                const enriched = globalUsers.map(u => {
                    const uid = u.id;
                    const uProds = JSON.parse(localStorage.getItem('easebus_u' + uid + '_products') || '[]');
                    const uOrders = JSON.parse(localStorage.getItem('easebus_u' + uid + '_sales') || localStorage.getItem('easebus_u' + uid + '_orders') || '[]');
                    const uExp = JSON.parse(localStorage.getItem('easebus_u' + uid + '_expenses') || '[]');
                    const totalRev = uOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                    const totalCost = uExp.reduce((sum, e) => sum + (e.amount || 0), 0);
                    return {
                        ...u,
                        total_products: uProds.length,
                        total_orders: uOrders.length,
                        total_revenue: totalRev,
                        total_expenses: totalCost,
                        net_profit: totalRev - totalCost
                    };
                });
                return {
                    status: 'success',
                    data: {
                        users: enriched,
                        creator: {
                            name: 'Md Shazzad Hossen Shad',
                            email: 'shad@dbms.com',
                            role: 'Creator & System Administrator'
                        },
                        platform_totals: {
                            total_stores: globalUsers.length,
                            total_orders: enriched.reduce((s, u) => s + u.total_orders, 0),
                            total_products: enriched.reduce((s, u) => s + u.total_products, 0),
                            total_revenue: enriched.reduce((s, u) => s + u.total_revenue, 0)
                        }
                    }
                };
            }
            if (action === 'inspect_user') {
                const uid = params.get('user_id') || data?.user_id;
                const globalUsers = getGlobalUsers();
                const targetUser = globalUsers.find(u => String(u.id) === String(uid)) || { id: uid, username: 'user_' + uid, business_name: 'Store ' + uid };
                const uProds = JSON.parse(localStorage.getItem('easebus_u' + uid + '_products') || '[]');
                const uOrders = JSON.parse(localStorage.getItem('easebus_u' + uid + '_sales') || localStorage.getItem('easebus_u' + uid + '_orders') || '[]');
                const uExpenses = JSON.parse(localStorage.getItem('easebus_u' + uid + '_expenses') || '[]');
                const uFinance = JSON.parse(localStorage.getItem('easebus_u' + uid + '_finance') || JSON.stringify(SEED_DATA.finance));
                const uSettings = JSON.parse(localStorage.getItem('easebus_u' + uid + '_settings') || JSON.stringify(SEED_DATA.settings));
                const uCustomers = JSON.parse(localStorage.getItem('easebus_u' + uid + '_customers') || '[]');

                const totalRev = uOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                const totalCost = uExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

                return {
                    status: 'success',
                    data: {
                        user: targetUser,
                        metrics: {
                            total_products: uProds.length,
                            total_orders: uOrders.length,
                            total_customers: uCustomers.length,
                            total_revenue: totalRev,
                            total_expenses: totalCost,
                            net_profit: totalRev - totalCost
                        },
                        products: uProds,
                        orders: uOrders,
                        expenses: uExpenses,
                        finance: uFinance,
                        settings: uSettings
                    }
                };
            }
            if (action === 'list') return { status: 'success', data: { users } };
            if (action === 'create') {
                const newUser = { id: Date.now(), ...data, status: 'active', last_login: 'Never' };
                users.unshift(newUser);
                setStorage('users', users);
                return { status: 'success', message: 'User created successfully' };
            }
        }

        // 12. Reports
        if (module === 'reports') {
            const sales = getStorage('orders', SEED_DATA.orders);
            const expenses = getStorage('expenses', SEED_DATA.expenses);
            const totalSales = sales.reduce((sum, o) => sum + (o.total_amount || 0), 0);
            const totalExp = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

            if (action === 'inventory_valuation' || path.endsWith('inventory_valuation')) {
                return {
                    status: 'success',
                    data: {
                        valuation: []
                    }
                };
            }

            if (action === 'profit_loss' || action === 'financial' || action === 'summary' || path.endsWith('profit_loss')) {
                return {
                    status: 'success',
                    data: {
                        report: {
                            period: { start: '2026-07-16', end: '2026-08-15', start_date: '2026-07-16', end_date: '2026-08-15' },
                            revenue: totalSales,
                            order_count: sales.length,
                            avg_order_value: sales.length > 0 ? Math.round(totalSales / sales.length) : 0,
                            cogs: 0,
                            gross_profit: totalSales,
                            gross_margin_percent: 0,
                            operating_expenses: totalExp,
                            net_profit: totalSales - totalExp,
                            net_margin_percent: 0,
                            expense_breakdown: [],
                            top_products: []
                        }
                    }
                };
            }
        }

        // 13. Inventory
        if (module === 'inventory') {
            let products = getStorage('products', SEED_DATA.products);
            if (action === 'summary') {
                const totalValue = products.reduce((s, p) => s + (parseFloat(p.purchase_price || p.selling_price || 0) * (p.current_stock || 0)), 0);
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_items: products.length,
                            total_stock: products.reduce((s, p) => s + (p.current_stock || 0), 0),
                            total_stock_value: totalValue,
                            low_stock_count: products.filter(p => p.current_stock <= (p.min_stock_level || 5)).length
                        }
                    }
                };
            }
            if (action === 'list') {
                const inventory = products.map(p => ({
                    product_id: p.id,
                    product_name: p.name,
                    variant_id: p.variants && p.variants[0] ? p.variants[0].id : p.id,
                    variant_sku: p.sku,
                    variant_name: p.variants && p.variants[0] ? p.variants[0].variant_name : 'Default',
                    location_name: p.variants && p.variants[0] ? p.variants[0].location_name : 'Main Warehouse',
                    current_stock: p.current_stock || 0,
                    min_stock_level: p.min_stock_level || 5,
                    avg_cost_price: p.purchase_price || 0
                }));
                return { status: 'success', data: { inventory } };
            }
            if (action === 'movements') {
                const orders = getStorage('orders', SEED_DATA.orders);
                const movements = [];
                orders.forEach(o => {
                    (o.items || []).forEach(item => {
                        movements.push({ id: Date.now() + Math.random(), type: 'sale', quantity: -(item.quantity || 1), reference: o.order_number || 'ORD', product_name: item.product_name || item.name || 'Product', created_at: o.created_at });
                    });
                });
                return { status: 'success', data: { movements, products } };
            }
            if (action === 'adjust') {
                const adjQty = parseInt(data.quantity || 0);
                const isAdd = ['manual_add', 'purchase', 'return'].includes(data.adjustment_type);
                const finalAdj = isAdd ? adjQty : -adjQty;

                products = products.map(p => {
                    if (p.id == (data.product_id || data.variant_id)) {
                        return { 
                            ...p, 
                            current_stock: Math.max(0, (p.current_stock || 0) + finalAdj), 
                            total_stock: Math.max(0, (p.total_stock || 0) + finalAdj) 
                        };
                    }
                    return p;
                });
                setStorage('products', products);
                return { status: 'success', message: 'Stock adjusted successfully' };
            }
        }

        // 14. Investors
        if (module === 'investors') {
            let investors = getStorage('investors', SEED_DATA.investors);
            if (action === 'summary') {
                const totalCapital = investors.reduce((s, i) => s + (parseFloat(i.investment_amount) || 0), 0);
                const totalReturns = investors.reduce((s, i) => s + (parseFloat(i.total_returns_paid) || 0), 0);
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_investors: investors.length,
                            total_capital: totalCapital,
                            total_returns_paid: totalReturns
                        }
                    }
                };
            }
            if (action === 'list') return { status: 'success', data: { investors } };
            if (action === 'create') {
                const newI = {
                    id: Date.now(),
                    investor_code: 'INV-' + Math.floor(1000 + Math.random() * 9000),
                    ...data,
                    investment_amount: parseFloat(data.investment_amount || 0),
                    equity_percentage: parseFloat(data.equity_percentage || 0),
                    total_returns_paid: 0,
                    status: 'active',
                    joined_date: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString()
                };
                investors.unshift(newI);
                setStorage('investors', investors);
                return { status: 'success', message: 'Investor added successfully', data: { id: newI.id } };
            }
            if (action === 'update') {
                investors = investors.map(i => i.id == data.id ? { ...i, ...data } : i);
                setStorage('investors', investors);
                return { status: 'success', message: 'Investor updated' };
            }
            if (action === 'delete') {
                investors = investors.filter(i => i.id != (data?.id || params.get('id')));
                setStorage('investors', investors);
                return { status: 'success', message: 'Investor removed' };
            }
            if (action === 'pay_return') {
                investors = investors.map(i => i.id == data.investor_id ? { ...i, total_returns_paid: (i.total_returns_paid || 0) + parseFloat(data.amount || 0) } : i);
                setStorage('investors', investors);
                return { status: 'success', message: 'Return payment recorded' };
            }
        }

        // Fallback generic response
        return { status: 'success', message: 'Loaded successfully', data: {} };
    },

    get(endpoint) { return this.request(endpoint, 'GET'); },
    post(endpoint, data) { return this.request(endpoint, 'POST', data); },
    put(endpoint, data) { return this.request(endpoint, 'PUT', data); },
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }
};
