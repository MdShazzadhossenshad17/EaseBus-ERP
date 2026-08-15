/**
 * BusinessM — Core Application Logic
 */

window.App = {
    currentRoute: 'dashboard',
    
    init() {
        this.setupAuth();
        const loggedIn = this.checkAuth();
        this.setupSidebar();
        this.setupRouter();
        
        if (loggedIn) {
            const hash = window.location.hash.substring(1) || 'dashboard';
            this.navigate(hash);
        }
    },

    checkAuth() {
        const user = API.getCurrentUser();
        const authModal = document.getElementById('auth-modal');
        if (!user) {
            if (authModal) authModal.classList.remove('hidden');
            return false;
        } else {
            if (authModal) authModal.classList.add('hidden');
            this.updateUserProfile(user);
            return true;
        }
    },

    updateUserProfile(user) {
        if (!user) return;
        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-role-display');
        const avatarEl = document.getElementById('user-avatar');
        const storeNameEl = document.getElementById('store-name-display');

        if (user.role === 'creator' || user.username === 'shad@dbms.com') {
            if (nameEl) nameEl.textContent = 'Md Shazzad Hossen Shad';
            if (roleEl) roleEl.textContent = 'Platform Creator & System Admin';
            if (storeNameEl) storeNameEl.textContent = 'EaseBus Platform Operations';
            if (avatarEl) avatarEl.textContent = 'S';
            return;
        }

        if (nameEl) nameEl.textContent = user.full_name || user.username;
        if (roleEl) roleEl.textContent = user.business_name ? (user.business_name + ' • ' + (user.role || 'Admin')) : (user.role || 'Active Owner');
        if (storeNameEl) storeNameEl.textContent = user.business_name || 'EaseBus';
        if (avatarEl) {
            const initial = (user.full_name || user.username || 'A').charAt(0).toUpperCase();
            avatarEl.textContent = initial;
        }
    },

    setupAuth() {
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const formLogin = document.getElementById('form-login');
        const formRegister = document.getElementById('form-register');
        const authError = document.getElementById('auth-error');
        const demoBtn = document.getElementById('btn-demo-login');

        if (tabLogin && tabRegister) {
            tabLogin.addEventListener('click', () => {
                tabLogin.className = "flex-1 py-2.5 text-center text-blue-400 border-b-2 border-blue-500 font-semibold transition-colors";
                tabRegister.className = "flex-1 py-2.5 text-center text-slate-400 hover:text-slate-200 border-b-2 border-transparent transition-colors";
                formLogin.classList.remove('hidden');
                formRegister.classList.add('hidden');
                if (authError) authError.classList.add('hidden');
            });
            tabRegister.addEventListener('click', () => {
                tabRegister.className = "flex-1 py-2.5 text-center text-blue-400 border-b-2 border-blue-500 font-semibold transition-colors";
                tabLogin.className = "flex-1 py-2.5 text-center text-slate-400 hover:text-slate-200 border-b-2 border-transparent transition-colors";
                formRegister.classList.remove('hidden');
                formLogin.classList.add('hidden');
                if (authError) authError.classList.add('hidden');
            });
        }

        // Login Submit
        formLogin?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();
            if (authError) authError.classList.add('hidden');
            
            try {
                const res = await API.request('auth/login', 'POST', { username, password });
                if (res && res.success !== false) {
                    const user = res.data?.user || { id: Date.now(), username, full_name: username, role: 'admin' };
                    API.setCurrentUser(user);
                    this.checkAuth();
                    if (user.role === 'creator' || user.username === 'shad@dbms.com') {
                        this.navigate('creator-overview');
                    } else {
                        const hash = window.location.hash.substring(1) || 'dashboard';
                        this.navigate(hash);
                    }
                } else {
                    if (authError) {
                        authError.textContent = res.message || 'Invalid username or password';
                        authError.classList.remove('hidden');
                    }
                }
            } catch(err) {
                if (authError) {
                    authError.textContent = 'Invalid credentials or connection error.';
                    authError.classList.remove('hidden');
                }
            }
        });

        // Register Submit
        formRegister?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullname = document.getElementById('reg-fullname').value.trim();
            const business_name = document.getElementById('reg-business').value.trim();
            const username = document.getElementById('reg-username').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value.trim();
            if (authError) authError.classList.add('hidden');

            try {
                const res = await API.request('auth/register', 'POST', {
                    full_name: fullname,
                    business_name,
                    username,
                    email,
                    password
                });
                if (res && res.success !== false) {
                    const user = res.data?.user || { id: Date.now(), username, full_name: fullname, business_name, role: 'admin' };
                    API.setCurrentUser(user);
                    this.checkAuth();
                    const hash = window.location.hash.substring(1) || 'dashboard';
                    this.navigate(hash);
                } else {
                    if (authError) {
                        authError.textContent = res.message || 'Registration failed.';
                        authError.classList.remove('hidden');
                    }
                }
            } catch(err) {
                if (authError) {
                    authError.textContent = 'Registration failed. Please check your inputs.';
                    authError.classList.remove('hidden');
                }
            }
        });

        // Logout handlers
        const handleLogout = (e) => {
            if (e) e.preventDefault();
            API.setCurrentUser(null);
            API.request('auth/logout', 'POST').catch(() => {});
            this.checkAuth();
        };

        document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
        document.getElementById('header-logout-btn')?.addEventListener('click', handleLogout);
    },

    setupSidebar() {
        const user = API.getCurrentUser();
        const mainNav = document.getElementById('main-nav');

        if (user && (user.role === 'creator' || user.username === 'shad@dbms.com') && (!window.Creator || !window.Creator.isReadOnlyMode)) {
            if (mainNav) {
                mainNav.innerHTML = `
                    <div class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-slate-800/80 mb-2">
                        <span class="material-symbols-outlined text-base text-amber-400">shield</span> Creator Master Suite
                    </div>
                    <a href="#creator-overview" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                        <span class="material-symbols-outlined mr-3 text-lg text-amber-400">dashboard</span> Platform Overview
                    </a>
                    <a href="#creator-stores" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                        <span class="material-symbols-outlined mr-3 text-lg text-blue-400">store</span> Stores & Tenants
                    </a>
                    <a href="#creator-transactions" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                        <span class="material-symbols-outlined mr-3 text-lg text-emerald-400">swap_horiz</span> Live Transactions
                    </a>
                    <a href="#creator-inventory" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                        <span class="material-symbols-outlined mr-3 text-lg text-purple-400">inventory_2</span> Global Inventory
                    </a>
                    <a href="#creator-health" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                        <span class="material-symbols-outlined mr-3 text-lg text-cyan-400">dns</span> Server & DB Health
                    </a>
                `;
            }
        }

        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        const openBtn = document.getElementById('open-sidebar');
        const closeBtn = document.getElementById('close-sidebar');

        const toggleSidebar = () => {
            if (sidebar) sidebar.classList.toggle('-translate-x-full');
            if (overlay) overlay.classList.toggle('hidden');
        };

        if (openBtn) openBtn.onclick = toggleSidebar;
        if (closeBtn) closeBtn.onclick = toggleSidebar;
        if (overlay) overlay.onclick = toggleSidebar;

        // Active state handling
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = () => {
                if (window.innerWidth < 768) toggleSidebar();
            };
        });
    },

    setupRouter() {
        window.addEventListener('hashchange', () => {
            if (this.checkAuth()) {
                const hash = window.location.hash.substring(1) || 'dashboard';
                this.navigate(hash);
            }
        });
    },

    pendingAction: null,

    async navigate(route, action = null) {
        if (!this.checkAuth()) return;
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

        // Creator Route Handler
        if (route.startsWith('creator-')) {
            const user = API.getCurrentUser();
            if (!user || (user.username !== 'shad@dbms.com' && user.role !== 'creator')) {
                this.navigate('dashboard');
                return;
            }
            if (titleEl) titleEl.textContent = 'Platform Creator Command Center';
            try {
                if (window.Creator && typeof window.Creator.render === 'function') {
                    await window.Creator.render(container, route);
                } else {
                    container.innerHTML = UI.emptyState('error', 'Creator Module Error', 'Creator module script not loaded.');
                }
            } catch(e) {
                console.error(e);
                container.innerHTML = UI.emptyState('error', 'Creator Error', 'Failed to render Creator Command Portal.');
            } finally {
                UI.setLoading(false);
            }
            return;
        }

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
                    await this.loadScript(`assets/js/${config.file}`);
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
