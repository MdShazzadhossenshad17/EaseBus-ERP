window.isStoreOwner = function(user) {
    if (!user) return false;
    const uName = (user.username || '').toLowerCase();
    const fName = (user.full_name || '').toLowerCase();
    
    // Explicit staff sub-accounts created by owner
    if (['tanvir', 'supto', 'supto miah', 'fuad', 'staff', 'sales', 'manager', 'accountant'].includes(uName) || ['tanvir', 'supto miah', 'fuad'].includes(fName)) {
        return false;
    }
    
    // Primary Store Owner is username 'hisham' or creator account
    if (uName === 'hisham' || uName === 'shad@dbms.com' || user.role === 'creator') {
        return true;
    }
    
    // Sub-accounts with created_by are staff members, NOT store owners
    if (user.created_by) {
        return false;
    }
    
    return (user.role === 'admin' || user.role === 'owner') && (user.id == 1 || user.id == 2);
};

window.App = {
    currentRoute: 'dashboard',
    userNavHTML: null,
    
    init() {
        // Global click-outside listener to dismiss dropdowns
        document.addEventListener('click', (e) => {
            const profBtn = document.getElementById('profile-dropdown-btn');
            const profMenu = document.getElementById('profile-dropdown-menu');
            const notifBtn = document.getElementById('notif-dropdown-btn');
            const notifMenu = document.getElementById('notif-dropdown-menu');

            if (profMenu && !profMenu.classList.contains('hidden')) {
                if (!profMenu.contains(e.target) && !profBtn?.contains(e.target)) {
                    this.closeProfileDropdown();
                }
            }

            if (notifMenu && !notifMenu.classList.contains('hidden')) {
                if (!notifMenu.contains(e.target) && !notifBtn?.contains(e.target)) {
                    this.closeNotifDropdown();
                }
            }
        });

        this.setupRealtimeBus();

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

    _realtimeBusSetup: false,

    setupRealtimeBus() {
        if (this._realtimeBusSetup) return;
        this._realtimeBusSetup = true;

        const handleDataChange = (detail) => {
            if (this.currentRoute === 'dashboard' && window.Dashboard && typeof window.Dashboard.loadSummary === 'function') {
                window.Dashboard.loadSummary(true);
            } else if (this.currentRoute === 'orders' && window.Orders && typeof window.Orders.loadOrders === 'function') {
                window.Orders.loadOrders();
            } else if (this.currentRoute === 'products' && window.Products && typeof window.Products.loadProducts === 'function') {
                window.Products.loadProducts();
            } else if (this.currentRoute === 'inventory' && window.Inventory && typeof window.Inventory.loadInventory === 'function') {
                window.Inventory.loadInventory();
            } else if (this.currentRoute === 'finance' && window.Finance && typeof window.Finance.loadFinance === 'function') {
                window.Finance.loadFinance();
            } else if (this.currentRoute === 'expenses' && window.Expenses && typeof window.Expenses.loadExpenses === 'function') {
                window.Expenses.loadExpenses();
            } else if (this.currentRoute === 'deliveries' && window.Deliveries && typeof window.Deliveries.loadDeliveries === 'function') {
                window.Deliveries.loadDeliveries();
            } else if (this.currentRoute === 'returns' && window.Returns && typeof window.Returns.loadReturns === 'function') {
                window.Returns.loadReturns();
            } else if (this.currentRoute === 'reports' && window.Reports && typeof window.Reports.generatePL === 'function') {
                window.Reports.generatePL();
            } else if (this.currentRoute === 'users' && window.Users && typeof window.Users.loadUsers === 'function') {
                window.Users.loadUsers();
            }
        };

        window.addEventListener('easebus:data-changed', (e) => {
            if (e && e.detail) handleDataChange(e.detail);
        });

        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const bc = new BroadcastChannel('easebus_realtime_sync');
                bc.onmessage = (event) => {
                    if (event && event.data) handleDataChange(event.data);
                };
            } catch(e) {}
        }

        this.startGlobalLivePoller();
    },

    _globalPollerActive: false,

    startGlobalLivePoller() {
        if (this._globalPollerActive) return;
        this._globalPollerActive = true;

        setInterval(() => {
            if (document.hidden) return;
            const currentUser = API.getCurrentUser();
            if (!currentUser) return;

            if (this.currentRoute === 'dashboard' && window.Dashboard?.loadSummary) {
                window.Dashboard.loadSummary(true);
            } else if (this.currentRoute === 'orders' && window.Orders?.loadOrders) {
                window.Orders.loadOrders();
            } else if (this.currentRoute === 'users' && window.Users?.loadUsers) {
                window.Users.loadUsers();
            } else if (this.currentRoute === 'deliveries' && window.Deliveries?.loadDeliveries) {
                window.Deliveries.loadDeliveries();
            } else if (this.currentRoute === 'reports' && window.Reports?.generatePL) {
                window.Reports.generatePL();
            }
        }, 3000);
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

    getActiveStoreBusinessName(user) {
        if (user && window.isStoreOwner(user) && user.business_name && user.business_name !== 'My Business' && user.business_name !== 'EaseBus Store' && !user.business_name.includes("'s Business")) {
            return user.business_name;
        }
        try {
            const globalUsers = getGlobalUsers();
            const owner = globalUsers.find(gu => (gu.role === 'admin' || gu.role === 'creator' || !gu.created_by) && gu.business_name && gu.business_name !== 'My Business' && gu.business_name !== 'EaseBus Store' && !gu.business_name.includes("'s Business"));
            if (owner && owner.business_name) return owner.business_name;
        } catch(e) {}
        try {
            const settings = getStorage('settings', null);
            if (settings && settings.name && settings.name !== 'EaseBus Store' && settings.name !== 'My Business' && !settings.name.includes("'s Business")) {
                return settings.name;
            }
        } catch(e) {}
        return 'eloria';
    },

    updateUserProfile(user) {
        if (!user) return;
        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-role-display');
        const avatarEl = document.getElementById('user-avatar');
        const storeNameEl = document.getElementById('store-name-display');
        const brandLink = document.getElementById('brand-logo-link');
        const brandName = document.getElementById('brand-name-display');

        // Top right header elements
        const topBizName = document.getElementById('top-bar-biz-name');
        const topOwnerName = document.getElementById('top-bar-owner-name');
        const dropdownBizName = document.getElementById('dropdown-biz-name');
        const dropdownOwnerName = document.getElementById('dropdown-owner-name');
        const dropdownRoleText = document.getElementById('dropdown-role-text');
        const dropdownBizSettingsLink = document.getElementById('dropdown-biz-settings-link');

        const activeBizName = this.getActiveStoreBusinessName(user);
        const isOwner = window.isStoreOwner(user);

        let displayRole = 'Store User';
        if (user.role === 'creator' || user.username === 'shad@dbms.com') {
            displayRole = 'Platform Creator & System Admin';
        } else if (isOwner) {
            displayRole = 'Store Owner';
        } else if (user.role === 'admin' || (user.username && user.username.toLowerCase() === 'tanvir')) {
            displayRole = 'Store Administrator';
        } else if (user.role === 'manager') {
            displayRole = 'Store Operations Manager';
        } else if (user.role === 'sales') {
            displayRole = 'Sales Representative';
        } else if (user.role === 'accountant') {
            displayRole = 'Staff Accountant';
        } else {
            displayRole = 'General Staff Member';
        }

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
        if (roleEl) roleEl.textContent = displayRole;
        if (storeNameEl) storeNameEl.textContent = activeBizName;

        if (topBizName) topBizName.textContent = activeBizName;
        if (topOwnerName) topOwnerName.textContent = user.username || user.full_name;
        if (dropdownBizName) dropdownBizName.textContent = activeBizName;
        if (dropdownOwnerName) dropdownOwnerName.textContent = user.full_name || user.username;
        if (dropdownRoleText) dropdownRoleText.textContent = displayRole;

        // RBAC Restriction: Hide Business Profile & Logo link & Report Issue link for non-owner staff accounts
        if (dropdownBizSettingsLink) {
            if (isOwner) {
                dropdownBizSettingsLink.classList.remove('hidden');
            } else {
                dropdownBizSettingsLink.classList.add('hidden');
            }
        }

        const dropdownReportIssueBtn = document.getElementById('dropdown-report-issue-btn');
        if (dropdownReportIssueBtn) {
            if (isOwner) {
                dropdownReportIssueBtn.classList.remove('hidden');
            } else {
                dropdownReportIssueBtn.classList.add('hidden');
            }
        }

        if (avatarEl) {
            const initial = (user.full_name || user.username || 'A').charAt(0).toUpperCase();
            avatarEl.textContent = initial;
        }

        // Re-render sidebar to match user role
        this.setupSidebar();
    },

    setupAuth() {
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const formLogin = document.getElementById('form-login');
        const formRegister = document.getElementById('form-register');
        const authError = document.getElementById('auth-error');

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
        if (window.Dashboard && typeof window.Dashboard.stopLivePolling === 'function') {
            window.Dashboard.stopLivePolling();
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
        this.closeNotifDropdown();
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

    toggleNotifDropdown(e) {
        if (e) e.stopPropagation();
        this.closeProfileDropdown();
        const menu = document.getElementById('notif-dropdown-menu');
        if (!menu) return;
        menu.classList.toggle('hidden');
    },

    closeNotifDropdown() {
        const menu = document.getElementById('notif-dropdown-menu');
        if (menu) menu.classList.add('hidden');
    },

    closeAllDropdowns() {
        this.closeProfileDropdown();
        this.closeNotifDropdown();
    },

    showProfileSettingsModal() {
        this.closeAllDropdowns();
        const user = API.getCurrentUser() || {};
        
        let modal = document.getElementById('profile-settings-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'profile-settings-modal';
            modal.className = 'fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4 font-jakarta';
            document.body.appendChild(modal);
        }

        const displayRole = user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'User';

        modal.innerHTML = `
            <div class="bg-slate-900 text-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-800 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                            <span class="material-symbols-outlined text-lg">manage_accounts</span>
                        </div>
                        <div>
                            <h3 class="font-bold text-sm text-white font-geist">Edit Profile Settings</h3>
                            <p class="text-[11px] text-slate-400 font-inter">Update your account credentials & preferences</p>
                        </div>
                    </div>
                    <button type="button" class="text-slate-400 hover:text-white rounded-lg p-1 cursor-pointer" onclick="document.getElementById('profile-settings-modal').remove()">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div class="p-6">
                    <form id="profile-settings-form" onsubmit="App.handleProfileSettingsSubmit(event)" class="space-y-4 font-inter text-xs">
                        <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3 mb-2">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm font-outfit border border-blue-400/40">
                                ${(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="font-bold text-slate-200 text-xs">${user.full_name || user.username}</div>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 font-outfit">
                                    ${displayRole} Account
                                </span>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-slate-300 font-semibold mb-1 block">Full Name *</label>
                                <input type="text" name="full_name" class="form-input bg-slate-950 border-slate-800 text-white py-2 text-xs" value="${user.full_name || user.username || ''}" required>
                            </div>
                            <div>
                                <label class="form-label text-slate-300 font-semibold mb-1 block">Username *</label>
                                <input type="text" name="username" class="form-input bg-slate-950 border-slate-800 text-white py-2 text-xs" value="${user.username || ''}" required>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-slate-300 font-semibold mb-1 block">Phone Number *</label>
                                <input type="text" name="phone" class="form-input bg-slate-950 border-slate-800 text-white py-2 text-xs" value="${user.phone || '01700000000'}" required>
                            </div>
                            <div>
                                <label class="form-label text-slate-300 font-semibold mb-1 block">Email Address</label>
                                <input type="email" name="email" class="form-input bg-slate-950 border-slate-800 text-white py-2 text-xs" value="${user.email || ''}" placeholder="user@easebus.com">
                            </div>
                        </div>

                        ${window.isStoreOwner(user) ? `
                            <div>
                                <label class="form-label text-slate-300 font-semibold mb-1 block">Business / Store Name</label>
                                <input type="text" name="business_name" class="form-input bg-slate-950 border-slate-800 text-white py-2 text-xs" value="${App.getActiveStoreBusinessName(user)}">
                            </div>
                        ` : `
                            <div>
                                <label class="form-label text-slate-400 font-semibold mb-1 block flex items-center justify-between">
                                    <span>Store Business Name</span>
                                    <span class="text-[10px] text-amber-400 font-normal font-outfit font-bold">Managed by Store Owner (hisham)</span>
                                </label>
                                <input type="text" name="business_name" class="form-input bg-slate-950/60 border-slate-800/80 text-slate-400 py-2 text-xs cursor-not-allowed" value="${App.getActiveStoreBusinessName(user)}" disabled>
                            </div>
                        `}

                        <div class="pt-2 border-t border-slate-800">
                            <label class="form-label text-slate-300 font-semibold mb-1 block">Change Password (optional)</label>
                            <input type="password" name="password" class="form-input bg-slate-950 border-slate-800 text-white py-2 text-xs" placeholder="Leave empty to keep existing password">
                            <p class="text-[10px] text-slate-400 mt-1">Minimum 4 characters if changing password.</p>
                        </div>

                        <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-800 font-outfit">
                            <button type="button" class="btn text-xs px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 cursor-pointer" onclick="document.getElementById('profile-settings-modal').remove()">Cancel</button>
                            <button type="submit" id="profile-save-btn" class="btn text-xs font-bold px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border border-blue-400/30 flex items-center gap-1.5 cursor-pointer">
                                <span class="material-symbols-outlined text-sm">save</span> Save Profile Updates
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    async handleProfileSettingsSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const btn = document.getElementById('profile-save-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Saving Profile...'; }

        const payload = {
            full_name: form.full_name.value.trim(),
            username: form.username.value.trim(),
            phone: form.phone.value.trim(),
            email: form.email.value.trim(),
            business_name: form.business_name.value.trim(),
            password: form.password.value ? form.password.value : ''
        };

        try {
            const res = await API.request('auth/update-profile', 'POST', payload);
            if (res && res.success !== false) {
                const updatedUser = res.data?.user || { ...API.getCurrentUser(), ...payload };
                API.setCurrentUser(updatedUser);
                this.updateUserProfile(updatedUser);
                UI.toast('Profile settings updated successfully!', 'success');
                document.getElementById('profile-settings-modal')?.remove();
            } else {
                UI.toast(res?.message || 'Failed to update profile settings', 'error');
            }
        } catch(err) {
            UI.toast(err.message || 'Failed to update profile settings', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = `<span class="material-symbols-outlined text-sm">save</span> Save Profile Updates`; }
        }
    },

    clearNotifs(e) {
        if (e) e.stopPropagation();
        const badge = document.getElementById('notif-badge');
        if (badge) badge.classList.add('hidden');
        UI.toast('All notifications marked as read', 'success');
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

        const rawRole = user ? (user.role || 'admin').toLowerCase() : 'admin';
        const role = (window.Dashboard && typeof window.Dashboard.normalizeRole === 'function')
            ? window.Dashboard.normalizeRole(rawRole)
            : (rawRole.includes('manager') ? 'manager' : (rawRole.includes('sale') || rawRole.includes('staff') ? 'sales' : (rawRole.includes('account') ? 'accountant' : (rawRole.includes('creator') ? 'creator' : 'admin'))));

        if (user && (role === 'creator' || user.username === 'shad@dbms.com') && (!window.Creator || !window.Creator.isReadOnlyMode)) {
            mainNav.innerHTML = `
                <div id="creator-suite-header" class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-slate-800/80 mb-2 font-outfit">
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
        } else if (role === 'manager') {
            mainNav.innerHTML = `
                <div class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 border-b border-slate-800 mb-2 font-outfit">
                    <span class="material-symbols-outlined text-base text-indigo-400">shield_person</span> Store Manager Portal
                </div>
                <a href="#dashboard" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-indigo-400">space_dashboard</span> Operations Command Hub
                </a>
                <div class="pt-3 pb-1">
                    <p class="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-outfit">Store Operations</p>
                </div>
                <a href="#products" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">inventory_2</span> Products & Stock
                </a>
                <a href="#inventory" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">warehouse</span> Inventory Control
                </a>
                <a href="#suppliers" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">local_shipping</span> Suppliers & Restock
                </a>
                <a href="#orders" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">shopping_cart</span> Orders & Sales
                </a>
                <a href="#deliveries" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">moped</span> Logistics & Dispatch
                </a>
                <a href="#returns" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">assignment_return</span> Customer Returns
                </a>
                <a href="#customers" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">people</span> Customer Directory
                </a>
                <a href="#reports" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">bar_chart</span> Operational Reports
                </a>
            `;
        } else if (role === 'sales' || role === 'staff') {
            mainNav.innerHTML = `
                <div class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-slate-800 mb-2 font-outfit">
                    <span class="material-symbols-outlined text-base text-amber-400">point_of_sale</span> Sales Rep POS Portal
                </div>
                <a href="#dashboard" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-amber-400">point_of_sale</span> Sales POS Terminal
                </a>
                <div class="pt-3 pb-1">
                    <p class="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-outfit">Sales Desk</p>
                </div>
                <a href="#orders" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">shopping_bag</span> Orders & Counter Sales
                </a>
                <a href="#products" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">inventory_2</span> Catalog & Stock Check
                </a>
                <a href="#deliveries" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">local_shipping</span> Delivery Status Lookup
                </a>
                <a href="#customers" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">person_add</span> Customers & CRM
                </a>
            `;
        } else if (role === 'accountant') {
            mainNav.innerHTML = `
                <div class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 border-b border-slate-800 mb-2 font-outfit">
                    <span class="material-symbols-outlined text-base text-cyan-400">account_balance</span> Staff Accountant Portal
                </div>
                <a href="#dashboard" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-cyan-400">account_balance_wallet</span> Financial Ledger Hub
                </a>
                <div class="pt-3 pb-1">
                    <p class="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-outfit">Accounting & Audit</p>
                </div>
                <a href="#finance" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">payments</span> Accounts & Cash Flow
                </a>
                <a href="#expenses" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">receipt_long</span> Expenses & Overhead
                </a>
                <a href="#returns" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">assignment_return</span> Refunds & Settlements
                </a>
                <a href="#reports" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">query_stats</span> Financial Reports & P&L
                </a>
                <a href="#investors" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">handshake</span> Investor Ledger
                </a>
            `;
        } else if (role === 'admin' && !window.isStoreOwner(user)) {
            // Staff Administrator (e.g. tanvir) - Controlled by Store Owner (hisham)
            mainNav.innerHTML = `
                <div class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 border-b border-slate-800 mb-2 font-outfit">
                    <span class="material-symbols-outlined text-base text-blue-400">admin_panel_settings</span> Store Administrator Hub
                </div>
                <a href="#dashboard" class="nav-item active group flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">
                    <span class="material-symbols-outlined mr-3 text-lg">dashboard</span> Operations Command Hub
                </a>
                
                <div class="pt-4 pb-1">
                    <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Store Operations</p>
                </div>
                
                <a href="#products" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">inventory_2</span> Products & Stock
                </a>
                <a href="#inventory" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">warehouse</span> Inventory Control
                </a>
                <a href="#suppliers" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">local_shipping</span> Suppliers & Restock
                </a>
                <a href="#orders" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">shopping_cart</span> Orders & Sales
                </a>
                <a href="#deliveries" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">moped</span> Logistics & Dispatch
                </a>
                <a href="#returns" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">assignment_return</span> Customer Returns
                </a>
                <a href="#customers" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">people</span> Customer Registry
                </a>
                
                <div class="pt-4 pb-1">
                    <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reports & Analytics</p>
                </div>
                
                <a href="#reports" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">bar_chart</span> Store Reports
                </a>
                <a href="#users" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">manage_accounts</span> Store Staff Directory
                </a>
            `;
        } else {
            // Primary Store Owner (hisham) - FULL UNRESTRICTED ACCESS
            mainNav.innerHTML = `
                <a href="#dashboard" class="nav-item active group flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">
                    <span class="material-symbols-outlined mr-3 text-lg">dashboard</span> Executive Dashboard
                </a>
                
                <div class="pt-4 pb-1">
                    <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Business Operations</p>
                </div>
                
                <a href="#products" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">inventory_2</span> Products & Stock
                </a>
                <a href="#inventory" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">warehouse</span> Inventory Management
                </a>
                <a href="#suppliers" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">local_shipping</span> Suppliers
                </a>
                <a href="#orders" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">shopping_cart</span> Orders & Sales
                </a>
                <a href="#deliveries" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">moped</span> Deliveries & Logistics
                </a>
                <a href="#returns" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">assignment_return</span> Customer Returns
                </a>
                <a href="#customers" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">people</span> Customers
                </a>
                
                <div class="pt-4 pb-1">
                    <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Finance & Equity</p>
                </div>
                
                <a href="#finance" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">account_balance_wallet</span> Accounts & Cash
                </a>
                <a href="#expenses" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">receipt_long</span> Expenses
                </a>
                <a href="#investors" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">handshake</span> Investors & Equity
                </a>
                
                <div class="pt-4 pb-1">
                    <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Management</p>
                </div>
                
                <a href="#reports" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">bar_chart</span> Analytics & Reports
                </a>
                <a href="#users" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">manage_accounts</span> Store Owner & Staff
                </a>
                <a href="#settings" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">settings</span> Settings
                </a>
            `;
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
        const rawRole = (currentUser?.role || 'admin').toLowerCase();
        const userRole = (window.Dashboard && typeof window.Dashboard.normalizeRole === 'function')
            ? window.Dashboard.normalizeRole(rawRole)
            : (rawRole.includes('manager') ? 'manager' : (rawRole.includes('sale') || rawRole.includes('staff') ? 'sales' : (rawRole.includes('account') ? 'accountant' : (rawRole.includes('creator') ? 'creator' : 'admin'))));
        const isCreator = currentUser && (userRole === 'creator' || currentUser.username === 'shad@dbms.com');
        const isReadOnly = window.Creator && window.Creator.isReadOnlyMode;

        // Role Route Authorization Guarding
        const allowedRoutesMap = {
            'admin': ['dashboard', 'products', 'inventory', 'suppliers', 'orders', 'deliveries', 'returns', 'customers', 'finance', 'expenses', 'investors', 'reports', 'users', 'settings'],
            'manager': ['dashboard', 'products', 'inventory', 'suppliers', 'orders', 'deliveries', 'returns', 'customers', 'reports'],
            'sales': ['dashboard', 'orders', 'products', 'deliveries', 'customers'],
            'staff': ['dashboard', 'orders', 'products', 'deliveries', 'customers'],
            'accountant': ['dashboard', 'finance', 'expenses', 'returns', 'reports', 'investors'],
            'creator': ['creator-overview', 'creator-stores', 'creator-transactions', 'creator-inventory', 'creator-health']
        };

        if (!isCreator && allowedRoutesMap[userRole] && !allowedRoutesMap[userRole].includes(route)) {
            try { UI.toast(`Access to #${route} is restricted for your role`, 'warning'); } catch(e) {}
            route = 'dashboard';
            window.location.hash = 'dashboard';
            return;
        }

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
            script.src = finalSrc + '?v=' + Date.now();
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    showReportIssueModal() {
        const currentUser = API.getCurrentUser();
        if (!currentUser || !window.isStoreOwner(currentUser)) {
            UI.toast('Only Business Store Owners are permitted to report issues directly to Platform Creator', 'error');
            return;
        }

        let modal = document.getElementById('report-issue-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'report-issue-modal';
            modal.className = 'fixed inset-0 modal-overlay z-[100] flex items-center justify-center p-4 font-jakarta';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-slate-900 text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-amber-500/40 animate-fade-in font-jakarta">
                <div class="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-slate-800 flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-amber-400">bug_report</span>
                        <h3 class="font-bold text-base text-white font-geist">Report Issue to Platform Creator</h3>
                    </div>
                    <button type="button" class="text-slate-400 hover:text-white rounded-lg p-1 cursor-pointer" onclick="document.getElementById('report-issue-modal').remove()">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <form id="report-issue-form" onsubmit="App.submitReportIssue(event)" class="p-6 space-y-4 font-inter text-xs">
                    <div>
                        <label class="form-label text-xs font-semibold text-slate-300">Category *</label>
                        <select name="category" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white font-bold" required>
                            <option value="System Bug">System Bug / Error</option>
                            <option value="Feature Request">Feature Request / Improvement</option>
                            <option value="Billing & Account">Billing & Store Setup</option>
                            <option value="Urgent Support">Urgent Production Support</option>
                        </select>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold text-slate-300">Subject / Summary *</label>
                        <input type="text" name="subject" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white" placeholder="e.g. Sales order print button error" required>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold text-slate-300">Issue Details / Steps to Reproduce *</label>
                        <textarea name="description" rows="4" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white" placeholder="Explain the problem clearly so Creator (shad@dbms.com) can diagnose and fix it immediately..." required></textarea>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold text-slate-300">Priority Level</label>
                        <select name="priority" class="form-input text-xs py-2 bg-slate-950 border-slate-800 text-white font-bold">
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent Production Blocker</option>
                        </select>
                    </div>

                    <div class="pt-3 border-t border-slate-800 flex justify-end gap-3 font-outfit">
                        <button type="button" class="btn text-xs px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 cursor-pointer" onclick="document.getElementById('report-issue-modal').remove()">
                            Cancel
                        </button>
                        <button type="submit" class="btn text-xs font-bold px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-lg border border-amber-400/40 cursor-pointer flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm">send</span> Submit Direct to Creator
                        </button>
                    </div>
                </form>
            </div>
        `;
    },

    async submitReportIssue(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            UI.setLoading(true);
            const res = await API.post('support?action=create', data);
            document.getElementById('report-issue-modal')?.remove();
            UI.toast('Your issue report has been submitted directly to Platform Creator (shad@dbms.com)!');
        } catch (err) {
            UI.toast(err.message || 'Failed to submit report', 'error');
        } finally {
            UI.setLoading(false);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
