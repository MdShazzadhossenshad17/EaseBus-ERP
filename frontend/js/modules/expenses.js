/**
 * EaseBus — Expenses UI Module
 */

window.Expenses = {
    categories: [],
    accounts: [],

    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Expenses Management</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Record, organize, and monitor operational spending and business cash outflows.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-secondary flex items-center gap-1 text-xs" onclick="Expenses.loadSummary(); Expenses.loadExpenses();">
                        <span class="material-symbols-outlined text-sm">refresh</span> Refresh
                    </button>
                    <button class="btn btn-primary flex items-center gap-1 text-xs" onclick="Expenses.showModal()">
                        <span class="material-symbols-outlined text-sm">receipt_long</span> Record Expense
                    </button>
                </div>
            </div>

            <!-- KPI Cards Header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="exp-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-red-500 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-slate-700 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-purple-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
            </div>

            <!-- Expenses Table Card -->
            <div class="card shadow-sm border-slate-200">
                <div class="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50/70 gap-4">
                    <div class="flex items-center gap-3 flex-wrap">
                        <div class="relative w-64">
                            <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                            <input type="text" id="exp-search" placeholder="Search description, receipt, category..." class="form-input text-xs py-1.5 pl-9 pr-3 rounded border-slate-300" onkeyup="Expenses.debounceSearch()">
                        </div>

                        <!-- Category Write System for Filtering -->
                        <div class="flex items-center gap-1">
                            <input type="text" id="exp-cat-write" placeholder="Write category to filter..." class="form-input text-xs py-1.5 px-3 rounded border-slate-300 w-44" onkeyup="Expenses.debounceSearch()">
                            <select id="pick-cat-filter-dropdown" class="form-input text-xs py-1.5 px-2 rounded border-slate-300 w-36 bg-white" onchange="Expenses.fillFilterCategory(this.value)">
                                <option value="">Or Pick Category...</option>
                            </select>
                            <button type="button" class="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 font-semibold" title="Add New Category" onclick="Expenses.showNewCategoryModal()">
                                <span class="material-symbols-outlined text-xs">add</span> Category
                            </button>
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Category</th>
                                <th>Description & Receipt Ref</th>
                                <th>Paid From Account</th>
                                <th class="text-right">Expense Amount</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="exp-list">
                            <tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">Loading expenses...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="exp-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await Promise.all([
            this.loadSummary(),
            this.loadMetadata(),
            this.loadExpenses()
        ]);
    },

    expensesList: [],

    searchTimeout: null,
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadExpenses(), 400);
    },

    async loadSummary() {
        try {
            const res = await API.get('expenses/summary');
            const s = res.data.summary;
            const container = document.getElementById('exp-kpi-container');
            if (!container) return;

            container.innerHTML = `
                <div class="card p-5 bg-white border-l-4 border-red-500 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Monthly Expenses</p>
                    <h3 class="text-2xl font-mono-data font-bold text-red-600">-${UI.formatMoney(s.monthly_expenses, false)}</h3>
                    <p class="text-xs text-slate-500 mt-1">Expenses incurred this month</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-slate-700 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Expenses</p>
                    <h3 class="text-2xl font-mono-data font-bold text-slate-900">${UI.formatMoney(s.total_expenses)}</h3>
                    <p class="text-xs text-slate-500 mt-1">All-time total expenditure</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-purple-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Top Category</p>
                    <h3 class="text-2xl font-geist font-bold text-purple-700 truncate">${s.top_category_name}</h3>
                    <p class="text-xs text-slate-500 mt-1">Highest spending category</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Avg Expense Voucher</p>
                    <h3 class="text-2xl font-mono-data font-bold text-blue-700">${UI.formatMoney(s.avg_expense)}</h3>
                    <p class="text-xs text-slate-500 mt-1">Average per expense entry</p>
                </div>
            `;
        } catch (e) {
            console.error('Failed to load expense summary', e);
        }
    },

    async loadMetadata() {
        try {
            const [catRes, accRes] = await Promise.all([
                API.get('expenses/categories'),
                API.get('finance/accounts')
            ]);
            this.categories = catRes.data.categories || [];
            this.accounts = accRes.data.accounts || [];

            // Populate category helper dropdown
            const filterSel = document.getElementById('pick-cat-filter-dropdown');
            if (filterSel) {
                filterSel.innerHTML = `<option value="">Or Pick Category...</option>` +
                    this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }
        } catch (e) {
            console.error('Failed to load expense metadata', e);
        }
    },

    fillFilterCategory(catId) {
        const input = document.getElementById('exp-cat-write');
        if (!input) return;
        if (!catId) {
            input.value = '';
        } else {
            const c = this.categories.find(item => item.id == catId);
            if (c) input.value = c.name || '';
        }
        this.loadExpenses();
    },

    showNewCategoryModal() {
        const modal = document.getElementById('exp-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-purple-600">category</span>
                        <h3 class="font-geist font-semibold text-base text-slate-900">Add Expense Category</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('exp-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <form id="new-cat-form" class="p-6 space-y-4">
                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Category Name (Write Directly) *</label>
                        <input type="text" name="name" class="form-input text-xs" placeholder="e.g. Office Rent, Facebook Ads, Utilities..." required>
                    </div>

                    <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                        <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('exp-modal').classList.add('hidden')">Cancel</button>
                        <button type="submit" class="btn btn-primary text-xs px-4" id="submit-cat-btn">Save Category</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('new-cat-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('submit-cat-btn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                await API.post('expenses/add_category', { name: form.name.value });
                modal.classList.add('hidden');
                UI.toast('Category saved successfully!');
                await this.loadMetadata();
                const writeInput = document.getElementById('exp-cat-write');
                if (writeInput) writeInput.value = form.name.value;
                this.loadExpenses();
            } catch (err) {
                UI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Category';
            }
        };
    },

    async loadExpenses() {
        const search = document.getElementById('exp-search')?.value || '';
        const catName = document.getElementById('exp-cat-write')?.value || '';
        const tbody = document.getElementById('exp-list');
        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 text-xs">Loading expenses...</td></tr>`;
            const res = await API.get(`expenses/list?category_name=${encodeURIComponent(catName)}&search=${encodeURIComponent(search)}`);
            const expenses = res.data.expenses || [];
            this.expensesList = expenses;

            if (expenses.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">No matching expenses found.</td></tr>`;
                return;
            }

            tbody.innerHTML = expenses.map(e => `
                <tr class="hover:bg-slate-50/80 text-xs">
                    <td class="py-3">
                        <div class="font-medium text-slate-900">${UI.formatDate(e.expense_date)}</div>
                        <div class="text-[11px] text-slate-400 font-mono">${e.created_at ? new Date(e.created_at).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                    </td>
                    <td class="py-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            ${e.category_name || 'General'}
                        </span>
                    </td>
                    <td class="py-3">
                        <div class="font-medium text-slate-900">${e.description}</div>
                        ${e.receipt_reference ? `<div class="text-[11px] font-mono text-slate-400">Ref: ${e.receipt_reference}</div>` : ''}
                    </td>
                    <td class="py-3 font-semibold text-slate-800">${e.account_name || 'Cash'}</td>
                    <td class="data-number text-right font-bold text-red-600 py-3">-${UI.formatMoney(e.amount, false)}</td>
                    <td class="text-right py-3">
                        <div class="flex items-center justify-end gap-1.5">
                            <button type="button" class="px-2 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer" onclick="Expenses.showModal(${e.id})">
                                Edit
                            </button>
                            <button type="button" class="px-2 py-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors cursor-pointer" onclick="Expenses.deleteExpense(${e.id})">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 text-xs">Failed to load expenses.</td></tr>`;
        }
    },

    async deleteExpense(id) {
        if (!confirm('Are you sure you want to remove/delete this expense entry? The account balance will be restored.')) return;

        try {
            await API.request(`expenses?action=delete&id=${id}`, 'DELETE');
            UI.toast('Expense deleted successfully!', 'success');
            await Promise.all([this.loadSummary(), this.loadExpenses()]);
        } catch (e) {
            UI.toast(e.message || 'Failed to delete expense', 'error');
        }
    },

    fillExistingCategory(catId) {
        if (!catId) return;
        const c = this.categories.find(item => item.id == catId);
        if (!c) return;
        const input = document.getElementById('exp-write-category');
        if (input) input.value = c.name || '';
    },

    showModal(id = null) {
        if (!this.categories || !this.accounts) {
            UI.toast('Loading metadata. Try again in a second.', 'info');
            return;
        }

        const exp = id ? this.expensesList.find(e => e.id === id) : null;

        const catOptions = this.categories.map(c => `<option value="${c.id}" ${exp && exp.category_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('');
        const accOptions = this.accounts.map(a => `<option value="${a.id}" ${exp && exp.account_id == a.id ? 'selected' : ''}>${a.name} (${UI.formatMoney(a.current_balance)})</option>`).join('');

        const modal = document.getElementById('exp-modal');
        const today = exp ? exp.expense_date : new Date().toISOString().split('T')[0];

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-red-600">receipt_long</span>
                        <h3 class="font-geist font-semibold text-lg text-slate-900">${id ? 'Edit Operational Expense' : 'Record Operational Expense'}</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('exp-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <form id="exp-form" class="p-6 space-y-4">
                    <input type="hidden" name="id" value="${id || ''}">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Expense Date *</label>
                            <input type="date" name="expense_date" class="form-input text-xs" value="${today}" required>
                        </div>
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Amount (৳) *</label>
                            <input type="number" step="0.01" name="amount" class="form-input text-xs font-mono" min="0.01" value="${exp ? exp.amount : ''}" placeholder="0.00" required>
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <label class="form-label text-xs font-semibold uppercase text-slate-600 mb-0">Category (Write Directly) *</label>
                            <select id="pick-exp-cat-dropdown" class="text-xs text-blue-600 bg-transparent border-none py-0 font-medium hover:underline cursor-pointer" onchange="Expenses.fillExistingCategory(this.value)">
                                <option value="">Or Pick Existing...</option>
                                ${catOptions}
                            </select>
                        </div>
                        <input type="text" id="exp-write-category" name="category_name" class="form-input text-xs" value="${exp ? (exp.category_name || '') : ''}" placeholder="Write category e.g. Rent, Salaries, Marketing..." required>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Paid From (Account) *</label>
                        <select name="account_id" class="form-input text-xs" required>
                            <option value="">-- Select Source Account --</option>
                            ${accOptions}
                        </select>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Description / Purpose *</label>
                        <input type="text" name="description" class="form-input text-xs" value="${exp ? (exp.description || '') : ''}" placeholder="e.g. Office rent payment for August, Facebook ads" required>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Receipt / Bill Reference</label>
                        <input type="text" name="receipt_reference" class="form-input text-xs font-mono" value="${exp ? (exp.receipt_reference || '') : ''}" placeholder="e.g. INV-90421, Voucher #44">
                    </div>

                    <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                        <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('exp-modal').classList.add('hidden')">Cancel</button>
                        <button type="submit" class="btn btn-primary text-xs px-4" id="save-exp-btn">${id ? 'Save Expense Changes' : 'Record Expense'}</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('exp-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('save-exp-btn');

            btn.disabled = true;
            btn.textContent = 'Saving...';

            const payload = {
                expense_date: form.expense_date.value,
                amount: form.amount.value,
                category_name: form.category_name.value,
                account_id: form.account_id.value,
                description: form.description.value,
                receipt_reference: form.receipt_reference.value || ''
            };

            if (form.id.value) payload.id = parseInt(form.id.value);

            try {
                if (payload.id) {
                    await API.put('expenses/update', payload);
                    UI.toast('Expense updated successfully');
                } else {
                    await API.post('expenses/create', payload);
                    UI.toast('Expense recorded successfully');
                }

                modal.classList.add('hidden');
                await Promise.all([this.loadSummary(), this.loadExpenses(), this.loadMetadata()]);
            } catch (err) {
                UI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = id ? 'Save Expense Changes' : 'Record Expense';
            }
        };
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'expenses') {
    window.Expenses.render(document.getElementById('screen-container'));
}
