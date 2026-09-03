// Script to seed live collections and documents into Google Cloud Firestore database
import config from '../firebase-applet-config.json' with { type: 'json' };

const DATABASE_ID = config.firestoreDatabaseId;
const PROJECT_ID = config.projectId;
const API_KEY = config.apiKey;

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

// Helper: Convert normal JavaScript object to Firestore REST API fields structure
function toFirestoreFields(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            fields[key] = { nullValue: null };
        } else if (typeof value === 'boolean') {
            fields[key] = { booleanValue: value };
        } else if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                fields[key] = { integerValue: String(value) };
            } else {
                fields[key] = { doubleValue: value };
            }
        } else if (typeof value === 'string') {
            fields[key] = { stringValue: value };
        } else if (Array.isArray(value)) {
            fields[key] = {
                arrayValue: {
                    values: value.map(item => {
                        if (typeof item === 'object' && item !== null) {
                            return { mapValue: { fields: toFirestoreFields(item) } };
                        } else if (typeof item === 'number') {
                            return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
                        } else if (typeof item === 'boolean') {
                            return { booleanValue: item };
                        } else {
                            return { stringValue: String(item) };
                        }
                    })
                }
            };
        } else if (typeof value === 'object') {
            fields[key] = { mapValue: { fields: toFirestoreFields(value) } };
        }
    }
    return fields;
}

async function writeDoc(docPath, data) {
    const url = `${BASE_URL}/${docPath}?key=${API_KEY}`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(data) })
    });
    if (!res.ok) {
        const text = await res.text();
        console.error(`Failed to write ${docPath}:`, res.status, text);
        return false;
    }
    console.log(`✓ Seeded ${docPath}`);
    return true;
}

async function runSeed() {
    console.log(`Starting Firestore Cloud Seed to database: ${DATABASE_ID}...`);

    // 1. Global Users
    const globalUsers = [
        {
            id: 1,
            username: 'shad@dbms.com',
            email: 'shad@dbms.com',
            full_name: 'Md Shazzad Hossen Shad',
            role: 'creator',
            business_name: 'EaseBus Flagship Store',
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            username: 'apex@fashion.com',
            email: 'apex@fashion.com',
            full_name: 'Apex Trends Admin',
            role: 'admin',
            business_name: 'Apex Trends & Apparel',
            created_at: new Date().toISOString()
        },
        {
            id: 3,
            username: 'tech@gadgets.com',
            email: 'tech@gadgets.com',
            full_name: 'GadgetLab Electronics',
            role: 'admin',
            business_name: 'GadgetLab Electronics',
            created_at: new Date().toISOString()
        }
    ];

    for (const u of globalUsers) {
        await writeDoc(`global_users/${u.id}`, u);
    }

    // 2. Store 1: Products
    const products = [
        {
            id: 1,
            code: 'PRD-1048',
            name: 'Classic Oxford Cotton Shirt',
            category_name: 'Apparel & Fashion',
            buy_price: 650,
            sale_price: 1250,
            stock: 45,
            min_stock: 10,
            status: 'in_stock'
        },
        {
            id: 2,
            code: 'PRD-1092',
            name: 'Slim Fit Denim Chinos',
            category_name: 'Apparel & Fashion',
            buy_price: 850,
            sale_price: 1650,
            stock: 32,
            min_stock: 8,
            status: 'in_stock'
        },
        {
            id: 3,
            code: 'PRD-1055',
            name: 'Wireless Ergonomic Earbuds Pro',
            category_name: 'Electronics & Audio',
            buy_price: 1400,
            sale_price: 2490,
            stock: 18,
            min_stock: 5,
            status: 'in_stock'
        },
        {
            id: 4,
            code: 'PRD-1081',
            name: 'Genuine Leather Bifold Wallet',
            category_name: 'Accessories',
            buy_price: 420,
            sale_price: 890,
            stock: 60,
            min_stock: 15,
            status: 'in_stock'
        },
        {
            id: 5,
            code: 'PRD-1064',
            name: 'USB-C Fast Charging Multi-Hub',
            category_name: 'Electronics & Audio',
            buy_price: 550,
            sale_price: 1150,
            stock: 24,
            min_stock: 6,
            status: 'in_stock'
        },
        {
            id: 6,
            code: 'PRD-1073',
            name: 'Ceramic Thermal Travel Mug (500ml)',
            category_name: 'Home & Lifestyle',
            buy_price: 320,
            sale_price: 650,
            stock: 50,
            min_stock: 12,
            status: 'in_stock'
        }
    ];

    for (const p of products) {
        await writeDoc(`stores/store_1/products/${p.id}`, p);
    }

    // 3. Store 1: Orders
    const orders = [
        {
            id: 1,
            order_number: 'ORD-90214',
            customer_name: 'Tanvir Hossain',
            customer_phone: '01711223344',
            total_amount: 2500,
            paid_amount: 2500,
            payment_method: 'Cash',
            status: 'completed',
            order_date: new Date(Date.now() - 3600000 * 4).toISOString()
        },
        {
            id: 2,
            order_number: 'ORD-90215',
            customer_name: 'Nusrat Jahan',
            customer_phone: '01899887766',
            total_amount: 3740,
            paid_amount: 3740,
            payment_method: 'bKash',
            status: 'completed',
            order_date: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
            id: 3,
            order_number: 'ORD-90216',
            customer_name: 'Arif Chowdhury',
            customer_phone: '01555443322',
            total_amount: 1150,
            paid_amount: 1150,
            payment_method: 'Nagad',
            status: 'processing',
            order_date: new Date(Date.now() - 3600000 * 1).toISOString()
        }
    ];

    for (const o of orders) {
        await writeDoc(`stores/store_1/orders/${o.id}`, o);
    }

    // 4. Store 1: Customers
    const customers = [
        {
            id: 1,
            name: 'Tanvir Hossain',
            phone: '01711223344',
            email: 'tanvir@gmail.com',
            address: 'Dhanmondi 27, Dhaka',
            total_orders: 5,
            total_spent: 12400
        },
        {
            id: 2,
            name: 'Nusrat Jahan',
            phone: '01899887766',
            email: 'nusrat.jahan@gmail.com',
            address: 'Banani 11, Dhaka',
            total_orders: 3,
            total_spent: 8900
        },
        {
            id: 3,
            name: 'Arif Chowdhury',
            phone: '01555443322',
            email: 'arif.chowdhury@outlook.com',
            address: 'Agrabad, Chattogram',
            total_orders: 2,
            total_spent: 2300
        }
    ];

    for (const c of customers) {
        await writeDoc(`stores/store_1/customers/${c.id}`, c);
    }

    // 5. Store 1: Deliveries
    const deliveries = [
        {
            id: 1,
            tracking_code: 'STD-8891024',
            courier: 'Steadfast Courier',
            recipient_name: 'Tanvir Hossain',
            recipient_phone: '01711223344',
            recipient_address: 'Dhanmondi 27, Dhaka',
            cod_amount: 2500,
            delivery_status: 'Delivered',
            created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: 2,
            tracking_code: 'PTH-4029182',
            courier: 'Pathao Courier',
            recipient_name: 'Nusrat Jahan',
            recipient_phone: '01899887766',
            recipient_address: 'Banani 11, Dhaka',
            cod_amount: 3740,
            delivery_status: 'In Transit',
            created_at: new Date(Date.now() - 43200000).toISOString()
        }
    ];

    for (const d of deliveries) {
        await writeDoc(`stores/store_1/deliveries/${d.id}`, d);
    }

    // 6. Store 1: Expenses
    const expenses = [
        {
            id: 1,
            title: 'Store Commercial Space Rent',
            category: 'Rent & Facilities',
            amount: 25000,
            payment_method: 'Bank Transfer',
            expense_date: new Date(Date.now() - 86400000 * 5).toISOString()
        },
        {
            id: 2,
            title: 'Electricity & Utilities Bill',
            category: 'Utilities',
            amount: 4500,
            payment_method: 'bKash',
            expense_date: new Date(Date.now() - 86400000 * 3).toISOString()
        },
        {
            id: 3,
            title: 'Courier Shipping Supplies & Boxes',
            category: 'Packaging',
            amount: 1800,
            payment_method: 'Cash',
            expense_date: new Date(Date.now() - 86400000 * 1).toISOString()
        }
    ];

    for (const ex of expenses) {
        await writeDoc(`stores/store_1/expenses/${ex.id}`, ex);
    }

    // 7. Store 1: Suppliers
    const suppliers = [
        {
            id: 1,
            name: 'Apex Garments & Knitwear',
            contact_person: 'Mr. Rafiqul Islam',
            phone: '01700112233',
            email: 'sales@apexknitwear.bd',
            address: 'Gazipur Industrial Zone, Dhaka'
        },
        {
            id: 2,
            name: 'Delta Electronics Import Ltd',
            contact_person: 'Md. Kamrul Hasan',
            phone: '01911998877',
            email: 'info@deltaelectronics.bd',
            address: 'Stadium Market, Motijheel, Dhaka'
        }
    ];

    for (const s of suppliers) {
        await writeDoc(`stores/store_1/suppliers/${s.id}`, s);
    }

    // 8. Store 1: Settings
    await writeDoc(`stores/store_1/settings/general`, {
        store_name: 'EaseBus Flagship Store',
        owner_name: 'Md Shazzad Hossen Shad',
        currency: 'BDT',
        currency_symbol: '৳',
        phone: '01700000000',
        email: 'shad@dbms.com',
        status: 'active',
        initialized_at: new Date().toISOString()
    });

    // 9. System Telemetry
    await writeDoc(`system_telemetry/telemetry_latest`, {
        system_status: 'healthy',
        database_engine: 'Google Cloud Firestore Multi-Tenant',
        database_id: DATABASE_ID,
        project_id: PROJECT_ID,
        creator_account: 'shad@dbms.com',
        last_heartbeat: new Date().toISOString(),
        total_tenants: 3
    });

    // 10. Audit Logs
    await writeDoc(`audit_logs/audit_init`, {
        action: 'DATABASE_INITIALIZED',
        actor: 'Platform Creator (shad@dbms.com)',
        timestamp: new Date().toISOString(),
        details: 'Initial cloud database collections and tenant schemas successfully seeded.'
    });

    console.log('✓ Firestore Cloud Database seed complete!');
}

runSeed().catch(console.error);
