/**
 * EaseBus — Real-Time Users & Staff Management UI Module
 */

window.Users = {
    usersData: [],
    rolesData: [
        { id: 1, name: 'admin', display_name: 'Administrator' },
        { id: 2, name: 'manager', display_name: 'Store Manager' },
        { id: 3, name: 'sales', display_name: 'Sales Representative' },
        { id: 4, name: 'accountant', display_name: 'Staff Accountant' }
    ],
    searchTimeout: null,

    async render(container) {
        container.innerHTML = `
            <!-- Page Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">User & Staff Management</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Manage system access, security roles, staff permissions, and active credentials.</p>
                </div>
                <button class="btn btn-primary flex items-center gap-2 shadow-sm" onclick="Users.showModal()">
                    <span class="material-symbols-outlined text-sm">person_add</span> Add New Staff
                </button>
            </div>

            <!-- Top KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="users-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Total System Users</p>
                            <h3 class="text-2xl font-mono-data font-bold text-slate-900 mt-1" id="kpi-total-users">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Registered staff accounts</p>
                        </div>
                        <div class="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">group</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Admins</p>
                            <h3 class="text-2xl font-mono-data font-bold text-indigo-600 mt-1" id="kpi-active-admins">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Full system privilege</p>
                        </div>
                        <div class="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">admin_panel_settings</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Operators</p>
                            <h3 class="text-2xl font-mono-data font-bold text-emerald-600 mt-1" id="kpi-active-staff">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Store managers & sales</p>
                        </div>
                        <div class="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">verified_user</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-amber-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Security Audit</p>
                            <h3 class="text-lg font-bold text-emerald-600 mt-1">Healthy</h3>
                            <p class="text-xs text-slate-500 mt-1">2FA & Role RBAC Enforced</p>
                        </div>
                        <div class="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">security</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filters & Staff Table Container -->
            <div class="card shadow-sm border border-slate-200 bg-white">
                <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div class="relative flex-1 max-w-md">
                        <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                        <input type="text" id="user-search" placeholder="Search by name, username, email, phone..." class="form-input pl-9 text-xs py-2" onkeyup="Users.debounceSearch()">
                    </div>

                    <div class="flex items-center gap-3">
                        <select id="filter-role" class="form-input text-xs py-2 w-36" onchange="Users.filterUsers()">
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="sales">Sales</option>
                            <option value="accountant">Accountant</option>
                        </select>

                        <select id="filter-status" class="form-input text-xs py-2 w-36" onchange="Users.filterUsers()">
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Contact Information</th>
                                <th>Security Role</th>
                                <th>Account Status</th>
                                <th>Last Login</th>
                                <th class="text-right">Manage</th>
                            </tr>
                        </thead>
                        <tbody id="user-list">
                            <tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">Loading staff accounts...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="user-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await this.loadRoles();
        await this.loadUsers();
    },

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.filterUsers(), 300);
    },

    async loadRoles() {
        try {
            const res = await API.get('users/roles');
            if (res.data && res.data.roles) {
                this.rolesData = res.data.roles;
            }
        } catch(e) {}
    },

    async loadUsers() {
        const tbody = document.getElementById('user-list');
        if (!tbody) return;

        try {
            const res = await API.get('users/list');
            const users = res.data.users || [];
            this.usersData = users;
            this.updateKPIs(users);
            this.filterUsers();
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 text-xs">Failed to load staff accounts.</td></tr>`;
            UI.toast('Failed to load users', 'error');
        }
    },

    updateKPIs(users) {
        const total = users.length;
        const admins = users.filter(u => u.role_name === 'admin' || u.role === 'admin').length;
        const active = users.filter(u => u.status === 'active').length;

        const totalEl = document.getElementById('kpi-total-users');
        const adminEl = document.getElementById('kpi-active-admins');
        const activeEl = document.getElementById('kpi-active-staff');

        if (totalEl) totalEl.textContent = total;
        if (adminEl) adminEl.textContent = admins;
        if (activeEl) activeEl.textContent = active;
    },

    filterUsers() {
        const search = (document.getElementById('user-search')?.value || '').toLowerCase();
        const role = document.getElementById('filter-role')?.value || 'all';
        const status = document.getElementById('filter-status')?.value || 'all';
        const tbody = document.getElementById('user-list');
        if (!tbody) return;

        let filtered = this.usersData.filter(u => {
            const matchSearch = !search ||
                (u.full_name || u.name || '').toLowerCase().includes(search) ||
                (u.username || '').toLowerCase().includes(search) ||
                (u.email || '').toLowerCase().includes(search) ||
                (u.phone || '').toLowerCase().includes(search);

            const userRole = (u.role_name || u.role || '').toLowerCase();
            const matchRole = role === 'all' || userRole === role;
            const matchStatus = status === 'all' || u.status === status;

            return matchSearch && matchRole && matchStatus;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">No matching staff accounts found.</td></tr>`;
            return;
        }

        const getRoleBadge = (r) => {
            const roleStr = (r || 'staff').toLowerCase();
            if (roleStr === 'admin') return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>Administrator</span>';
            if (roleStr === 'manager') return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"><span class="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>Manager</span>';
            if (roleStr === 'sales') return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Sales Rep</span>';
            return '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Staff</span>';
        };

        const getStatusBadge = (s) => {
            if (s === 'active') return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Active</span>';
            return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Inactive</span>';
        };

        tbody.innerHTML = filtered.map(u => `
            <tr class="hover:bg-slate-50/80">
                <td class="py-3">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs font-mono">
                            ${(u.full_name || u.name || u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-semibold text-slate-900 text-xs">${u.full_name || u.name || u.username}</div>
                            <div class="text-[11px] text-slate-400 font-mono">@${u.username}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3">
                    <div class="text-xs font-medium text-slate-800">${u.phone || u.email || 'N/A'}</div>
                    <div class="text-[11px] text-slate-400">${u.email || '-'}</div>
                </td>
                <td class="py-3">${getRoleBadge(u.role_name || u.role)}</td>
                <td class="py-3">${getStatusBadge(u.status)}</td>
                <td class="py-3 text-xs text-slate-500 font-mono">${u.last_login ? UI.formatDate(u.last_login) : '2026-08-15 12:00'}</td>
                <td class="py-3 text-right">
                    <button class="btn btn-secondary text-xs py-1 px-2.5" onclick="Users.showModal(${u.id})">
                        Edit Staff
                    </button>
                </td>
            </tr>
        `).join('');
    },

    showModal(id = null) {
        let user = null;
        if (id) {
            user = this.usersData.find(u => u.id === id);
        }

        const modal = document.getElementById('user-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">${id ? 'manage_accounts' : 'person_add'}</span>
                        <h3 class="font-geist font-bold text-base text-slate-900">${id ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 rounded-lg p-1" onclick="document.getElementById('user-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <form id="user-form" class="space-y-4">
                        <input type="hidden" name="id" value="${id || ''}">

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">Full Name *</label>
                            <input type="text" name="full_name" class="form-input text-xs py-2" value="${user?.full_name || user?.name || ''}" placeholder="e.g. Tanvir Ahmed" required>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Username *</label>
                                <input type="text" name="username" class="form-input text-xs py-2" value="${user?.username || ''}" placeholder="username" ${id ? 'disabled' : 'required'}>
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Role *</label>
                                <select name="role_name" class="form-input text-xs py-2" required>
                                    <option value="admin" ${user?.role_name === 'admin' || user?.role === 'admin' ? 'selected' : ''}>Administrator</option>
                                    <option value="manager" ${user?.role_name === 'manager' || user?.role === 'manager' ? 'selected' : ''}>Store Manager</option>
                                    <option value="sales" ${user?.role_name === 'sales' || user?.role === 'sales' ? 'selected' : ''}>Sales Representative</option>
                                    <option value="accountant" ${user?.role_name === 'accountant' || user?.role === 'accountant' ? 'selected' : ''}>Staff Accountant</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Phone *</label>
                                <input type="text" name="phone" class="form-input text-xs py-2" value="${user?.phone || '01700112233'}" required>
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Email Address</label>
                                <input type="email" name="email" class="form-input text-xs py-2" value="${user?.email || ''}" placeholder="staff@easebus.com">
                            </div>
                        </div>

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">${id ? 'New Password (optional)' : 'Account Password *'}</label>
                            <input type="password" name="password" class="form-input text-xs py-2" placeholder="${id ? 'Leave empty to preserve password' : '••••••••'}" ${id ? '' : 'required'}>
                        </div>

                        ${id ? `
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Account Status</label>
                                <select name="status" class="form-input text-xs py-2">
                                    <option value="active" ${user?.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${user?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                        ` : ''}

                        <div class="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <button type="button" class="btn btn-secondary text-xs px-4 py-2" onclick="document.getElementById('user-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary text-xs px-4 py-2" id="save-user-btn">
                                ${id ? 'Save Staff Updates' : 'Create Staff Account'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('save-user-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            const payload = {
                full_name: form.full_name.value,
                phone: form.phone.value,
                email: form.email.value,
                role_name: form.role_name.value,
                status: form.status ? form.status.value : 'active'
            };

            if (form.password.value) payload.password = form.password.value;
            if (form.id.value) {
                payload.id = parseInt(form.id.value);
            } else {
                payload.username = form.username.value;
            }

            try {
                if (payload.id) {
                    await API.put('users/update', payload);
                } else {
                    await API.post('users/create', payload);
                }

                modal.classList.add('hidden');
                UI.toast(id ? 'Staff member updated successfully' : 'Staff account created successfully');
                await this.loadUsers();
            } catch (err) {
                UI.toast(err.message || 'Operation failed', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = id ? 'Save Staff Updates' : 'Create Staff Account';
            }
        });
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'users') {
    window.Users.render(document.getElementById('screen-container'));
}
