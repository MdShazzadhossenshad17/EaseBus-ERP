/**
 * BusinessM — Core Application Logic
 */

window.App = {
    currentRoute: 'dashboard',
    userNavHTML: null,
    
    init() {
        // Sync session with real PHP backend first
        API.init().then(() => {
            this.setupAuth();
            const loggedIn = this.checkAuth();
            this.setupSidebar();
            this.setupRouter();

            if (loggedIn) {
                const hash = decodeURIComponent(window.location.hash.substring(1)).trim().replace(/[\s_]+/g, '-') || 'dashboard';
                this.navigate(hash);
            }
        }).catch(err => {
            console.warn('API init failed, proceeding with local-only mode:', err);
            this.setupAuth();
            const loggedIn = this.checkAuth();
            this.setupSidebar();
            this.setupRouter();

            if (loggedIn) {
                const hash = decodeURIComponent(window.location.hash.substring(1)).trim().replace(/[\s_]+/g, '-') || 'dashboard';
                this.navigate(hash);
            }
        });
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
        const brandLink = document.getElementById('brand-logo-link');
        const brandName = document.getElementById('brand-name-display');

        if (user.role === 'creator' || user.username === 'shad@dbms.com') {
            if (nameEl) nameEl.textContent = 'Md Shazzad Hossen Shad';
            if (roleEl) roleEl.textContent = 'Platform Creator & System Admin';
            if (storeNameEl) storeNameEl.textContent = 'EaseBus Platform Operations';
            if (avatarEl) avatarEl.textContent = 'S';
            if (brandLink) brandLink.setAttribute('href', '#creator-overview');
            if (brandName) brandName.textContent = 'EaseBus Creator';
            return;
        }

        if (brandLink) brandLink.setAttribute('href', '#dashboard');
        if (brandName) brandName.textContent = 'EaseBus';

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
        const handleLogout = (e) => this.logout(e);

        document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
        document.getElementById('header-logout-btn')?.addEventListener('click', handleLogout);
        document.querySelectorAll('.btn-logout-trigger').forEach(btn => {
            btn.onclick = handleLogout;
        });
    },

    async logout(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        try { UI.setLoading(true); } catch(err) {}

        if (window.Creator && typeof window.Creator.stopLivePolling === 'function') {
            window.Creator.stopLivePolling();
        }

        API.setCurrentUser(null);
        if (window.APP_CONFIG) {
            window.APP_CONFIG.username = null;
            window.APP_CONFIG.userRole = null;
            window.APP_CONFIG.userId = 0;
        }
        try { localStorage.removeItem('easebus_active_user'); } catch(err) {}
        try { sessionStorage.clear(); } catch(err) {}

        try {
            await API.request('auth/logout', 'POST');
        } catch(err) {}

        window.location.href = 'login.php';
    },

    toggleProfileDropdown(e) {
        if (e) e.stopPropagation();
        const menu = document.getElementById('profile-dropdown-menu');
        const arrow = document.getElementById('profile-dropdown-arrow');
        if (!menu) return;
        
        const isHidden = menu.classList.contains('hidden');
        if (isHidden) {
            menu.classList.remove('hidden');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
        } else {
            menu.classList.add('hidden');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    },

    closeProfileDropdown() {
        const menu = document.getElementById('profile-dropdown-menu');
        const arrow = document.getElementById('profile-dropdown-arrow');
        if (menu) menu.classList.add('hidden');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    },

    updateTopBarProfile(user) {
        if (!user) user = API.getCurrentUser();
        if (!user) return;

        const bizName = user.business_name || user.full_name || 'My Business';
        const ownerName = user.full_name || user.username || '';
        const logoUrl = user.business_logo || '';

        const topBizName = document.getElementById('top-bar-biz-name');
        const topOwnerName = document.getElementById('top-bar-owner-name');
        const dropBizName = document.getElementById('dropdown-biz-name');
        const dropOwnerName = document.getElementById('dropdown-owner-name');

        if (topBizName) topBizName.textContent = bizName;
        if (topOwnerName) topOwnerName.textContent = ownerName;
        if (dropBizName) dropBizName.textContent = bizName;
        if (dropOwnerName) dropOwnerName.textContent = ownerName;

        const initial = (bizName || ownerName || 'U').charAt(0).toUpperCase();

        const topText = document.getElementById('top-bar-avatar-text');
        const topImg = document.getElementById('top-bar-avatar-img');
        const dropText = document.getElementById('dropdown-avatar-text');
        const dropImg = document.getElementById('dropdown-avatar-img');

        if (logoUrl) {
            if (topImg) { topImg.src = logoUrl; topImg.classList.remove('hidden'); }
            if (topText) topText.classList.add('hidden');
            if (dropImg) { dropImg.src = logoUrl; dropImg.classList.remove('hidden'); }
            if (dropText) dropText.classList.add('hidden');
        } else {
            if (topImg) topImg.classList.add('hidden');
            if (topText) { topText.textContent = initial; topText.classList.remove('hidden'); }
            if (dropImg) dropImg.classList.add('hidden');
            if (dropText) { dropText.textContent = initial; dropText.classList.remove('hidden'); }
        }
    },

    setupSidebar() {
        const user = API.getCurrentUser();
        const mainNav = document.getElementById('main-nav');
        if (!mainNav) return;

        if (!this.userNavHTML && !document.getElementById('creator-suite-header')) {
            this.userNavHTML = mainNav.innerHTML;
        }

        if (user && (user.role === 'creator' || user.username === 'shad@dbms.com') && (!window.Creator || !window.Creator.isReadOnlyMode)) {
            mainNav.innerHTML = `
                <div id="creator-suite-header" class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-slate-800/80 mb-2">
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
        } else if (this.userNavHTML) {
            mainNav.innerHTML = this.userNavHTML;
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

        // Brand logo click navigation handler
        const brandLink = document.getElementById('brand-logo-link');
        if (brandLink) {
            brandLink.onclick = (e) => {
                e.preventDefault();
                const u = API.getCurrentUser();
                if (u && (u.role === 'creator' || u.username === 'shad@dbms.com') && (!window.Creator || !window.Creator.isReadOnlyMode)) {
                    this.navigate('creator-overview');
                } else {
                    this.navigate('dashboard');
                }
            };
        }

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
                const hash = decodeURIComponent(window.location.hash.substring(1)).trim().replace(/[\s_]+/g, '-') || 'dashboard';
                this.navigate(hash);
            }
        });
    },

    pendingAction: null,

    async navigate(route, action = null) {
        if (!route) route = 'dashboard';
        route = decodeURIComponent(route).trim().replace(/[\s_]+/g, '-');

        if (!this.checkAuth()) return;
        if (action) this.pendingAction = action;

        const currentUser = API.getCurrentUser();
        const isCreator = currentUser && (currentUser.role === 'creator' || currentUser.username === 'shad@dbms.com');
        const isReadOnly = window.Creator && window.Creator.isReadOnlyMode;

        if (isCreator && !isReadOnly && (route === 'dashboard' || route === '' || route === 'overview')) {
            route = 'creator-overview';
        }
        
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
            
            const creatorTitles = {
                'creator-overview': 'Platform Creator — Platform Overview',
                'creator-stores': 'Platform Creator — Client Stores & Tenants',
                'creator-transactions': 'Platform Creator — Live Transactions Feed',
                'creator-inventory': 'Platform Creator — Global Inventory Auditor',
                'creator-health': 'Platform Creator — Server & Database Health'
            };
            if (titleEl) titleEl.textContent = creatorTitles[route] || 'Platform Creator Command Center';

            try {
                if (window.Creator && typeof window.Creator.render === 'function') {
                    await window.Creator.render(container, route);
                } else {
                    container.innerHTML = UI.emptyState('error', 'Creator Module Error', 'Creator module script not loaded.');
                }
            } catch(e) {
                console.error('Creator render error:', e);
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
            const path = window.location.pathname || '';
            let finalSrc = src;
            if (path.includes('/pages/') && !src.startsWith('../') && !src.startsWith('/')) {
                finalSrc = '../' + src;
            }
            script.src = finalSrc;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
