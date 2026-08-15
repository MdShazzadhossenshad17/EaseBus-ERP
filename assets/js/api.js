/**
 * EaseBus — API Client & Complete Live Cloud Engine Driver
 */

window.APP_CONFIG = window.APP_CONFIG || {
    name: "EaseBus",
    currency: "BDT",
    currencySymbol: "৳",
    userRole: "admin",
    username: "Admin",
    csrfToken: "easebus_live_token"
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

function getCurrentUserId() {
    try {
        const u = localStorage.getItem('easebus_active_user');
        if (u) {
            const parsed = JSON.parse(u);
            return parsed.id || 'demo';
        }
    } catch(e) {}
    return 'demo';
}

function getGlobalUsers() {
    try {
        const stored = localStorage.getItem('easebus_global_users');
        let users = stored ? JSON.parse(stored) : [];
        if (!users.some(u => u.username === 'shad@dbms.com')) {
            users.unshift({
                id: 99999,
                username: 'shad@dbms.com',
                full_name: 'Md Shazzad Hossen Shad (Creator)',
                business_name: 'EaseBus Creator Operations',
                role: 'creator',
                email: 'shad@dbms.com',
                created_at: new Date().toISOString()
            });
            localStorage.setItem('easebus_global_users', JSON.stringify(users));
        }
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
    baseUrl: 'api',
    currentUser: null,

    getCurrentUser() {
        if (this.currentUser) return this.currentUser;
        try {
            const stored = localStorage.getItem('easebus_active_user');
            if (stored) {
                this.currentUser = JSON.parse(stored);
                return this.currentUser;
            }
        } catch(e) {}
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
        if (window.location.protocol === 'file:' || window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp.com')) {
            return false;
        }
        return true;
    },

    async request(endpoint, method = 'GET', data = null) {
        try {
            const res = await this.remoteRequest(endpoint, method, data);
            if (res && res.success !== false && res.status !== 'error') {
                return res;
            }
        } catch(e) {
            // Silently fall back to user-scoped client storage engine when DB is unconfigured or unreachable
        }
        return this.mockCloudEngine(endpoint, method, data);
    },

    async remoteRequest(endpoint, method, data) {
        const cleanEp = endpoint.replace(/^\//, '');
        const url = `${this.baseUrl}/${cleanEp}`;
        const headers = { 'Accept': 'application/json' };
        if (['POST', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
            if (!(data instanceof FormData)) headers['Content-Type'] = 'application/json';
        }
        const options = { method, headers };
        if (data && method !== 'GET') options.body = data instanceof FormData ? data : JSON.stringify(data);
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
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
                const username = (data?.username || '').trim();
                const password = data?.password || '';

                if (!username || !password) {
                    return { status: 'error', success: false, message: 'Username and password required.' };
                }

                // Creator Portal Login Check
                if (username.toLowerCase() === 'shad@dbms.com' || username.toLowerCase() === 'shad') {
                    if (password !== '01521582448') {
                        return { status: 'error', success: false, message: 'Invalid password for Creator account.' };
                    }
                    const creatorUser = {
                        id: 99999,
                        username: 'shad@dbms.com',
                        full_name: 'Md Shazzad Hossen Shad (Creator)',
                        business_name: 'EaseBus Creator Operations',
                        role: 'creator',
                        email: 'shad@dbms.com'
                    };
                    API.setCurrentUser(creatorUser);
                    return {
                        status: 'success',
                        success: true,
                        message: 'Welcome Creator! Accessing Platform Control Center.',
                        data: { user: creatorUser }
                    };
                }

                // Check registered users
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
            const sales = getStorage('sales', SEED_DATA.orders);
            const deliveries = getStorage('deliveries', SEED_DATA.deliveries);
            const products = getStorage('products', SEED_DATA.products);
            const finance = getStorage('finance', SEED_DATA.finance);
            const expenses = getStorage('expenses', SEED_DATA.expenses);

            const totalSales = sales.reduce((sum, o) => sum + (o.total_amount || 0), 0);
            const totalCash = finance.accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

            if (action === 'summary') {
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_sales_today: totalSales,
                            sales_today_count: sales.length,
                            active_deliveries: deliveries.filter(d => d.status !== 'delivered' && d.status !== 'returned').length,
                            orders_pending: sales.filter(o => o.order_status === 'pending').length,
                            low_stock_items: products.filter(p => p.current_stock <= p.min_stock_level).length,
                            total_cash: totalCash,
                            monthly_revenue: totalSales,
                            monthly_expenses: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
                            monthly_net_profit: totalSales - expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
                            recent_orders: sales.slice(0, 5),
                            alerts: [
                                { type: 'success', icon: 'verified', text: "EaseBus ERP running live.", color: 'text-emerald-500' }
                            ]
                        }
                    }
                };
            }
            if (action === 'revenue_chart') {
                return {
                    status: 'success',
                    data: {
                        chart: []
                    }
                };
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
                return { status: 'success', data: { products, categories: getStorage('categories', SEED_DATA.categories) } };
            }
            if (action === 'create') {
                const newP = { id: Date.now(), ...data, current_stock: 10, total_stock: 10, variants: [{ id: Date.now(), sku: data.sku || 'SKU-NEW', color: 'Default', size: 'Standard', current_stock: 10, selling_price: data.selling_price || 1000 }] };
                products.unshift(newP);
                setStorage('products', products);
                return { status: 'success', message: 'Product created successfully', data: { id: newP.id } };
            }
            if (action === 'update') {
                products = products.map(p => p.id == data.id ? { ...p, ...data } : p);
                setStorage('products', products);
                return { status: 'success', message: 'Product updated successfully' };
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
                            delivered_count: orders.filter(o => o.order_status === 'delivered').length
                        }
                    }
                };
            }
            if (action === 'list') {
                return { status: 'success', data: { orders } };
            }
            if (action === 'create') {
                const newO = { id: Date.now(), order_no: 'ORD-2026-' + Math.floor(100 + Math.random() * 900), customer_name: data.customer_name || 'Guest Customer', total_amount: data.total_amount || 1500, payment_status: 'paid', order_status: 'pending', created_at: new Date().toISOString() };
                orders.unshift(newO);
                setStorage('orders', orders);
                return { status: 'success', message: 'Order created successfully', data: { id: newO.id, order_no: newO.order_no } };
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
                return { status: 'success', data: { deliveries, couriers: ['Pathao', 'Steadfast', 'RedX', 'CarryBee', 'Uber', 'Paperfly', 'eCourier'] } };
            }
            if (action === 'status') {
                deliveries = deliveries.map(d => d.id == data.id ? { ...d, ...data } : d);
                setStorage('deliveries', deliveries);

                if (data.status === 'returned') {
                    let returns = getStorage('returns', SEED_DATA.returns);
                    returns.unshift({ id: Date.now(), return_no: 'RET-2026-' + Math.floor(100 + Math.random() * 900), order_no: 'ORD-101', customer_name: 'Customer', reason: 'Returned Delivery', status: 'approved', refund_amount: 1200, created_at: new Date().toISOString() });
                    setStorage('returns', returns);
                }

                return { status: 'success', message: 'Shipment updated successfully' };
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
            if (action === 'list' || action === 'accounts') return { status: 'success', data: { accounts: finance.accounts, transactions: finance.transactions } };
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
        }

        // 9. Customers
        if (module === 'customers') {
            let customers = getStorage('customers', SEED_DATA.customers);
            if (action === 'summary') {
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_customers: customers.length,
                            active_customers: customers.length,
                            total_spent: 0
                        }
                    }
                };
            }
            if (action === 'list') return { status: 'success', data: { customers } };
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
            const sales = getStorage('sales', SEED_DATA.orders);
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
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_items: products.length,
                            total_stock_value: 125000,
                            low_stock_count: products.filter(p => p.current_stock <= p.min_stock_level).length
                        }
                    }
                };
            }
            if (action === 'movements' || action === 'list') {
                return {
                    status: 'success',
                    data: {
                        movements: [
                            { id: 1, type: 'purchase', quantity: 20, reference: 'PO-991', created_at: '2026-08-14 11:00:00', product_name: 'Premium Cotton T-Shirt' },
                            { id: 2, type: 'sale', quantity: -2, reference: 'ORD-101', created_at: '2026-08-15 10:30:00', product_name: 'Premium Cotton T-Shirt' }
                        ]
                    }
                };
            }
        }

        // 14. Investors
        if (module === 'investors') {
            let investors = getStorage('investors', SEED_DATA.investors);
            if (action === 'summary') {
                return {
                    status: 'success',
                    data: {
                        summary: {
                            total_investors: investors.length,
                            total_capital: 500000,
                            total_returns_paid: 25000
                        }
                    }
                };
            }
            if (action === 'list') return { status: 'success', data: { investors } };
        }

        // Fallback generic response
        return { status: 'success', message: 'Loaded successfully', data: {} };
    },

    get(endpoint) { return this.request(endpoint, 'GET'); },
    post(endpoint, data) { return this.request(endpoint, 'POST', data); },
    put(endpoint, data) { return this.request(endpoint, 'PUT', data); },
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }
};
