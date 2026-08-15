/**
 * BusinessM — Customers UI Module
 */

window.Customers = {
    async render(container) {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-semibold text-slate-900">Customers</h1>
                    <p class="text-slate-500 mt-1">Manage your customer database and purchase history.</p>
                </div>
                <button class="btn btn-primary" onclick="Customers.showModal()">
                    <span class="material-symbols-outlined mr-2 text-sm">person_add</span> Add Customer
                </button>
            </div>
            
            <div class="card">
                <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div class="relative w-64">
                        <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                        <input type="text" id="cust-search" placeholder="Search customers..." class="form-input pl-9" onkeyup="Customers.debounceSearch()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="data-table" id="cust-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Contact Info</th>
                                <th>Address</th>
                                <th>Total Orders</th>
                                <th>Purchased Value</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="cust-list">
                            <tr><td colspan="6" class="text-center py-8 text-slate-500">Loading customers...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="cust-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;
        
        await this.loadCustomers();
    },
    
    searchTimeout: null,
    
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadCustomers(), 500);
    },
    
    async loadCustomers() {
        const search = document.getElementById('cust-search')?.value || '';
        const tbody = document.getElementById('cust-list');
        if (!tbody) return;
        
        try {
            const res = await API.get(`customers/list?search=${encodeURIComponent(search)}`);
            
            if (res.data.customers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-500">No customers found.</td></tr>`;
                return;
            }
            
            // Store globally for edit modal
            this.customersData = res.data.customers;
            
            tbody.innerHTML = res.data.customers.map(c => `
                <tr>
                    <td class="font-medium text-slate-900">${c.name}</td>
                    <td>
                        <div class="text-sm">${c.phone || '-'}</div>
                        <div class="text-xs text-slate-500">${c.email || '-'}</div>
                    </td>
                    <td class="text-sm max-w-xs truncate" title="${c.address}">${c.address || '-'}</td>
                    <td class="data-number">${c.total_orders}</td>
                    <td class="data-number text-blue-600 font-medium">${UI.formatMoney(c.total_purchased)}</td>
                    <td class="text-right">
                        <button class="text-slate-600 hover:text-slate-800" onclick="Customers.showModal(${c.id})">Edit</button>
                    </td>
                </tr>
            `).join('');
            
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">Failed to load customers.</td></tr>`;
            UI.toast(e.message, 'error');
        }
    },

    showModal(id = null) {
        let cust = null;
        if (id) {
            cust = this.customersData?.find(c => c.id === id);
            if (!cust) return;
        }

        const modal = document.getElementById('cust-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 class="font-geist font-semibold text-lg">${id ? 'Edit Customer' : 'Add Customer'}</h3>
                    <button class="text-slate-400 hover:text-slate-600" onclick="document.getElementById('cust-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <form id="cust-form" class="space-y-4">
                        <input type="hidden" name="id" value="${id || ''}">
                        
                        <div>
                            <label class="form-label">Full Name *</label>
                            <input type="text" name="name" class="form-input" value="${cust?.name || ''}" required>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Phone *</label>
                                <input type="text" name="phone" class="form-input" value="${cust?.phone || ''}" required>
                            </div>
                            <div>
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-input" value="${cust?.email || ''}">
                            </div>
                        </div>
                        
                        <div>
                            <label class="form-label">Address</label>
                            <textarea name="address" class="form-input h-20">${cust?.address || ''}</textarea>
                        </div>
                        
                        <div>
                            <label class="form-label">Notes</label>
                            <input type="text" name="notes" class="form-input" value="${cust?.notes || ''}">
                        </div>
                        
                        <div class="pt-4 flex justify-end gap-3 mt-6">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('cust-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="save-cust-btn">Save Customer</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        
        document.getElementById('cust-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('save-cust-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';
            
            const payload = {
                name: form.name.value,
                phone: form.phone.value,
                email: form.email.value,
                address: form.address.value,
                notes: form.notes.value
            };

            if (form.id.value) payload.id = form.id.value;
            
            try {
                if (payload.id) {
                    await API.put('customers/update', payload);
                } else {
                    await API.post('customers/create', payload);
                }
                
                modal.classList.add('hidden');
                UI.toast('Customer saved successfully');
                this.loadCustomers();
            } catch (err) {
                UI.toast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Save Customer';
            }
        });
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'customers') {
    window.Customers.render(document.getElementById('screen-container'));
}
