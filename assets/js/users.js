/**
 * BusinessM — Users & Staff Management UI Module
 */

window.Users = {
    async render(container) {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-semibold text-slate-900">Users & Staff Management</h1>
                    <p class="text-slate-500 mt-1">Manage system accounts, user roles, and access permissions.</p>
                </div>
                <button class="btn btn-primary" onclick="Users.showModal()">
                    <span class="material-symbols-outlined mr-2 text-sm">person_add</span> Add User
                </button>
            </div>
            
            <div class="card">
                <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div class="relative w-64">
                        <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                        <input type="text" id="user-search" placeholder="Search users..." class="form-input pl-9" onkeyup="Users.debounceSearch()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="data-table" id="user-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Contact Info</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Last Login</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="user-list">
                            <tr><td colspan="6" class="text-center py-8 text-slate-500">Loading users...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="user-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;
        
        await this.loadUsers();
        await this.loadRoles();
    },
    
    searchTimeout: null,
    rolesData: [],
    usersData: [],
    
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadUsers(), 400);
    },
    
    async loadRoles() {
        try {
            const res = await API.get('users/roles');
            this.rolesData = res.data.roles || [];
        } catch(e) {
            this.rolesData = [];
        }
    },
    
    async loadUsers() {
        const search = document.getElementById('user-search')?.value || '';
        const tbody = document.getElementById('user-list');
        if (!tbody) return;
        
        try {
            const res = await API.get(`users/list?search=${encodeURIComponent(search)}`);
            const users = res.data.users || [];
            
            if (users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-500">No users found.</td></tr>`;
                return;
            }
            
            this.usersData = users;
            
            tbody.innerHTML = users.map(u => {
                const statusBadge = u.status === 'active' 
                    ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>'
                    : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>';
                
                return `
                    <tr>
                        <td>
                            <div class="font-medium text-slate-900">${u.full_name || u.username}</div>
                            <div class="text-xs text-slate-500">@${u.username}</div>
                        </td>
                        <td>
                            <div class="text-sm">${u.phone || '-'}</div>
                            <div class="text-xs text-slate-500">${u.email || '-'}</div>
                        </td>
                        <td>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                                ${u.role_name || 'Staff'}
                            </span>
                        </td>
                        <td>${statusBadge}</td>
                        <td class="text-sm text-slate-500">${u.last_login_at ? UI.formatDate(u.last_login_at) : 'Never'}</td>
                        <td class="text-right">
                            <button class="text-blue-600 hover:text-blue-800 text-sm font-medium" onclick="Users.showModal(${u.id})">Edit</button>
                        </td>
                    </tr>
                `;
            }).join('');
            
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">Failed to load users.</td></tr>`;
            UI.toast(e.message, 'error');
        }
    },

    async showModal(id = null) {
        let user = null;
        if (id) {
            user = this.usersData?.find(u => u.id === id);
            if (!user) return;
        }

        if (!this.rolesData || this.rolesData.length === 0) {
            await this.loadRoles();
        }

        const modal = document.getElementById('user-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 class="font-geist font-semibold text-lg">${id ? 'Edit User' : 'Add New User'}</h3>
                    <button class="text-slate-400 hover:text-slate-600" onclick="document.getElementById('user-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <form id="user-form" class="space-y-4">
                        <input type="hidden" name="id" value="${id || ''}">
                        
                        <div>
                            <label class="form-label">Full Name *</label>
                            <input type="text" name="full_name" class="form-input" value="${user?.full_name || ''}" required>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Username *</label>
                                <input type="text" name="username" class="form-input" value="${user?.username || ''}" ${id ? 'disabled' : 'required'}>
                            </div>
                            <div>
                                <label class="form-label">Role *</label>
                                <select name="role_id" class="form-input" required>
                                    ${this.rolesData.map(r => `
                                        <option value="${r.id}" ${user && user.role_name === r.name ? 'selected' : ''}>
                                            ${r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Phone *</label>
                                <input type="text" name="phone" class="form-input" value="${user?.phone || ''}" required>
                            </div>
                            <div>
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-input" value="${user?.email || ''}">
                            </div>
                        </div>

                        <div>
                            <label class="form-label">${id ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                            <input type="password" name="password" class="form-input" ${id ? '' : 'required'}>
                        </div>
                        
                        ${id ? `
                            <div>
                                <label class="form-label">Account Status</label>
                                <select name="status" class="form-input">
                                    <option value="active" ${user?.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${user?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="locked" ${user?.status === 'locked' ? 'selected' : ''}>Locked</option>
                                </select>
                            </div>
                        ` : ''}
                        
                        <div class="pt-4 flex justify-end gap-3 mt-6">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('user-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="save-user-btn">Save User</button>
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
                role_id: form.role_id.value
            };

            if (form.password.value) {
                payload.password = form.password.value;
            }

            if (form.id.value) {
                payload.id = form.id.value;
                payload.status = form.status.value;
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
                UI.toast('User saved successfully');
                this.loadUsers();
            } catch (err) {
                UI.toast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Save User';
            }
        });
    }
};
