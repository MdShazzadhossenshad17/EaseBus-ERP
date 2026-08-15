/**
 * BusinessM — Investors UI Module
 */

window.Investors = {
    async render(container) {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-semibold text-slate-900">Investors</h1>
                    <p class="text-slate-500 mt-1">Manage shareholders, capital investments, and profit distributions.</p>
                </div>
                <button class="btn btn-primary" onclick="Investors.showModal()">
                    <span class="material-symbols-outlined mr-2 text-sm">person_add</span> Add Investor
                </button>
            </div>
            
            <div class="card">
                <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div class="relative w-64">
                        <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                        <input type="text" id="invst-search" placeholder="Search investors..." class="form-input pl-9" onkeyup="Investors.debounceSearch()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="data-table" id="invst-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Contact</th>
                                <th>Ownership</th>
                                <th>Profit Share</th>
                                <th>Total Invested</th>
                                <th>Total Distributed</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="invst-list">
                            <tr><td colspan="7" class="text-center py-8 text-slate-500">Loading investors...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Investor Modal Container -->
            <div id="invst-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
            
            <!-- Transaction Modal Container -->
            <div id="txn-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;
        
        await this.loadInvestors();
    },
    
    searchTimeout: null,
    
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadInvestors(), 500);
    },
    
    async loadInvestors() {
        const search = document.getElementById('invst-search')?.value || '';
        const tbody = document.getElementById('invst-list');
        if (!tbody) return;
        
        try {
            const res = await API.get(`investors/list?search=${encodeURIComponent(search)}`);
            
            if (res.data.investors.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500">No investors found.</td></tr>`;
                return;
            }
            
            this.investorsData = res.data.investors;
            
            tbody.innerHTML = res.data.investors.map(i => `
                <tr>
                    <td class="font-medium text-slate-900">${i.name}</td>
                    <td>
                        <div class="text-sm">${i.phone || '-'}</div>
                        <div class="text-xs text-slate-500">${i.email || '-'}</div>
                    </td>
                    <td class="font-mono-data">${i.ownership_percentage ? i.ownership_percentage + '%' : '-'}</td>
                    <td class="font-mono-data text-blue-600">${i.profit_share_percentage ? i.profit_share_percentage + '%' : '-'}</td>
                    <td class="data-number positive">${UI.formatMoney(i.total_invested || 0)}</td>
                    <td class="data-number negative">${UI.formatMoney(i.total_profit || 0)}</td>
                    <td class="text-right">
                        <button class="btn btn-secondary text-xs py-1 px-2" onclick="Investors.showTxnModal(${i.id}, '${i.name}')">Record Txn</button>
                    </td>
                </tr>
            `).join('');
            
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500">Failed to load investors.</td></tr>`;
            UI.toast(e.message, 'error');
        }
    },

    showModal() {
        const modal = document.getElementById('invst-modal');
        const today = new Date().toISOString().split('T')[0];
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 class="font-geist font-semibold text-lg">Add New Investor</h3>
                    <button class="text-slate-400 hover:text-slate-600" onclick="document.getElementById('invst-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <form id="invst-form" class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Full Name *</label>
                                <input type="text" name="name" class="form-input" required>
                            </div>
                            <div>
                                <label class="form-label">Phone *</label>
                                <input type="text" name="phone" class="form-input" required>
                            </div>
                        </div>
                        
                        <div>
                            <label class="form-label">Email</label>
                            <input type="email" name="email" class="form-input">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Ownership (%)</label>
                                <input type="number" step="0.01" max="100" name="ownership_percentage" class="form-input">
                            </div>
                            <div>
                                <label class="form-label">Profit Share (%)</label>
                                <input type="number" step="0.01" max="100" name="profit_share_percentage" class="form-input">
                            </div>
                        </div>
                        
                        <div class="p-4 bg-blue-50 border border-blue-100 rounded mt-2">
                            <h4 class="font-medium text-sm text-blue-900 mb-2">Initial Capital</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="form-label text-blue-800">Investment Date *</label>
                                    <input type="date" name="investment_date" class="form-input" value="${today}" required>
                                </div>
                                <div>
                                    <label class="form-label text-blue-800">Amount Invested</label>
                                    <input type="number" step="0.01" name="initial_investment" class="form-input" placeholder="0.00">
                                </div>
                            </div>
                        </div>
                        
                        <div class="pt-4 flex justify-end gap-3 mt-6 border-t border-slate-200">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('invst-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="save-invst-btn">Save Investor</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        
        document.getElementById('invst-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('save-invst-btn');
            
            btn.disabled = true;
            btn.textContent = 'Saving...';
            
            try {
                await API.post('investors/create', {
                    name: form.name.value,
                    phone: form.phone.value,
                    email: form.email.value,
                    ownership_percentage: form.ownership_percentage.value,
                    profit_share_percentage: form.profit_share_percentage.value,
                    investment_date: form.investment_date.value,
                    initial_investment: form.initial_investment.value
                });
                
                modal.classList.add('hidden');
                UI.toast('Investor added successfully');
                this.loadInvestors();
            } catch (err) {
                UI.toast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Save Investor';
            }
        });
    },

    showTxnModal(investorId, investorName) {
        const modal = document.getElementById('txn-modal');
        const today = new Date().toISOString().split('T')[0];
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 class="font-geist font-semibold text-lg">Record Transaction</h3>
                    <button class="text-slate-400 hover:text-slate-600" onclick="document.getElementById('txn-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <div class="mb-4 text-sm font-medium text-slate-700">Investor: <span class="text-slate-900">${investorName}</span></div>
                    
                    <form id="txn-form" class="space-y-4">
                        <input type="hidden" name="investor_id" value="${investorId}">
                        
                        <div>
                            <label class="form-label">Transaction Type *</label>
                            <select name="type" class="form-input" required>
                                <option value="additional_investment">Additional Investment (Capital In)</option>
                                <option value="withdrawal">Capital Withdrawal (Capital Out)</option>
                                <option value="profit_distribution">Profit Distribution (Dividend Out)</option>
                            </select>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label">Date *</label>
                                <input type="date" name="transaction_date" class="form-input" value="${today}" required>
                            </div>
                            <div>
                                <label class="form-label">Amount *</label>
                                <input type="number" step="0.01" min="0.01" name="amount" class="form-input" required>
                            </div>
                        </div>
                        
                        <div>
                            <label class="form-label">Description</label>
                            <input type="text" name="description" class="form-input" placeholder="e.g. Q3 Profit Share">
                        </div>
                        
                        <div class="pt-4 flex justify-end gap-3 mt-6 border-t border-slate-200">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('txn-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="save-txn-btn">Record Transaction</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        
        document.getElementById('txn-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('save-txn-btn');
            
            btn.disabled = true;
            btn.textContent = 'Saving...';
            
            try {
                await API.post('investors/transaction', {
                    investor_id: form.investor_id.value,
                    type: form.type.value,
                    transaction_date: form.transaction_date.value,
                    amount: form.amount.value,
                    description: form.description.value
                });
                
                modal.classList.add('hidden');
                UI.toast('Transaction recorded successfully');
                this.loadInvestors();
            } catch (err) {
                UI.toast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Record Transaction';
            }
        });
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'investors') {
    window.Investors.render(document.getElementById('screen-container'));
}
