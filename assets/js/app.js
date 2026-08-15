/**
 * BusinessM — Core Application Logic
 */

window.App = {
    currentRoute: 'dashboard',
    
    init() {
        this.setupSidebar();
        this.setupRouter();
        this.setupLogout();
        
        // Initial route
        const hash = window.location.hash.substring(1) || 'dashboard';
        this.navigate(hash);
    },

    setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        const openBtn = document.getElementById('open-sidebar');
        const closeBtn = document.getElementById('close-sidebar');

        const toggleSidebar = () => {
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        };

        openBtn.addEventListener('click', toggleSidebar);
        closeBtn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);

        // Active state handling
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth < 768) toggleSidebar();
            });
        });
    },

    setupRouter() {
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1) || 'dashboard';
            this.navigate(hash);
        });
    },

    setupLogout() {
        document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                UI.toast('Logging out...');
                await API.post('auth/logout');
            } catch (err) {}
            window.location.href = 'login.php';
        });
    },

    pendingAction: null,

    async navigate(route, action = null) {
        if (action) this.pendingAction = action;
        
        if (window.location.hash !== `#${route}`) {
            window.location.hash = route;
            return;
        }

        this.currentRoute = route;
        
        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('href') === `#${route}`) {
                item.classList.add('bg-blue-600', 'text-white');
                item.classList.remove('text-slate-300', 'hover:bg-slate-800');
            } else {
                item.classList.remove('bg-blue-600', 'text-white');
                item.classList.add('text-slate-300', 'hover:bg-slate-800');
            }
        });

        // Set title
        const titleEl = document.getElementById('page-title');
        titleEl.textContent = route.charAt(0).toUpperCase() + route.slice(1).replace('-', ' ');

        const container = document.getElementById('screen-container');
        UI.setLoading(true);

        const routeMap = {
            'dashboard': { file: 'dashboard.js', object: 'Dashboard', title: 'Dashboard' },
            'products': { file: 'products.js', object: 'Products', title: 'Products & Stock' },
            'orders': { file: 'orders.js', object: 'Orders', title: 'Orders & Sales' },
            'customers': { file: 'customers.js', object: 'Customers', title: 'Customers' },
            'suppliers': { file: 'suppliers.js', object: 'Suppliers', title: 'Suppliers' },
            'deliveries': { file: 'deliveries.js', object: 'Deliveries', title: 'Deliveries & Logistics' },
            'finance': { file: 'finance.js', object: 'Finance', title: 'Accounts & Cash' },
            'expenses': { file: 'expenses.js', object: 'Expenses', title: 'Expenses' },
            'inventory': { file: 'inventory.js', object: 'Inventory', title: 'Inventory Management' },
            'investors': { file: 'investors.js', object: 'Investors', title: 'Investors & Equity' },
            'reports': { file: 'reports.js', object: 'Reports', title: 'Analytics & Reports' },
            'returns': { file: 'returns.js', object: 'Returns', title: 'Customer Returns' },
            'settings': { file: 'settings.js', object: 'Settings', title: 'Business Settings' },
            'users': { file: 'users.js', object: 'Users', title: 'User & Staff Management' }
        };

        const config = routeMap[route];
        if (config && config.title) {
            titleEl.textContent = config.title;
        }

        try {
            container.innerHTML = '';
            if (config) {
                if (!window[config.object]) {
                    await this.loadScript(`../assets/js/${config.file}`);
                }
                if (window[config.object] && typeof window[config.object].render === 'function') {
                    await window[config.object].render(container);
                    
                    // Trigger pending modal action if requested
                    if (this.pendingAction) {
                        const act = this.pendingAction;
                        this.pendingAction = null;
                        setTimeout(() => {
                            if (act === 'create_order' && window.Orders?.showCreateModal) {
                                window.Orders.showCreateModal();
                            } else if (act === 'dispatch_delivery' && window.Deliveries?.showDispatchModal) {
                                window.Deliveries.showDispatchModal();
                            } else if (act === 'record_expense' && window.Expenses?.showModal) {
                                window.Expenses.showModal();
                            }
                        }, 100);
                    }
                } else {
                    container.innerHTML = UI.emptyState('error', 'Module Error', `Could not initialize module ${config.object}.`);
                }
            } else {
                container.innerHTML = UI.emptyState(
                    'near_me_disabled',
                    'Page Not Found',
                    `The requested view #${route} does not exist.`
                );
            }
        } catch (error) {
            console.error('Navigation error:', error);
            container.innerHTML = UI.emptyState('error', 'Navigation Error', 'Failed to load page content.');
        } finally {
            UI.setLoading(false);
        }
    },

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
