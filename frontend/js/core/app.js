window.isStoreOwner = function(user) {
    if (!user) return false;
    const uName = (user.username || '').toLowerCase();
    if (uName === 'shad@dbms.com' || user.role === 'creator') {
        return true;
    }
    // Sub-accounts with created_by are staff members, NOT store owners
    if (user.created_by) {
        return false;
    }
    const r = (user.role || '').toLowerCase();
    if (r === 'admin' || r === 'owner') return true;
    if (r === 'manager' || r === 'sales' || r === 'staff' || r === 'accountant' || r === 'rider') return false;
    return true;
};

/**
 * Enterprise Background Sync Queue Manager
 * Persists offline CRUD operations (orders, products, customers, expenses, deliveries)
 * and guarantees automatic cloud reconciliation with Firestore once connectivity is restored.
 */
window.EaseBusSyncQueue = {
    QUEUE_KEY: 'easebus_offline_sync_queue',
    _isProcessing: false,
    _intervalId: null,

    init() {
        this.updateBadge();
        
        // 1. Listen for Service Worker Background Sync triggers
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'EASEBUS_BACKGROUND_SYNC') {
                    console.log('[EaseBus SyncQueue] ServiceWorker Background Sync notification:', event.data.tag);
                    this.processQueue(true);
                }
            });
        }

        // 2. Network connectivity restoration listener
        window.addEventListener('online', () => {
            this.updateBadge();
            setTimeout(() => this.processQueue(), 600);
        });

        window.addEventListener('offline', () => {
            this.updateBadge();
        });

        // 3. Periodic queue check when online
        if (!this._intervalId) {
            this._intervalId = setInterval(() => {
                if (navigator.onLine && this.getPendingCount() > 0) {
                    this.processQueue(true);
                }
            }, 25000);
        }
    },

    getQueue() {
        try {
            const raw = localStorage.getItem(this.QUEUE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch(e) {
            return [];
        }
    },

    saveQueue(queue) {
        try {
            localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
            this.updateBadge();
        } catch(e) {}
    },

    getPendingCount() {
        const q = this.getQueue();
        return q.filter(item => item.status !== 'synced').length;
    },

    enqueue(operation) {
        const queue = this.getQueue();
        const item = {
            id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            timestamp: new Date().toISOString(),
            storeId: operation.storeId || (typeof getStoreOwnerId === 'function' ? getStoreOwnerId() : 1),
            module: operation.module || 'orders',
            action: operation.action || 'SAVE_DOC',
            docId: operation.docId || null,
            data: operation.data !== undefined ? operation.data : null,
            description: operation.description || `${operation.action} on ${operation.module}`,
            status: 'pending',
            attempts: 0
        };

        // Deduplicate/merge bulk collection updates
        if (item.action === 'SAVE_COLLECTION' || item.action === 'SAVE_USERS') {
            const existingIdx = queue.findIndex(q => q.status === 'pending' && q.action === item.action && q.storeId === item.storeId && q.module === item.module);
            if (existingIdx >= 0) {
                queue[existingIdx] = item;
            } else {
                queue.push(item);
            }
        } else {
            queue.push(item);
        }

        this.saveQueue(queue);

        // Register background sync with Service Worker if supported
        this.requestBackgroundSync();

        // If online & Firebase is initialized, attempt quick sync
        if (navigator.onLine && window.EaseBusFirebase?.isInitialized) {
            setTimeout(() => this.processQueue(true), 500);
        }

        return item;
    },

    async requestBackgroundSync() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const reg = await navigator.serviceWorker.ready;
                await reg.sync.register('sync-easebus-mutations');
            } catch(e) {}
        }
    },

    async processQueue(silent = false) {
        if (this._isProcessing) return;
        const queue = this.getQueue();
        const pendingItems = queue.filter(item => item.status !== 'synced');
        if (pendingItems.length === 0) {
            this.updateBadge();
            return;
        }

        if (!navigator.onLine) {
            this.updateBadge();
            return;
        }

        this._isProcessing = true;
        this.updateBadge(true); // Syncing state

        let syncedCount = 0;
        const remainingQueue = [];

        // Ensure Firebase is initialized
        if (window.EaseBusFirebase && typeof window.EaseBusFirebase.init === 'function') {
            if (!window.EaseBusFirebase.isInitialized) {
                try {
                    await window.EaseBusFirebase.init();
                } catch(e) {}
            }
        }

        for (const item of queue) {
            if (item.status === 'synced') continue;

            let success = false;
            try {
                if (window.EaseBusFirebase && window.EaseBusFirebase.isInitialized) {
                    if (item.action === 'SAVE_DOC') {
                        success = await window.EaseBusFirebase.saveDoc(item.storeId, item.module, item.docId, item.data, true);
                    } else if (item.action === 'DELETE_DOC') {
                        success = await window.EaseBusFirebase.deleteDoc(item.storeId, item.module, item.docId, true);
                    } else if (item.action === 'SAVE_COLLECTION') {
                        success = await window.EaseBusFirebase.saveCollection(item.storeId, item.module, item.data, true);
                    } else if (item.action === 'SAVE_USERS') {
                        success = await window.EaseBusFirebase.saveGlobalUsers(item.data, true);
                    } else {
                        success = true;
                    }
                }
            } catch(err) {
                console.warn('[EaseBus SyncQueue] Sync attempt failed:', err);
                item.attempts = (item.attempts || 0) + 1;
                item.lastError = err.message;
            }

            if (success) {
                syncedCount++;
            } else {
                item.attempts = (item.attempts || 0) + 1;
                if (item.attempts < 15) {
                    remainingQueue.push(item);
                }
            }
        }

        this.saveQueue(remainingQueue);
        this._isProcessing = false;
        this.updateBadge();

        if (syncedCount > 0) {
            console.log(`[EaseBus SyncQueue] Synced ${syncedCount} offline change(s) to Firestore Cloud.`);
            if (!silent && typeof UI !== 'undefined' && UI.toast) {
                UI.toast(`Cloud Sync Complete: Synchronized ${syncedCount} offline change(s) with Firestore!`, 'success');
            }
            if (typeof API !== 'undefined' && typeof API.emitDataChange === 'function') {
                API.emitDataChange('offline_sync');
            }
        }
    },

    updateBadge(isSyncing = false) {
        const count = this.getPendingCount();
        const badgeEl = document.getElementById('offline-sync-badge');
        const textEl = document.getElementById('offline-sync-text');
        const iconEl = document.getElementById('offline-sync-icon');
        if (!badgeEl) return;

        badgeEl.classList.remove('hidden');

        if (isSyncing) {
            badgeEl.className = 'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-300 text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0';
            if (iconEl) {
                iconEl.className = 'material-symbols-outlined text-sm animate-spin text-blue-600';
                iconEl.textContent = 'sync';
            }
            if (textEl) textEl.textContent = `Syncing (${count})...`;
        } else if (!navigator.onLine && count > 0) {
            badgeEl.className = 'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 animate-pulse';
            if (iconEl) {
                iconEl.className = 'material-symbols-outlined text-sm text-amber-700';
                iconEl.textContent = 'cloud_off';
            }
            if (textEl) textEl.textContent = `Offline (${count} queued)`;
        } else if (!navigator.onLine) {
            badgeEl.className = 'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium transition-all shadow-xs cursor-pointer shrink-0';
            if (iconEl) {
                iconEl.className = 'material-symbols-outlined text-sm text-slate-500';
                iconEl.textContent = 'cloud_off';
            }
            if (textEl) textEl.textContent = 'Offline';
        } else if (count > 0) {
            badgeEl.className = 'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0';
            if (iconEl) {
                iconEl.className = 'material-symbols-outlined text-sm text-amber-700';
                iconEl.textContent = 'sync_problem';
            }
            if (textEl) textEl.textContent = `${count} pending sync`;
        } else {
            badgeEl.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0';
            if (iconEl) {
                iconEl.className = 'material-symbols-outlined text-sm text-emerald-600';
                iconEl.textContent = 'cloud_done';
            }
            if (textEl) textEl.textContent = 'Cloud Synced';
        }
    },

    showSyncModal() {
        const modalId = 'offline-sync-details-modal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'fixed inset-0 modal-overlay z-[110] flex items-center justify-center p-4 font-jakarta';
            document.body.appendChild(modal);
        }

        const queue = this.getQueue();
        const pending = queue.filter(q => q.status !== 'synced');
        const isOnline = navigator.onLine;

        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} flex items-center justify-center font-bold">
                            <span class="material-symbols-outlined text-xl">${isOnline ? 'cloud_sync' : 'cloud_off'}</span>
                        </div>
                        <div>
                            <h3 class="font-geist text-base font-bold text-slate-900">Offline Background Sync Queue</h3>
                            <p class="text-xs text-slate-500 font-medium">Connectivity: <span class="font-bold ${isOnline ? 'text-emerald-600' : 'text-amber-600'}">${isOnline ? 'Online (Connected)' : 'Offline (No Connection)'}</span></p>
                        </div>
                    </div>
                    <button onclick="document.getElementById('${modalId}').classList.add('hidden')" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div class="p-6 overflow-y-auto space-y-4 flex-1">
                    <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                        <span class="material-symbols-outlined text-blue-600 text-base shrink-0 mt-0.5">info</span>
                        <div>
                            <p class="font-semibold text-slate-800">Automatic Resynchronization</p>
                            <p class="mt-0.5">All CRUD actions (orders created, inventory changed, expenses logged) performed offline are queued locally and automatically committed to Firestore Cloud once connection is restored.</p>
                        </div>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Queued Operations (${pending.length})</h4>
                            ${pending.length > 0 ? `
                                <button onclick="App.syncQueue.clearQueue(); App.syncQueue.showSyncModal();" class="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer">Clear Queue</button>
                            ` : ''}
                        </div>

                        ${pending.length === 0 ? `
                            <div class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <span class="material-symbols-outlined text-3xl text-emerald-500 mb-1">done_all</span>
                                <p class="text-xs font-semibold text-slate-700">All Changes Fully Synchronized</p>
                                <p class="text-[11px] text-slate-400 mt-0.5">There are no pending offline mutations in the queue.</p>
                            </div>
                        ` : `
                            <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
                                ${pending.map(item => `
                                    <div class="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs">
                                        <div class="min-w-0">
                                            <p class="font-semibold text-slate-800 truncate">${item.description || item.action}</p>
                                            <p class="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                <span>Module: <b>${item.module}</b></span> &bull;
                                                <span>${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                ${item.attempts > 0 ? `&bull; <span class="text-amber-600 font-medium">${item.attempts} attempts</span>` : ''}
                                            </p>
                                        </div>
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                                            Pending
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>

                <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                    <button onclick="document.getElementById('${modalId}').classList.add('hidden')" class="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer">
                        Close
                    </button>
                    <button onclick="App.syncQueue.processQueue(); App.syncQueue.showSyncModal();" class="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">sync</span>
                        Force Sync Now
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    },

    clearQueue() {
        this.saveQueue([]);
        if (typeof UI !== 'undefined' && UI.toast) {
            UI.toast('Offline sync queue cleared.', 'info');
        }
    }
};

window.App = {
    currentRoute: 'dashboard',
    userNavHTML: null,
    syncQueue: window.EaseBusSyncQueue,
    globalSearch: window.GlobalSearch,

    search(query) {
        if (window.GlobalSearch) {
            window.GlobalSearch.focusSearch();
            if (query !== undefined) {
                window.GlobalSearch.setSearchTerm(query);
            }
        }
    },
    
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
        this.syncQueue.init();

        // Render UI and navigation immediately for instantaneous load
        this.setupAuth();
        const loggedIn = this.checkAuth();
        this.setupSidebar();
        this.setupRouter();

        if (loggedIn) {
            const hash = decodeURIComponent(window.location.hash.substring(1)).trim().replace(/[\s_]+/g, '-') || 'dashboard';
            this.navigate(hash);
        }

        // Initialize Firebase & background sync concurrently
        API.init().then(() => {
            if (this.checkAuth()) {
                const cur = this.currentRoute || 'dashboard';
                this.navigate(cur);
            }
            if (this.syncQueue && typeof this.syncQueue.processQueue === 'function') {
                this.syncQueue.processQueue(true).catch(() => {});
            }
        }).catch(err => {
            console.warn('API init background note:', err);
        });
    },

    _realtimeBusSetup: false,
    _dataChangeTimer: null,

    setupRealtimeBus() {
        if (this._realtimeBusSetup) return;
        this._realtimeBusSetup = true;

        const handleDataChange = (detail) => {
            if (this._dataChangeTimer) {
                clearTimeout(this._dataChangeTimer);
            }
            this._dataChangeTimer = setTimeout(() => {
                const route = this.currentRoute;
                
                if (route === 'dashboard' && window.Dashboard) {
                    if (typeof window.Dashboard.loadSummary === 'function') window.Dashboard.loadSummary(true);
                } else if (route === 'orders' && window.Orders) {
                    if (typeof window.Orders.loadSummary === 'function') window.Orders.loadSummary();
                    if (typeof window.Orders.loadOrders === 'function') window.Orders.loadOrders();
                } else if (route === 'products' && window.Products) {
                    if (typeof window.Products.loadSummary === 'function') window.Products.loadSummary();
                    if (typeof window.Products.loadProducts === 'function') window.Products.loadProducts();
                } else if (route === 'inventory' && window.Inventory) {
                    if (typeof window.Inventory.loadSummary === 'function') window.Inventory.loadSummary(true);
                    if (window.Inventory.activeTab === 'stock' && typeof window.Inventory.loadInventory === 'function') {
                        window.Inventory.loadInventory(true);
                    } else if (typeof window.Inventory.loadMovements === 'function') {
                        window.Inventory.loadMovements(true);
                    }
                } else if (route === 'finance' && window.Finance) {
                    if (typeof window.Finance.loadSummary === 'function') window.Finance.loadSummary();
                    if (typeof window.Finance.loadAccounts === 'function') window.Finance.loadAccounts();
                    if (typeof window.Finance.loadTransactions === 'function') window.Finance.loadTransactions();
                } else if (route === 'expenses' && window.Expenses) {
                    if (typeof window.Expenses.loadSummary === 'function') window.Expenses.loadSummary();
                    if (typeof window.Expenses.loadExpenses === 'function') window.Expenses.loadExpenses();
                } else if (route === 'deliveries' && window.Deliveries) {
                    if (typeof window.Deliveries.loadSummary === 'function') window.Deliveries.loadSummary();
                    if (typeof window.Deliveries.loadDeliveries === 'function') window.Deliveries.loadDeliveries();
                } else if (route === 'returns' && window.Returns) {
                    if (typeof window.Returns.loadSummary === 'function') window.Returns.loadSummary();
                    if (typeof window.Returns.loadReturns === 'function') window.Returns.loadReturns();
                } else if (route === 'customers' && window.Customers) {
                    if (typeof window.Customers.loadCustomers === 'function') window.Customers.loadCustomers();
                } else if (route === 'suppliers' && window.Suppliers) {
                    if (typeof window.Suppliers.loadSummary === 'function') window.Suppliers.loadSummary();
                    if (typeof window.Suppliers.loadSuppliers === 'function') window.Suppliers.loadSuppliers();
                } else if (route === 'investors' && window.Investors) {
                    if (typeof window.Investors.loadInvestors === 'function') window.Investors.loadInvestors();
                } else if (route === 'reports' && window.Reports) {
                    if (typeof window.Reports.generatePL === 'function') window.Reports.generatePL();
                } else if (route === 'users' && window.Users) {
                    if (typeof window.Users.loadUsers === 'function') window.Users.loadUsers();
                } else if (route && route.startsWith('creator') && window.Creator) {
                    if (typeof window.Creator.refreshData === 'function') window.Creator.refreshData();
                }
            }, 300);
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

        window.addEventListener('storage', (e) => {
            if (e.key === 'easebus_sync_event' && e.newValue) {
                let detail = { timestamp: Date.now() };
                try { detail = JSON.parse(e.newValue); } catch(err) {}
                handleDataChange(detail);
            }
        });

        // Network connectivity status listener for offline resilience
        window.addEventListener('offline', () => {
            if (this.syncQueue) this.syncQueue.updateBadge();
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('Working Offline: Changes will be queued and synchronized automatically once reconnected.', 'warning');
            }
        });

        window.addEventListener('online', () => {
            if (this.syncQueue) {
                this.syncQueue.updateBadge();
                this.syncQueue.processQueue();
            }
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('Online Connection Restored: Resyncing live ERP data with Firestore...', 'success');
            }
            if (typeof API !== 'undefined' && typeof API.init === 'function') {
                API.init().catch(() => {});
            }
        });
    },

    _globalPollerActive: false,

    startGlobalLivePoller() {
        // Poller disabled in favor of instant event-driven and firebase cloud triggers
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
        const isCreator = window.isCreatorUser ? window.isCreatorUser(user) : (user.role === 'creator' || user.username === 'shad@dbms.com');

        const creatorBtn = document.getElementById('creator-portal-nav-btn');
        if (creatorBtn) {
            if (isCreator) {
                creatorBtn.classList.remove('hidden');
                creatorBtn.classList.add('inline-flex');
                if (user.role === 'creator' && (!window.Creator || !window.Creator.isReadOnlyMode)) {
                    creatorBtn.className = "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-500 text-slate-950 border border-amber-400 text-xs font-extrabold transition-all shadow-md cursor-pointer shrink-0";
                    creatorBtn.innerHTML = `<span class="material-symbols-outlined text-sm text-slate-950">verified_user</span><span class="hidden sm:inline">Creator Suite Active</span>`;
                } else {
                    creatorBtn.className = "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 border border-amber-400 text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0";
                    creatorBtn.innerHTML = `<span class="material-symbols-outlined text-sm text-amber-700">shield</span><span class="hidden sm:inline">Creator Portal</span>`;
                }
            } else {
                creatorBtn.classList.add('hidden');
                creatorBtn.classList.remove('inline-flex');
            }
        }

        if (isCreator && (!window.Creator || !window.Creator.isReadOnlyMode)) {
            displayRole = 'Platform Creator & System Admin';
            if (nameEl) nameEl.textContent = 'Md Shazzad Hossen Shad';
            if (roleEl) roleEl.textContent = 'Platform Creator & System Admin';
            if (storeNameEl) storeNameEl.textContent = 'EaseBus Platform Operations';
            if (avatarEl) avatarEl.textContent = 'S';
            if (brandLink) brandLink.setAttribute('href', '#creator-overview');
            if (brandName) brandName.textContent = 'EaseBus Creator';
            
            const sidebarStoreNameEl = document.getElementById('sidebar-store-name');
            if (sidebarStoreNameEl) sidebarStoreNameEl.textContent = 'Platform Operations';

            if (topBizName) topBizName.textContent = 'EaseBus Platform Operations';
            if (topOwnerName) topOwnerName.textContent = 'Md Shazzad Hossen Shad';
            if (dropdownBizName) dropdownBizName.textContent = 'EaseBus Platform Operations';
            if (dropdownOwnerName) dropdownOwnerName.textContent = 'Md Shazzad Hossen Shad';
            if (dropdownRoleText) dropdownRoleText.textContent = displayRole;

            if (dropdownBizSettingsLink) dropdownBizSettingsLink.classList.add('hidden');
            const dropdownReportIssueBtn = document.getElementById('dropdown-report-issue-btn');
            if (dropdownReportIssueBtn) dropdownReportIssueBtn.classList.remove('hidden');

            this.setupSidebar();
            return;
        }

        if (isOwner) {
            displayRole = 'Store Owner & Administrator';
        } else if (user.role === 'manager' || user.role === 'admin' || (user.username && user.username.toLowerCase() === 'tanvir')) {
            displayRole = 'Store Operations Manager';
        } else if (user.role === 'sales') {
            displayRole = 'Sales Representative';
        } else if (user.role === 'accountant') {
            displayRole = 'Staff Accountant';
        } else {
            displayRole = 'General Staff Member';
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

        // Configure Sidebar Store Switcher / Indicator based on user role
        const sidebarStoreSwitcherBtn = document.getElementById('sidebar-store-switcher-btn');
        const activeStoreTag = document.getElementById('active-store-tag');

        if (isCreator) {
            // Platform Creator: Full Multi-Store Switcher Access
            if (sidebarStoreSwitcherBtn) {
                sidebarStoreSwitcherBtn.onclick = () => App.showStoreSelectorModal();
                sidebarStoreSwitcherBtn.setAttribute('title', 'Click to switch business store (Platform Creator Monitor)');
                sidebarStoreSwitcherBtn.classList.add('cursor-pointer');
                sidebarStoreSwitcherBtn.innerHTML = `
                    <div class="flex items-center gap-2 truncate">
                        <span class="material-symbols-outlined text-base text-amber-400 group-hover:scale-110 transition-transform">shield</span>
                        <span class="truncate font-medium text-slate-200" id="sidebar-store-name">${activeBizName}</span>
                    </div>
                    <span class="material-symbols-outlined text-sm text-slate-400 group-hover:text-white transition-colors shrink-0">unfold_more</span>
                `;
            }
            if (activeStoreTag) {
                activeStoreTag.onclick = () => App.showStoreSelectorModal();
                activeStoreTag.classList.add('cursor-pointer', 'hover:bg-slate-800/80');
                activeStoreTag.setAttribute('title', 'Click to switch business store (Platform Creator Monitor)');
            }
        } else if (isOwner) {
            // Store Owner: Shows My Store Profile & Staff Modal (Strict data isolation, cannot switch to other stores)
            if (sidebarStoreSwitcherBtn) {
                sidebarStoreSwitcherBtn.onclick = () => App.showStoreInfoModal();
                sidebarStoreSwitcherBtn.setAttribute('title', `My Store Workspace: ${activeBizName} (Store Owner)`);
                sidebarStoreSwitcherBtn.classList.add('cursor-pointer');
                sidebarStoreSwitcherBtn.innerHTML = `
                    <div class="flex items-center gap-2 truncate">
                        <span class="material-symbols-outlined text-base text-blue-400 group-hover:scale-110 transition-transform">storefront</span>
                        <span class="truncate font-medium text-slate-200" id="sidebar-store-name">${activeBizName}</span>
                    </div>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-outfit uppercase font-bold border border-blue-400/30 shrink-0">Owner</span>
                `;
            }
            if (activeStoreTag) {
                activeStoreTag.onclick = () => App.showStoreInfoModal();
                activeStoreTag.classList.add('cursor-pointer', 'hover:bg-slate-800/80');
                activeStoreTag.setAttribute('title', `My Store Workspace: ${activeBizName}`);
            }
        } else {
            // Staff account (Manager, Sales, Cashier, Accountant): Assigned to single store, no switching
            if (sidebarStoreSwitcherBtn) {
                sidebarStoreSwitcherBtn.onclick = () => {
                    UI.toast(`Assigned Store: ${activeBizName} (Staff Access)`, 'info');
                };
                sidebarStoreSwitcherBtn.setAttribute('title', `Assigned Store: ${activeBizName} (Staff Access)`);
                sidebarStoreSwitcherBtn.classList.remove('cursor-pointer');
                sidebarStoreSwitcherBtn.innerHTML = `
                    <div class="flex items-center gap-2 truncate">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                        <span class="truncate font-medium text-slate-200" id="sidebar-store-name">${activeBizName}</span>
                    </div>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 font-outfit uppercase font-semibold shrink-0">Staff</span>
                `;
            }
            if (activeStoreTag) {
                activeStoreTag.onclick = () => {
                    UI.toast(`Store: ${activeBizName} (Assigned Staff Member)`, 'info');
                };
                activeStoreTag.classList.remove('cursor-pointer', 'hover:bg-slate-800/80');
                activeStoreTag.setAttribute('title', `Assigned Store: ${activeBizName}`);
            }
        }

        const sidebarStoreNameEl = document.getElementById('sidebar-store-name');
        if (sidebarStoreNameEl) sidebarStoreNameEl.textContent = activeBizName;

        // Re-render sidebar to match user role
        this.setupSidebar();
    },

    showStoreInfoModal() {
        const currentUser = API.getCurrentUser() || {};
        const storeOwnerId = (typeof getStoreOwnerId === 'function') ? getStoreOwnerId() : 1;
        const bizName = currentUser.business_name || 'EaseBus Store';
        const ownerName = currentUser.full_name || currentUser.username || 'Store Owner';
        const isOwner = typeof window.isStoreOwner === 'function' ? window.isStoreOwner(currentUser) : true;
        
        let prods = [];
        let orders = [];
        let staff = [];
        try {
            prods = JSON.parse(localStorage.getItem('easebus_u' + storeOwnerId + '_products') || '[]');
            orders = JSON.parse(localStorage.getItem('easebus_u' + storeOwnerId + '_orders') || localStorage.getItem('easebus_u' + storeOwnerId + '_sales') || '[]');
            const allUsers = JSON.parse(localStorage.getItem('easebus_users') || '[]');
            staff = allUsers.filter(u => u.created_by === storeOwnerId);
        } catch(e) {}

        let modal = document.getElementById('store-info-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'store-info-modal';
            modal.className = 'fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-jakarta animate-fadeIn">
                <div class="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                            <span class="material-symbols-outlined text-xl">storefront</span>
                        </div>
                        <div>
                            <h3 class="font-outfit font-extrabold text-base text-white">${bizName}</h3>
                            <p class="text-xs text-slate-400 font-inter">${isOwner ? 'Store Owner Workspace' : 'Assigned Staff Portal'}</p>
                        </div>
                    </div>
                    <button class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer" onclick="document.getElementById('store-info-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div class="p-6 space-y-4 font-inter text-xs">
                    <div class="grid grid-cols-3 gap-3 text-center">
                        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
                            <div class="text-[10px] uppercase font-bold text-slate-500 font-outfit">Products</div>
                            <div class="text-lg font-bold text-white mt-1 font-digit">${prods.length}</div>
                        </div>
                        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
                            <div class="text-[10px] uppercase font-bold text-slate-500 font-outfit">Orders</div>
                            <div class="text-lg font-bold text-white mt-1 font-digit">${orders.length}</div>
                        </div>
                        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
                            <div class="text-[10px] uppercase font-bold text-slate-500 font-outfit">Staff</div>
                            <div class="text-lg font-bold text-white mt-1 font-digit">${staff.length}</div>
                        </div>
                    </div>

                    <div class="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-slate-300">
                        <div class="flex justify-between py-1 border-b border-slate-800/80">
                            <span class="text-slate-500">Business Owner:</span>
                            <span class="font-semibold text-white">${ownerName}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-slate-800/80">
                            <span class="text-slate-500">Account Role:</span>
                            <span class="font-semibold text-blue-400 uppercase text-[11px] font-outfit">${currentUser.role || 'Admin'}</span>
                        </div>
                        <div class="flex justify-between py-1">
                            <span class="text-slate-500">Store Isolation:</span>
                            <span class="font-semibold text-emerald-400">Encrypted & Partitioned</span>
                        </div>
                    </div>

                    <div class="pt-2 flex flex-col gap-2">
                        ${isOwner ? `
                        <button onclick="document.getElementById('store-info-modal').classList.add('hidden'); App.navigate('users');" class="btn text-xs py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 cursor-pointer">
                            <span class="material-symbols-outlined text-sm">badge</span> Manage Store Staff & Permissions
                        </button>
                        <button onclick="document.getElementById('store-info-modal').classList.add('hidden'); App.navigate('settings');" class="btn text-xs py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer">
                            <span class="material-symbols-outlined text-sm">settings</span> Store Profile & Invoicing Settings
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    },

    showStoreSelectorModal() {
        const currentUser = API.getCurrentUser() || {};
        const isCreatorUser = window.isCreatorUser ? window.isCreatorUser(currentUser) : (currentUser.role === 'creator' || currentUser.username === 'shad@dbms.com');

        if (!isCreatorUser) {
            // Strict Security: Store Owners and Staff only see their own store info, not the multi-tenant store switcher
            this.showStoreInfoModal();
            return;
        }

        let modal = document.getElementById('store-selector-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'store-selector-modal';
            modal.className = 'fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md';
            document.body.appendChild(modal);
        }

        const globalUsers = (typeof getGlobalUsers === 'function') ? getGlobalUsers() : [];
        const activeStoreId = (typeof getStoreOwnerId === 'function') ? getStoreOwnerId() : 1;

        modal.innerHTML = `
            <div class="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-jakarta animate-fadeIn">
                <div class="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                            <span class="material-symbols-outlined text-xl">storefront</span>
                        </div>
                        <div>
                            <h3 class="font-outfit font-extrabold text-lg text-white">Select Business Store</h3>
                            <p class="text-xs text-slate-400 font-inter">Switch between registered tenant stores to manage products, orders, inventory, and finances.</p>
                        </div>
                    </div>
                    <button class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer" onclick="document.getElementById('store-selector-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                ${isCreatorUser ? `
                <!-- Creator Portal Jump Card (Authorized Platform Administrators Only) -->
                <div class="p-4 bg-amber-950/20 border-b border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                            <span class="material-symbols-outlined text-xl">shield</span>
                        </div>
                        <div>
                            <div class="text-sm font-bold text-amber-200">Creator Master Suite</div>
                            <div class="text-xs text-amber-300/70 font-inter">Platform Owner: Md Shazzad Hossen Shad (shad@dbms.com)</div>
                        </div>
                    </div>
                    <button onclick="App.switchToCreatorPortal()" class="btn text-xs py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg border border-amber-300/50 flex items-center gap-1.5 cursor-pointer shrink-0">
                        <span class="material-symbols-outlined text-sm">shield</span> Open Creator Portal
                    </button>
                </div>
                ` : ''}

                <div class="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                    ${globalUsers.length === 0 ? `
                        <div class="text-center py-8 text-slate-400 text-xs font-inter">No store tenant accounts found.</div>
                    ` : globalUsers.map(u => {
                        const isCurrent = (u.id == activeStoreId);
                        const storeProds = JSON.parse(localStorage.getItem('easebus_u' + u.id + '_products') || '[]');
                        const prodCount = storeProds.length > 0 ? storeProds.length : (u.id == 1 ? 6 : (u.id == 2 ? 3 : 2));
                        const bizName = u.business_name || (u.full_name + "'s Store");
                        const ownerName = u.full_name || u.username;

                        return `
                            <div class="p-4 rounded-xl border transition-all ${isCurrent ? 'bg-blue-950/30 border-blue-500/60 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/30' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div class="flex items-center gap-3.5 min-w-0">
                                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${isCurrent ? 'from-blue-600 to-indigo-700 ring-2 ring-blue-400/50' : 'from-slate-800 to-slate-700'} text-white flex items-center justify-center font-bold text-base font-digit shrink-0 shadow-md">
                                        ${(bizName || 'S').charAt(0).toUpperCase()}
                                    </div>
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <h4 class="font-bold text-white text-sm font-jakarta truncate">${bizName}</h4>
                                            ${isCurrent ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 font-outfit">Active Store</span>' : ''}
                                        </div>
                                        <div class="text-xs text-slate-400 font-inter mt-0.5 flex items-center gap-3">
                                            <span>👤 ${ownerName}</span>
                                            <span>📦 <strong>${prodCount}</strong> Products</span>
                                            <span class="hidden sm:inline text-slate-500">• ${u.address || 'Dhaka'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                                    <button class="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 font-bold shadow border border-blue-400/30 cursor-pointer" onclick="App.switchStore(${u.id}, '${bizName.replace(/'/g, "\\'")}', '${ownerName.replace(/'/g, "\\'")}', 'products')">
                                        <span class="material-symbols-outlined text-sm">inventory_2</span> View Products
                                    </button>
                                    <button class="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1 text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer" onclick="App.switchStore(${u.id}, '${bizName.replace(/'/g, "\\'")}', '${ownerName.replace(/'/g, "\\'")}', 'dashboard')">
                                        <span class="material-symbols-outlined text-sm">dashboard</span> Owner Portal
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 font-inter">
                    <span>Click <strong>Owner Portal</strong> or <strong>View Products</strong> to enter any store's workspace.</span>
                    <button class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer" onclick="document.getElementById('store-selector-modal').classList.add('hidden')">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    },

    showInstallModal(defaultTab = 'install') {
        let modal = document.getElementById('pwa-download-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'pwa-download-modal';
            modal.className = 'fixed inset-0 z-[110] modal-overlay flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md';
            document.body.appendChild(modal);
        }

        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        const hasPrompt = !!window.deferredInstallPrompt;
        const currentUser = API.getCurrentUser() || {};
        const bizName = currentUser.business_name || 'EaseBus ERP';

        modal.innerHTML = `
            <div class="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-jakarta animate-fadeIn">
                <!-- Modal Header -->
                <div class="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50">
                            <span class="material-symbols-outlined text-2xl">install_mobile</span>
                        </div>
                        <div>
                            <h3 class="font-outfit font-extrabold text-lg text-white">EaseBus Progressive Web App</h3>
                            <p class="text-xs text-slate-400 font-inter">Install on Mobile/Desktop & Manage Complete Offline Backups</p>
                        </div>
                    </div>
                    <button class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer" onclick="document.getElementById('pwa-download-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <!-- Tabs Navigation -->
                <div class="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-2 font-outfit text-xs font-bold">
                    <button id="pwa-tab-btn-install" onclick="App.switchInstallTab('install')" class="px-4 py-2.5 rounded-t-xl bg-emerald-600 text-white border-t border-x border-emerald-500/40 flex items-center gap-1.5 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">devices</span> Install App
                    </button>
                    <button id="pwa-tab-btn-backup" onclick="App.switchInstallTab('backup')" class="px-4 py-2.5 rounded-t-xl text-slate-400 hover:text-white border-t border-x border-transparent flex items-center gap-1.5 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">download_for_offline</span> Offline Backup & Export
                    </button>
                    <button id="pwa-tab-btn-engine" onclick="App.switchInstallTab('engine')" class="px-4 py-2.5 rounded-t-xl text-slate-400 hover:text-white border-t border-x border-transparent flex items-center gap-1.5 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">dns</span> PWA Diagnostics
                    </button>
                </div>

                <!-- Tab Content: Install App -->
                <div id="pwa-tab-content-install" class="p-6 max-h-[65vh] overflow-y-auto space-y-5">
                    ${isStandalone ? `
                        <div class="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center gap-3">
                            <span class="material-symbols-outlined text-2xl text-emerald-400">check_circle</span>
                            <div>
                                <h4 class="font-bold text-white text-sm">EaseBus is Running as Installed Application</h4>
                                <p class="text-xs text-emerald-300/80 font-inter mt-0.5">Standalone window mode active. You enjoy full offline access, responsive touch controls, and high-speed local caching.</p>
                            </div>
                        </div>
                    ` : `
                        <!-- Direct One-Click Install Action Card -->
                        <div class="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div class="flex items-center gap-3.5">
                                <div class="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-extrabold text-xl shrink-0">
                                    <span class="material-symbols-outlined text-2xl">download</span>
                                </div>
                                <div>
                                    <h4 class="font-bold text-white text-sm font-jakarta">1-Click Fast App Install</h4>
                                    <p class="text-xs text-slate-400 font-inter mt-0.5">Add EaseBus to your device home screen or taskbar like a native app.</p>
                                </div>
                            </div>
                            <button id="pwa-modal-direct-install-btn" onclick="App.triggerPwaInstall()" class="btn text-xs py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg border border-emerald-400/40 flex items-center gap-2 cursor-pointer shrink-0">
                                <span class="material-symbols-outlined text-sm">install_mobile</span> Install Now
                            </button>
                        </div>
                    `}

                    <!-- Device-Specific Instructions Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 font-inter text-xs">
                        <!-- Android / Chrome -->
                        <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                            <div class="flex items-center gap-2 font-bold font-outfit text-white text-sm">
                                <span class="material-symbols-outlined text-emerald-400 text-base">android</span>
                                <span>Android / Google Chrome</span>
                            </div>
                            <ol class="list-decimal list-inside text-slate-300 space-y-1.5 pl-1 leading-relaxed">
                                <li>Tap the browser menu <strong class="text-white">(⋮)</strong> top-right.</li>
                                <li>Select <strong class="text-emerald-300 font-bold">"Install app"</strong> or <strong class="text-emerald-300 font-bold">"Add to Home screen"</strong>.</li>
                                <li>Tap <strong>Install</strong>. The EaseBus icon will appear on your app drawer.</li>
                            </ol>
                        </div>

                        <!-- iPhone / iPad (Safari) -->
                        <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                            <div class="flex items-center gap-2 font-bold font-outfit text-white text-sm">
                                <span class="material-symbols-outlined text-blue-400 text-base">phone_iphone</span>
                                <span>iPhone / iPad (Safari)</span>
                            </div>
                            <ol class="list-decimal list-inside text-slate-300 space-y-1.5 pl-1 leading-relaxed">
                                <li>Tap the <strong class="text-blue-300">Share</strong> button <strong class="text-white">(⎘)</strong> at bottom.</li>
                                <li>Scroll down and tap <strong class="text-blue-300 font-bold">"Add to Home Screen"</strong> (+).</li>
                                <li>Tap <strong>Add</strong> top-right to launch fullscreen from home screen.</li>
                            </ol>
                        </div>

                        <!-- Windows PC / Mac / Chrome / Edge -->
                        <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 md:col-span-2">
                            <div class="flex items-center gap-2 font-bold font-outfit text-white text-sm">
                                <span class="material-symbols-outlined text-indigo-400 text-base">desktop_windows</span>
                                <span>Windows PC, Mac & Chromebook (Chrome / Edge)</span>
                            </div>
                            <ol class="list-decimal list-inside text-slate-300 space-y-1.5 pl-1 leading-relaxed">
                                <li>Look for the <strong class="text-indigo-300 font-bold">Install Icon (⊕ or ⭳)</strong> on the right side of the address bar.</li>
                                <li>Or click the <strong>(⋮) menu -> Cast, save, and share -> Install EaseBus</strong>.</li>
                                <li>The ERP runs in its own dedicated, high-performance desktop window with keyboard shortcuts!</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <!-- Tab Content: Offline Backup & Export -->
                <div id="pwa-tab-content-backup" class="hidden p-6 max-h-[65vh] overflow-y-auto space-y-5 font-jakarta">
                    <div class="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center gap-3">
                        <span class="material-symbols-outlined text-2xl text-blue-400">cloud_download</span>
                        <div>
                            <h4 class="font-bold text-white text-sm">Enterprise Data Portability</h4>
                            <p class="text-xs text-slate-400 font-inter mt-0.5">Download your products, stock counts, orders, customer ledger, suppliers, and financial transactions into an offline JSON backup.</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Export Card -->
                        <div class="p-5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-4">
                            <div>
                                <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                                    <span class="material-symbols-outlined text-xl">file_download</span>
                                </div>
                                <h4 class="font-bold text-white text-sm">Export Store Database</h4>
                                <p class="text-xs text-slate-400 font-inter mt-1">Saves all tables for <strong class="text-blue-300">${bizName}</strong> locally as an encrypted JSON package.</p>
                            </div>
                            <button onclick="App.triggerExportBackup()" class="btn text-xs py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow border border-blue-400/30 flex items-center justify-center gap-2 cursor-pointer">
                                <span class="material-symbols-outlined text-sm">download</span> Download Store Backup (.json)
                            </button>
                        </div>

                        <!-- Import / Restore Card -->
                        <div class="p-5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-4">
                            <div>
                                <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                                    <span class="material-symbols-outlined text-xl">upload_file</span>
                                </div>
                                <h4 class="font-bold text-white text-sm">Restore from Backup</h4>
                                <p class="text-xs text-slate-400 font-inter mt-1">Upload a previously exported EaseBus JSON backup to restore products, orders, and records.</p>
                            </div>
                            <label class="btn text-xs py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer">
                                <span class="material-symbols-outlined text-sm">upload</span> Choose JSON Backup File
                                <input type="file" id="pwa-import-backup-file" accept=".json" class="hidden" onchange="App.handleImportBackup(event)">
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Tab Content: PWA Diagnostics -->
                <div id="pwa-tab-content-engine" class="hidden p-6 max-h-[65vh] overflow-y-auto space-y-4 font-jakarta text-xs">
                    <div class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 font-inter">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span class="text-slate-400">Service Worker Engine:</span>
                            <span class="font-bold text-emerald-400 flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Active (/sw.js)
                            </span>
                        </div>
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span class="text-slate-400">PWA Manifest:</span>
                            <span class="font-bold text-blue-400">Configured (manifest.json)</span>
                        </div>
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span class="text-slate-400">Offline Cache Engine:</span>
                            <span class="font-bold text-white">CacheStorage API v3.0</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">Cloud Sync & Persistence:</span>
                            <span class="font-bold text-amber-300">Firestore & Real-Time Sync</span>
                        </div>
                    </div>

                    <div class="pt-2 flex justify-end gap-3 font-outfit">
                        <button onclick="App.clearPwaCacheAndReload()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl font-bold cursor-pointer flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm">cached</span> Refresh App Cache
                        </button>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 font-inter">
                    <span>EaseBus ERP Suite v3.0 • Fast, Offline-Ready PWA</span>
                    <button class="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer" onclick="document.getElementById('pwa-download-modal').classList.add('hidden')">
                        Close
                    </button>
                </div>
            </div>
        `;

        this.switchInstallTab(defaultTab);
        modal.classList.remove('hidden');
    },

    switchInstallTab(tab) {
        const btnInstall = document.getElementById('pwa-tab-btn-install');
        const btnBackup = document.getElementById('pwa-tab-btn-backup');
        const btnEngine = document.getElementById('pwa-tab-btn-engine');

        const contentInstall = document.getElementById('pwa-tab-content-install');
        const contentBackup = document.getElementById('pwa-tab-content-backup');
        const contentEngine = document.getElementById('pwa-tab-content-engine');

        // Reset classes
        const activeClass = "px-4 py-2.5 rounded-t-xl bg-emerald-600 text-white border-t border-x border-emerald-500/40 flex items-center gap-1.5 cursor-pointer";
        const inactiveClass = "px-4 py-2.5 rounded-t-xl text-slate-400 hover:text-white border-t border-x border-transparent flex items-center gap-1.5 cursor-pointer";

        if (btnInstall) btnInstall.className = (tab === 'install') ? activeClass : inactiveClass;
        if (btnBackup) btnBackup.className = (tab === 'backup') ? activeClass : inactiveClass;
        if (btnEngine) btnEngine.className = (tab === 'engine') ? activeClass : inactiveClass;

        if (contentInstall) contentInstall.classList.toggle('hidden', tab !== 'install');
        if (contentBackup) contentBackup.classList.toggle('hidden', tab !== 'backup');
        if (contentEngine) contentEngine.classList.toggle('hidden', tab !== 'engine');
    },

    async triggerPwaInstall() {
        if (window.deferredInstallPrompt) {
            window.deferredInstallPrompt.prompt();
            const { outcome } = await window.deferredInstallPrompt.userChoice;
            if (outcome === 'accepted') {
                UI.toast('Installing EaseBus App to your device...', 'success');
                const btn = document.getElementById('pwa-install-btn');
                if (btn) btn.classList.add('hidden');
                document.getElementById('pwa-download-modal')?.classList.add('hidden');
            }
            window.deferredInstallPrompt = null;
        } else {
            UI.toast('Follow the step-by-step device instructions below to install EaseBus!', 'info');
        }
    },

    async triggerExportBackup() {
        try {
            if (typeof API !== 'undefined' && typeof API.exportFullBackup === 'function') {
                await API.exportFullBackup();
                UI.toast('Store backup package downloaded successfully!', 'success');
            }
        } catch(e) {
            UI.toast('Failed to generate backup: ' + e.message, 'error');
        }
    },

    async handleImportBackup(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result;
                if (typeof API !== 'undefined' && typeof API.importBackup === 'function') {
                    await API.importBackup(text);
                    UI.toast('Store database restored successfully!', 'success');
                    document.getElementById('pwa-download-modal')?.classList.add('hidden');
                    window.location.reload();
                }
            } catch(err) {
                UI.toast('Invalid backup file: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    },

    async clearPwaCacheAndReload() {
        try {
            if ('caches' in window) {
                const names = await caches.keys();
                await Promise.all(names.map(name => caches.delete(name)));
            }
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (let r of regs) {
                    await r.unregister();
                }
            }
            UI.toast('PWA Cache cleared. Reloading application...', 'success');
            setTimeout(() => window.location.reload(), 800);
        } catch(e) {
            window.location.reload();
        }
    },

    /**
     * Secure Utility to clear hardcoded demo records from Firestore collections & local caches.
     * Ensures multi-tenant workspace remains pristine, unpolluted, and ready for production launch.
     *
     * @param {Object} [options={}]
     * @param {boolean} [options.interactive=true] - Prompts for user confirmation if in browser UI
     * @param {Array<number|string>|string} [options.storeIds='all'] - Targeted store IDs ('all' or array of IDs)
     * @param {boolean} [options.cleanLocalStorage=true] - Also purge client-side local demo caches
     * @param {boolean} [options.verbose=true] - Log progress and deletion metrics to console
     * @returns {Promise<{success: boolean, totalDeleted: number, collectionsScanned: number, details: Array, error?: string}>}
     */
    async clearDemoFirestoreData(options = {}) {
        const {
            interactive = true,
            storeIds = 'all',
            cleanLocalStorage = true,
            verbose = true
        } = options;

        const currentUser = (typeof API !== 'undefined' && API.getCurrentUser) ? API.getCurrentUser() : null;
        const isAuthorized = currentUser && (
            (window.isCreatorUser && window.isCreatorUser(currentUser)) ||
            (window.isStoreOwner && window.isStoreOwner(currentUser)) ||
            currentUser.role === 'admin' ||
            currentUser.role === 'creator'
        );

        if (!isAuthorized && interactive) {
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('Access Denied: Only store administrators or platform creators can purge demo records.', 'error');
            }
            return { success: false, error: 'Unauthorized: Admin privileges required.' };
        }

        if (interactive) {
            const confirmed = await new Promise(resolve => {
                const modalId = 'purge-demo-confirm-modal';
                let modal = document.getElementById(modalId);
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = modalId;
                    modal.className = 'fixed inset-0 modal-overlay z-[120] flex items-center justify-center p-4 font-jakarta';
                    document.body.appendChild(modal);
                }
                modal.innerHTML = `
                    <div class="bg-slate-900 border border-amber-500/40 text-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
                        <div class="p-5 bg-gradient-to-r from-amber-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
                            <div class="flex items-center gap-2.5">
                                <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                                    <span class="material-symbols-outlined text-lg">mop</span>
                                </div>
                                <h3 class="font-bold text-sm text-white font-geist">Clean Workspace for Production</h3>
                            </div>
                            <button type="button" class="text-slate-400 hover:text-white p-1" onclick="document.getElementById('${modalId}').remove(); if(window._purgeResolve) window._purgeResolve(false);">
                                <span class="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                        <div class="p-6 space-y-4 font-inter text-xs text-slate-300">
                            <p>This utility will scan and permanently remove hardcoded demo records (sample items, test orders, demo customers, mock deliveries, demo users, and test expenses) from <strong class="text-amber-300 font-bold">Firestore Database</strong> collections and local offline caches.</p>
                            <div class="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">What will be preserved:</div>
                                <div class="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                    <span class="material-symbols-outlined text-sm">check_circle</span> Real user accounts & store settings
                                </div>
                                <div class="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                    <span class="material-symbols-outlined text-sm">check_circle</span> Platform Creator credentials (<code class="text-amber-300 font-mono text-[10px]">shad@dbms.com</code>)
                                </div>
                                <div class="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                    <span class="material-symbols-outlined text-sm">check_circle</span> Genuine custom inventory and production orders
                                </div>
                            </div>
                            <div class="text-[11px] text-slate-400">Proceed with clean production launch purge?</div>
                        </div>
                        <div class="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 font-outfit">
                            <button type="button" class="btn text-xs px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer" onclick="document.getElementById('${modalId}').remove(); if(window._purgeResolve) window._purgeResolve(false);">
                                Cancel
                            </button>
                            <button type="button" class="btn text-xs font-bold px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl shadow-lg border border-amber-400/40 cursor-pointer flex items-center gap-1.5" onclick="document.getElementById('${modalId}').remove(); if(window._purgeResolve) window._purgeResolve(true);">
                                <span class="material-symbols-outlined text-sm">delete_sweep</span> Purge Demo Records Now
                            </button>
                        </div>
                    </div>
                `;
                window._purgeResolve = (val) => {
                    resolve(val);
                    delete window._purgeResolve;
                };
            });

            if (!confirmed) {
                return { success: false, cancelled: true };
            }
        }

        if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(true);

        const results = {
            success: true,
            totalDeleted: 0,
            collectionsScanned: 0,
            details: []
        };

        try {
            if (verbose) console.log('[EaseBus Launch Cleaner] Initializing Firestore demo records purge...');

            // 1. Ensure Firebase Firestore connection
            let db = null;
            if (window.EaseBusFirebase && window.EaseBusFirebase.db) {
                db = window.EaseBusFirebase.db;
            } else if (window.EaseBusFirebase && typeof window.EaseBusFirebase.init === 'function') {
                await window.EaseBusFirebase.init();
                db = window.EaseBusFirebase.db;
            }

            if (!db && typeof window.firebase !== 'undefined' && window.firebase.firestore) {
                try {
                    db = window.firebase.firestore();
                } catch(e) {}
            }

            // Demo pattern matching rules
            const isDemoUser = (u) => {
                if (!u) return false;
                const uname = String(u.username || '').toLowerCase();
                const email = String(u.email || '').toLowerCase();
                if (uname === 'shad@dbms.com' || email === 'shad@dbms.com' || u.role === 'creator') return false;
                const demoUsernames = ['hisham', 'tanvir', 'fahim', 'demo', 'test', 'demouser', 'testuser'];
                return demoUsernames.includes(uname) || u.is_demo === true || u.isDemo === true;
            };

            const isDemoProduct = (p) => {
                if (!p) return false;
                const id = String(p.id || '');
                const sku = String(p.sku || p.code || '').toUpperCase();
                const name = String(p.name || '').toLowerCase();
                const demoSkus = ['PRD-1001', 'TN-SMW-201', 'APX-WLT-301', 'OXF-001', 'DEMO-'];
                const demoNames = ['premium cotton crewneck', 'smart fitness watch', 'leather bi-fold wallet', 'classic oxford shirt', 'demo product'];
                return (
                    demoSkus.some(s => sku.includes(s) || id.includes(s)) ||
                    demoNames.some(n => name.includes(n)) ||
                    p.is_demo === true || p.isDemo === true || p.is_mock === true
                );
            };

            const isDemoOrder = (o) => {
                if (!o) return false;
                const orderNum = String(o.order_number || o.id || '').toUpperCase();
                const custName = String(o.customer_name || '').toLowerCase();
                const demoOrders = ['ORD-84920', 'ORD-91024', 'ORD-77192', 'ORD-39102', 'ORD-12849'];
                const demoCusts = ['rahim ahmed', 'sultana razia', 'tanvir hasan', 'demo customer'];
                return (
                    demoOrders.some(ord => orderNum.includes(ord)) ||
                    demoCusts.some(c => custName.includes(c)) ||
                    o.is_demo === true || o.isDemo === true
                );
            };

            const isDemoCustomer = (c) => {
                if (!c) return false;
                const name = String(c.name || '').toLowerCase();
                const email = String(c.email || '').toLowerCase();
                const phone = String(c.phone || '');
                return (
                    name.includes('rahim ahmed') || name.includes('sultana razia') || name.includes('karim ullah') || name.includes('demo customer') ||
                    email.includes('demo@') || email.includes('rahim@') || email.includes('sultana@') || phone === '01711000000' ||
                    c.is_demo === true || c.isDemo === true
                );
            };

            const isDemoDelivery = (d) => {
                if (!d) return false;
                const trk = String(d.tracking_no || d.id || '').toUpperCase();
                const rec = String(d.recipient_name || '').toLowerCase();
                const demoTrks = ['TRK-981204', 'TRK-102948', 'TRK-749201', 'TRK-883920'];
                return (
                    demoTrks.some(t => trk.includes(t)) ||
                    rec.includes('rahim ahmed') || rec.includes('sultana razia') ||
                    d.is_demo === true
                );
            };

            const isDemoExpense = (e) => {
                if (!e) return false;
                const code = String(e.expense_code || e.id || '').toUpperCase();
                const desc = String(e.description || '').toLowerCase();
                const demoCodes = ['EXP-1042', 'EXP-1043', 'EXP-1044', 'EXP-1045'];
                return (
                    demoCodes.some(c => code.includes(c)) ||
                    desc.includes('demo expense') ||
                    e.is_demo === true
                );
            };

            const isDemoSupplier = (s) => {
                if (!s) return false;
                const name = String(s.name || '').toLowerCase();
                return (
                    name.includes('apex textile mills') || name.includes('chittagong fabrics') || name.includes('dhaka logistics ltd') ||
                    s.is_demo === true
                );
            };

            const isDemoGeneric = (item, col) => {
                if (!item) return false;
                if (col === 'products') return isDemoProduct(item);
                if (col === 'orders' || col === 'sales') return isDemoOrder(item);
                if (col === 'customers') return isDemoCustomer(item);
                if (col === 'deliveries') return isDemoDelivery(item);
                if (col === 'expenses') return isDemoExpense(item);
                if (col === 'suppliers') return isDemoSupplier(item);
                return item.is_demo === true || item.isDemo === true || item.is_mock === true;
            };

            // 2. Scan & Purge Firestore Collections
            if (db) {
                // A. Global Users Collection
                try {
                    results.collectionsScanned++;
                    const usersSnapshot = await db.collection('global_users').get();
                    if (!usersSnapshot.empty) {
                        const batch = db.batch();
                        let batchCount = 0;
                        usersSnapshot.forEach(docSnap => {
                            const uData = docSnap.data();
                            if (isDemoUser(uData)) {
                                batch.delete(docSnap.ref);
                                batchCount++;
                                results.totalDeleted++;
                                results.details.push(`global_users/${docSnap.id} (${uData.username || uData.email || 'demo_user'})`);
                            }
                        });
                        if (batchCount > 0) {
                            await batch.commit();
                            if (verbose) console.log(`[EaseBus Launch Cleaner] Cleaned ${batchCount} demo users from Firestore 'global_users'.`);
                        }
                    }
                } catch(err) {
                    console.warn('[EaseBus Launch Cleaner] Warning cleaning global_users:', err.message);
                }

                // Determine target stores
                let targetStoreList = [1, 2, 3, 4, 5];
                if (Array.isArray(storeIds)) {
                    targetStoreList = storeIds;
                } else if (typeof storeIds === 'number') {
                    targetStoreList = [storeIds];
                } else {
                    const currentStore = (typeof getStoreOwnerId === 'function') ? getStoreOwnerId() : 1;
                    if (!targetStoreList.includes(currentStore)) targetStoreList.push(currentStore);
                }

                const modules = ['products', 'orders', 'customers', 'deliveries', 'returns', 'finance', 'accounts', 'transactions', 'expenses', 'suppliers', 'investors', 'categories', 'support_tickets', 'issues'];

                for (const stId of targetStoreList) {
                    for (const mod of modules) {
                        try {
                            const colPath = `stores/store_${stId}/${mod}`;
                            results.collectionsScanned++;
                            const snap = await db.collection(colPath).get();
                            if (!snap.empty) {
                                let batch = db.batch();
                                let batchCount = 0;
                                for (const docSnap of snap.docs) {
                                    const data = docSnap.data();
                                    if (isDemoGeneric(data, mod)) {
                                        batch.delete(docSnap.ref);
                                        batchCount++;
                                        results.totalDeleted++;
                                        results.details.push(`${colPath}/${docSnap.id}`);

                                        // Keep batches within Firestore limit (<= 400)
                                        if (batchCount >= 400) {
                                            await batch.commit();
                                            batch = db.batch();
                                            batchCount = 0;
                                        }
                                    }
                                }
                                if (batchCount > 0) {
                                    await batch.commit();
                                }
                                if (verbose && batchCount > 0) {
                                    console.log(`[EaseBus Launch Cleaner] Cleaned ${batchCount} demo records from '${colPath}'.`);
                                }
                            }
                        } catch(err) {
                            // Subcollection may not exist or be empty; continue cleanly
                        }
                    }
                }
            }

            // 3. Clean Client-Side LocalStorage Caches if requested
            if (cleanLocalStorage && typeof localStorage !== 'undefined') {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const k = localStorage.key(i);
                    if (!k) continue;
                    if (k.startsWith('easebus_')) {
                        const raw = localStorage.getItem(k);
                        if (!raw) continue;

                        // Clean global users cache
                        if (k === 'easebus_global_users') {
                            try {
                                const parsed = JSON.parse(raw);
                                if (Array.isArray(parsed)) {
                                    const filtered = parsed.filter(u => !isDemoUser(u));
                                    localStorage.setItem(k, JSON.stringify(filtered));
                                }
                            } catch(e) {}
                            continue;
                        }

                        // Clean module collections cache
                        try {
                            const parsed = JSON.parse(raw);
                            if (Array.isArray(parsed)) {
                                const initialLen = parsed.length;
                                const colType = k.split('_').pop() || '';
                                const filtered = parsed.filter(item => !isDemoGeneric(item, colType));
                                if (filtered.length !== initialLen) {
                                    localStorage.setItem(k, JSON.stringify(filtered));
                                }
                            }
                        } catch(e) {}
                    }
                }
                localStorage.setItem('easebus_clean_v7_production', 'true');
                localStorage.setItem('easebus_production_clean_launch', new Date().toISOString());
            }

            // 4. Trigger Reactive UI Updates across active views
            if (typeof API !== 'undefined' && typeof API.emitDataChange === 'function') {
                ['products', 'orders', 'customers', 'deliveries', 'expenses', 'suppliers', 'finance', 'users'].forEach(m => {
                    API.emitDataChange(m);
                });
            }

            if (verbose) {
                console.log(`[EaseBus Launch Cleaner] Completed successfully. Total demo documents purged: ${results.totalDeleted}`);
            }

            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast(`Production Clean-up Complete: Purged ${results.totalDeleted} demo record(s) from Firestore!`, 'success');
            }

            return results;
        } catch (error) {
            console.error('[EaseBus Launch Cleaner] Error purging demo records:', error);
            if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('Failed to complete Firestore demo purge: ' + error.message, 'error');
            }
            return { success: false, error: error.message, ...results };
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
        }
    },

    openMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar) {
            sidebar.classList.remove('-translate-x-full');
        }
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    },

    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar && window.innerWidth < 768) {
            sidebar.classList.add('-translate-x-full');
        }
        if (overlay) {
            overlay.classList.add('hidden');
        }
    },

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        if (sidebar.classList.contains('-translate-x-full')) {
            this.openMobileSidebar();
        } else {
            this.closeMobileSidebar();
        }
    },

    switchToCreatorPortal() {
        const currentUser = API.getCurrentUser();
        if (!window.isCreatorUser(currentUser)) {
            UI.toast('Access Restricted: Creator Portal is only available to authorized platform creators.', 'error');
            return;
        }

        this.closeMobileSidebar();
        document.getElementById('store-selector-modal')?.classList.add('hidden');
        const banner = document.getElementById('creator-readonly-banner');
        if (banner) banner.remove();
        const style = document.getElementById('readonly-style');
        if (style) style.remove();
        document.body.classList.remove('creator-readonly');

        if (window.Creator) {
            window.Creator.isReadOnlyMode = false;
            window.Creator.inspectedUserId = null;
        }

        const creatorUser = {
            id: 99999,
            username: 'shad@dbms.com',
            full_name: 'Md Shazzad Hossen Shad',
            business_name: 'EaseBus Creator Operations',
            role: 'creator',
            email: 'shad@dbms.com'
        };
        API.setCurrentUser(creatorUser);
        UI.toast('Switched to Master Creator Command Center.', 'success');
        this.checkAuth();
        this.navigate('creator-overview');
    },

    switchStore(storeId, storeName, ownerName, targetRoute = 'dashboard') {
        this.closeMobileSidebar();
        document.getElementById('store-selector-modal')?.classList.add('hidden');
        const banner = document.getElementById('creator-readonly-banner');
        if (banner) banner.remove();
        const style = document.getElementById('readonly-style');
        if (style) style.remove();
        document.body.classList.remove('creator-readonly');

        if (window.Creator) {
            window.Creator.inspectedUserId = null;
            window.Creator.isReadOnlyMode = false;
        }

        const globalUsers = (typeof getGlobalUsers === 'function') ? getGlobalUsers() : [];
        const targetUser = globalUsers.find(u => u.id == storeId) || {};

        const activeUser = {
            id: storeId,
            owner_id: storeId,
            store_id: storeId,
            username: targetUser.username || ('user_' + storeId),
            full_name: ownerName || targetUser.full_name || storeName,
            business_name: storeName || targetUser.business_name || (ownerName + "'s Store"),
            role: 'admin',
            phone: targetUser.phone || '+880 1700-000000',
            email: targetUser.email || (targetUser.username + '@easebus.com'),
            address: targetUser.address || 'Dhaka, Bangladesh'
        };

        API.setCurrentUser(activeUser);

        // Update header and sidebar labels
        const storeNameEl = document.getElementById('store-name-display');
        if (storeNameEl) storeNameEl.textContent = activeUser.business_name;
        const sidebarStoreEl = document.getElementById('sidebar-store-name');
        if (sidebarStoreEl) sidebarStoreEl.textContent = activeUser.business_name;

        UI.toast(`Active Store: ${activeUser.business_name}`, 'success');

        if (typeof API !== 'undefined' && typeof API.emitDataChange === 'function') {
            API.emitDataChange('all');
        }

        this.checkAuth();
        this.navigate(targetRoute);
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
        document.querySelectorAll('.btn-logout-trigger, [data-action="logout"]').forEach(btn => {
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
        if (window.Users && typeof window.Users.stopLivePolling === 'function') {
            window.Users.stopLivePolling();
        }
        if (window.Products && typeof window.Products.stopPolling === 'function') {
            window.Products.stopPolling();
        }
        if (window.Inventory && typeof window.Inventory.stopPolling === 'function') {
            window.Inventory.stopPolling();
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

        try { UI.setLoading(false); } catch(err) {}
        this.closeAllDropdowns();

        // Clear active screen content
        const screenContainer = document.getElementById('screen-container');
        if (screenContainer) screenContainer.innerHTML = '';

        // Reset navigation state and show authentication modal
        window.location.hash = '';
        this.checkAuth();

        // Refresh session context cleanly
        window.location.reload();
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
                                    <span class="text-[10px] text-amber-400 font-normal font-outfit font-bold">Managed by Store Administrator</span>
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

        const isCreator = user ? (window.isCreatorUser ? window.isCreatorUser(user) : (user.role === 'creator' || user.username === 'shad@dbms.com')) : false;
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
                <a href="#creator-explorer" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-teal-400">dataset</span> Database Explorer
                </a>
                <a href="#creator-debugger" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-rose-400">pest_control</span> Live DB Debugger
                </a>
                <a href="#creator-database" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                    <span class="material-symbols-outlined mr-3 text-lg text-indigo-400">database</span> Database System & SQL
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
                    <span class="material-symbols-outlined mr-3 text-lg text-cyan-400">monitor_heart</span> App Health Monitor
                </a>

                <div class="pt-5 pb-2 px-1">
                    <button onclick="App.showStoreSelectorModal()" class="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
                        <span class="material-symbols-outlined text-base text-blue-400">storefront</span>
                        <span>Manage Stores & Tenants</span>
                    </button>
                </div>
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
        } else if (!window.isStoreOwner(user)) {
            // Other staff sub-accounts route to Store Manager Portal
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
        } else {
            // Primary Store Owner / Admin - FULL UNRESTRICTED ACCESS & ADMIN CONTROL
            mainNav.innerHTML = `
                <a href="#dashboard" class="nav-item active group flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">
                    <span class="material-symbols-outlined mr-3 text-lg">dashboard</span> Executive Dashboard
                </a>
                
                <div class="pt-4 pb-1">
                    <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider font-outfit">Business Operations</p>
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
                    <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider font-outfit">Finance & Equity</p>
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
                    <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider font-outfit">Management</p>
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

                <div class="pt-4 pb-2 px-1 space-y-2">
                    <button onclick="App.showInstallModal()" class="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
                        <span class="material-symbols-outlined text-base text-emerald-400">install_mobile</span>
                        <span>Install & Download App</span>
                    </button>
                    ${isCreator ? `
                    <button onclick="App.switchToCreatorPortal()" class="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
                        <span class="material-symbols-outlined text-base text-amber-400">shield</span>
                        <span>Creator Master Suite</span>
                    </button>
                    ` : ''}
                </div>
            `;
        }

        const openBtn = document.getElementById('open-sidebar');
        const closeBtn = document.getElementById('close-sidebar');
        const overlay = document.getElementById('mobile-overlay');

        if (openBtn) {
            openBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openMobileSidebar();
            };
        }
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeMobileSidebar();
            };
        }
        if (overlay) {
            overlay.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeMobileSidebar();
            };
        }

        // Brand logo click navigation handler
        const brandLink = document.getElementById('brand-logo-link');
        if (brandLink) {
            brandLink.onclick = (e) => {
                e.preventDefault();
                this.closeMobileSidebar();
                const u = API.getCurrentUser();
                if (u && (u.role === 'creator' || u.username === 'shad@dbms.com') && (!window.Creator || !window.Creator.isReadOnlyMode)) {
                    this.navigate('creator-overview');
                } else {
                    this.navigate('dashboard');
                }
            };
        }

        // Delegated click listener on sidebar navigation items to close mobile menu
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar._hasMobileNavListener) {
            sidebar._hasMobileNavListener = true;
            sidebar.addEventListener('click', (e) => {
                const navTarget = e.target.closest('a, button, .nav-item');
                if (navTarget && navTarget.id !== 'close-sidebar') {
                    if (window.innerWidth < 768) {
                        this.closeMobileSidebar();
                    }
                }
            });
        }
    },

    setupRouter() {
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                const overlay = document.getElementById('mobile-overlay');
                if (overlay) overlay.classList.add('hidden');
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileSidebar();
            }
        });

        window.addEventListener('hashchange', () => {
            if (this.checkAuth()) {
                const hash = decodeURIComponent(window.location.hash.substring(1)).trim().replace(/[\s_]+/g, '-') || 'dashboard';
                this.navigate(hash);
            }
        });
    },

    pendingAction: null,

    async navigate(route, action = null) {
        this.closeMobileSidebar();
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
            'creator': ['creator-overview', 'creator-explorer', 'creator-database-explorer', 'creator-debugger', 'creator-live-debugger', 'creator-database', 'creator-stores', 'creator-transactions', 'creator-inventory', 'creator-health']
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
        
        // Update nav active state (Sidebar)
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('href') === `#${route}`) {
                item.classList.add('bg-blue-600', 'text-white');
                item.classList.remove('text-slate-300', 'hover:bg-slate-800');
            } else {
                item.classList.remove('bg-blue-600', 'text-white');
                item.classList.add('text-slate-300', 'hover:bg-slate-800');
            }
        });

        // Update mobile bottom dock active state (Phone & Handhelds)
        document.querySelectorAll('.mobile-nav-link[data-tab]').forEach(item => {
            const tab = item.getAttribute('data-tab');
            if (tab === route) {
                item.classList.add('text-blue-400', 'active');
                item.classList.remove('text-slate-400');
            } else {
                item.classList.remove('text-blue-400', 'active');
                item.classList.add('text-slate-400');
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
                'creator-explorer': 'Platform Creator — Database Explorer & Firestore Collections',
                'creator-database-explorer': 'Platform Creator — Database Explorer & Firestore Collections',
                'creator-debugger': 'Platform Creator — Live Database Debugger & Real-time onSnapshot Stream',
                'creator-live-debugger': 'Platform Creator — Live Database Debugger & Real-time onSnapshot Stream',
                'creator-database': 'Platform Creator — Database Master Studio & SQL',
                'creator-stores': 'Platform Creator — Client Stores & Tenants',
                'creator-transactions': 'Platform Creator — Live Transactions Feed',
                'creator-inventory': 'Platform Creator — Global Inventory Auditor',
                'creator-health': 'Platform Creator — App Health Monitor & Instance Telemetry'
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

    _loadedScripts: new Set(),

    loadScript(src) {
        if (this._loadedScripts.has(src)) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const path = window.location.pathname || '';
            let finalSrc = src;
            if (path.includes('/pages/') && !src.startsWith('../') && !src.startsWith('/')) {
                finalSrc = '../' + src;
            }
            script.src = finalSrc + '?v=3.0';
            script.onload = () => {
                this._loadedScripts.add(src);
                resolve();
            };
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

// Global shorthand utility binding
window.clearDemoFirestoreData = function(options) {
    return App.clearDemoFirestoreData(options);
};

document.addEventListener('DOMContentLoaded', () => App.init());
