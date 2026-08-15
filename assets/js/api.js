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

// Seed dataset for live web execution
const SEED_DATA = {
    products: [
        { id: 1, sku: 'TSH-BLK-M', name: 'Premium Cotton T-Shirt', category_name: 'Apparel & Clothing', brand: 'EaseFit', purchase_price: 350, selling_price: 750, current_stock: 45, min_stock_level: 10, total_stock: 45, variants: [{ id: 1, sku: 'TSH-BLK-M', color: 'Black', size: 'M', current_stock: 45, selling_price: 750 }] },
        { id: 2, sku: 'JNS-BLU-32', name: 'Slim Fit Denim Jeans', category_name: 'Apparel & Clothing', brand: 'EaseFit', purchase_price: 850, selling_price: 1650, current_stock: 28, min_stock_level: 8, total_stock: 28, variants: [{ id: 2, sku: 'JNS-BLU-32', color: 'Blue', size: '32', current_stock: 28, selling_price: 1650 }] },
        { id: 3, sku: 'WTC-GLD-01', name: 'Luxury Chronograph Watch', category_name: 'Electronics & Gadgets', brand: 'Aura', purchase_price: 2200, selling_price: 4500, current_stock: 12, min_stock_level: 5, total_stock: 12, variants: [{ id: 3, sku: 'WTC-GLD-01', color: 'Gold', size: 'Standard', current_stock: 12, selling_price: 4500 }] },
        { id: 4, sku: 'BAG-LHR-01', name: 'Genuine Leather Backpack', category_name: 'Bags & Accessories', brand: 'Crafted', purchase_price: 1400, selling_price: 2900, current_stock: 4, min_stock_level: 5, total_stock: 4, variants: [{ id: 4, sku: 'BAG-LHR-01', color: 'Brown', size: 'L', current_stock: 4, selling_price: 2900 }] }
    ],
    categories: ['Apparel & Clothing', 'Electronics & Gadgets', 'Footwear & Shoes', 'Bags & Accessories', 'Home & Living', 'General Sales'],
    orders: [
        { id: 101, order_no: 'ORD-2026-101', customer_id: 1, customer_name: 'Tanvir Ahmed', total_amount: 2400, payment_status: 'paid', order_status: 'delivered', created_at: '2026-08-14 10:30:00', items_count: 2 },
        { id: 102, order_no: 'ORD-2026-102', customer_id: 2, customer_name: 'Rahim Chowdhury', total_amount: 1650, payment_status: 'paid', order_status: 'in_transit', created_at: '2026-08-15 09:15:00', items_count: 1 },
        { id: 103, order_no: 'ORD-2026-103', customer_id: 3, customer_name: 'Nusrat Jahan', total_amount: 4500, payment_status: 'unpaid', order_status: 'pending', created_at: '2026-08-15 14:00:00', items_count: 1 }
    ],
    deliveries: [
        { id: 1, order_id: 101, order_no: 'ORD-2026-101', customer_name: 'Tanvir Ahmed', courier_partner: 'Pathao', tracking_number: 'PTH-99201', status: 'delivered', shipping_fee: 100, recipient_address: 'Gulshan 2, Dhaka' },
        { id: 2, order_id: 102, order_no: 'ORD-2026-102', customer_name: 'Rahim Chowdhury', courier_partner: 'CarryBee', tracking_number: 'CBY-88302', status: 'in_transit', shipping_fee: 120, recipient_address: 'Dhanmondi 32, Dhaka' }
    ],
    returns: [
        { id: 1, return_no: 'RET-2026-001', order_id: 100, order_no: 'ORD-2026-100', customer_name: 'Kamal Hossain', reason: 'Defective Item', status: 'approved', refund_amount: 750, created_at: '2026-08-13 16:20:00' }
    ],
    finance: {
        accounts: [
            { id: 1, name: 'Main Cash Register', type: 'cash', account_number: 'CASH-01', current_balance: 45000, status: 'active' },
            { id: 2, name: 'Dutch Bangla Bank', type: 'bank', account_number: '102.110.4589', current_balance: 185000, status: 'active' },
            { id: 3, name: 'bKash Merchant', type: 'mobile_banking', account_number: '01711223344', current_balance: 62400, status: 'active' }
        ],
        transactions: [
            { id: 1, txn_no: 'TXN-9901', account_name: 'Main Cash Register', type: 'deposit', amount: 2400, reference: 'Sales ORD-101', created_at: '2026-08-14 10:30:00' },
            { id: 2, txn_no: 'TXN-9902', account_name: 'bKash Merchant', type: 'outflow', amount: 1500, reference: 'Utility Bill', created_at: '2026-08-15 11:00:00' }
        ]
    },
    expenses: [
        { id: 1, voucher_no: 'EXP-8801', category_name: 'Rent & Utilities', amount: 1500, payment_method: 'bKash', description: 'Monthly Electricity Bill', expense_date: '2026-08-15' },
        { id: 2, voucher_no: 'EXP-8802', category_name: 'Office Supplies', amount: 450, payment_method: 'Cash', description: 'Packaging Material', expense_date: '2026-08-14' }
    ],
    suppliers: [
        { id: 1, name: 'Tanvir Ahmed', company: 'Apex Textiles Ltd', phone: '01711002233', email: 'sales@apex.com', address: 'Gazipur, Dhaka', total_products: 2, total_purchases: 5, status: 'active' },
        { id: 2, name: 'Monir Hossain', company: 'TechImport BD', phone: '01822334455', email: 'info@techimport.bd', address: 'IDB Bhaban, Agargaon, Dhaka', total_products: 2, total_purchases: 3, status: 'active' }
    ],
    customers: [
        { id: 1, name: 'Tanvir Ahmed', phone: '01700112233', email: 'tanvir@domain.com', address: 'Gulshan 2, Dhaka', total_orders: 4, total_spent: 8500, status: 'active' },
        { id: 2, name: 'Rahim Chowdhury', phone: '01811223344', email: 'rahim@domain.com', address: 'Dhanmondi 32, Dhaka', total_orders: 2, total_spent: 3200, status: 'active' }
    ],
    investors: [
        { id: 1, name: 'Sharif Uddin', investment_amount: 500000, equity_percentage: 20, return_paid: 25000, status: 'active' }
    ],
    users: [
        { id: 1, username: 'admin', name: 'Admin User', email: 'admin@easebus.com', role: 'admin', status: 'active', last_login: '2026-08-15 12:00:00' },
        { id: 2, username: 'manager', name: 'Manager User', email: 'manager@easebus.com', role: 'manager', status: 'active', last_login: '2026-08-14 15:30:00' }
    ],
    settings: {
        name: 'EaseBus',
        currency: 'BDT',
        currency_symbol: '৳',
        phone: '01700000000',
        email: 'info@easebus.com',
        address: 'Dhaka, Bangladesh',
        tax_enabled: 0,
        tax_rate: 0
    }
};

// Initialize localStorage DB if missing
function getStorage(key, fallback) {
    try {
        const stored = localStorage.getItem('easebus_' + key);
        return stored ? JSON.parse(stored) : fallback;
    } catch(e) { return fallback; }
}

function setStorage(key, data) {
    try { localStorage.setItem('easebus_' + key, JSON.stringify(data)); } catch(e) {}
}

const API = {
    baseUrl: '../api',

    async isServerAvailable() {
        if (window.location.protocol === 'file:' || window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp.com')) {
            return false;
        }
        try {
            const res = await fetch(`${this.baseUrl}/dashboard?action=summary`, { method: 'GET' });
            return res.ok;
        } catch(e) {
            return false;
        }
    },

    async request(endpoint, method = 'GET', data = null) {
        const isServer = await this.isServerAvailable();
        if (isServer) {
            return this.remoteRequest(endpoint, method, data);
        } else {
            return this.mockCloudEngine(endpoint, method, data);
        }
    },

    async remoteRequest(endpoint, method, data) {
        const url = `${this.baseUrl}/${endpoint}`;
        const headers = { 'Accept': 'application/json' };
        if (['POST', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
            if (!(data instanceof FormData)) headers['Content-Type'] = 'application/json';
        }
        const options = { method, headers };
        if (data && method !== 'GET') options.body = data instanceof FormData ? data : JSON.stringify(data);
        const res = await fetch(url, options);
        return await res.json();
    },

    // Standalone Client-Side Live Cloud Engine
    async mockCloudEngine(endpoint, method, data) {
        const cleanEp = endpoint.replace(/^\//, '');
        const [path, queryStr] = cleanEp.split('?');
        const params = new URLSearchParams(queryStr || '');
        const action = params.get('action') || (cleanEp.includes('/') ? cleanEp.split('/')[1] : '');
        const module = path.split('/')[0];

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
                                { type: 'info', icon: 'local_shipping', text: `${deliveries.length} consignments dispatched via courier.`, color: 'text-blue-500' },
                                { type: 'success', icon: 'verified', text: "EaseBus Live System active.", color: 'text-emerald-500' }
                            ]
                        }
                    }
                };
            }
            if (action === 'revenue_chart') {
                return {
                    status: 'success',
                    data: {
                        chart: Array.from({length: 15}, (_, i) => ({
                            date: `2026-08-${(i+1).toString().padStart(2, '0')}`,
                            revenue: Math.floor(Math.random() * 8000) + 2000,
                            profit: Math.floor(Math.random() * 4000) + 1000
                        }))
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
                            monthly_inflow: 45000,
                            monthly_outflow: 12000,
                            net_cash_flow: 33000
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
                            top_category: 'Rent & Utilities',
                            avg_voucher: totalExp / (expenses.length || 1)
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
                            total_products: 4,
                            total_purchases: 8,
                            procurement_value: 35000
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
                            total_spent: 11700
                        }
                    }
                };
            }
            if (action === 'list') return { status: 'success', data: { customers } };
        }

        // 10. Settings
        if (module === 'settings') {
            let settings = getStorage('settings', SEED_DATA.settings);
            if (action === 'get') return { status: 'success', data: { settings } };
            if (action === 'update') {
                settings = { ...settings, ...data };
                setStorage('settings', settings);
                return { status: 'success', message: 'Settings saved successfully' };
            }
        }

        // 11. Users & Staff
        if (module === 'users') {
            let users = getStorage('users', SEED_DATA.users);
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

            if (action === 'financial' || action === 'summary') {
                return {
                    status: 'success',
                    data: {
                        report: {
                            period: { start_date: '2026-07-16', end_date: '2026-08-15' },
                            revenue: totalSales || 8550,
                            cogs: 4200,
                            gross_profit: (totalSales || 8550) - 4200,
                            expenses: totalExp || 1950,
                            net_profit: (totalSales || 8550) - 4200 - (totalExp || 1950),
                            profit_margin: 28.07,
                            expense_breakdown: [
                                { category: 'Rent & Utilities', total: 1500 },
                                { category: 'Office Supplies', total: 450 }
                            ]
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
