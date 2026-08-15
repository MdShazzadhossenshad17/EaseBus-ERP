/**
 * EaseBus — Executive Investors & Equity Management UI Module
 */

window.Investors = {
    investorsData: [],
    searchTimeout: null,

    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Investors & Equity</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Manage shareholders, capital investments, profit distributions, and equity ledgers.</p>
                </div>
                <button class="btn btn-primary flex items-center gap-2 shadow-sm" onclick="Investors.showModal()">
                    <span class="material-symbols-outlined text-sm">person_add</span> Add New Investor
                </button>
            </div>

            <!-- Top Executive KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="invst-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Capital Invested</p>
                            <h3 class="text-2xl font-mono-data font-bold text-slate-900 mt-1" id="kpi-total-capital">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Total equity & seed capital</p>
                        </div>
                        <div class="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">account_balance</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Shareholders</p>
                            <h3 class="text-2xl font-mono-data font-bold text-indigo-600 mt-1" id="kpi-total-shareholders">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Equity partner accounts</p>
                        </div>
                        <div class="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">handshake</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Returns Paid (Profit)</p>
                            <h3 class="text-2xl font-mono-data font-bold text-emerald-600 mt-1" id="kpi-total-returns">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Cumulative profit payouts</p>
                        </div>
                        <div class="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">payments</span>
                        </div>
                    </div>
                </div>

                <div class="card p-5 bg-white border-l-4 border-amber-600 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Equity Allocated</p>
                            <h3 class="text-2xl font-mono-data font-bold text-amber-600 mt-1" id="kpi-total-equity">--</h3>
                            <p class="text-xs text-slate-500 mt-1">Company share distribution</p>
                        </div>
                        <div class="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                            <span class="material-symbols-outlined text-xl">pie_chart</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Table & Filters Container -->
            <div class="card shadow-sm border border-slate-200 bg-white">
                <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div class="relative flex-1 max-w-md">
                        <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                        <input type="text" id="invst-search" placeholder="Search investor name, phone, email..." class="form-input pl-9 text-xs py-2" onkeyup="Investors.debounceSearch()">
                    </div>

                    <div class="flex items-center gap-3">
                        <select id="filter-status" class="form-input text-xs py-2 w-36" onchange="Investors.filterInvestors()">
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table" id="invst-table">
                        <thead>
                            <tr>
                                <th>Shareholder</th>
                                <th>Contact Information</th>
                                <th>Ownership Equity</th>
                                <th>Profit Share</th>
                                <th class="text-right">Total Invested</th>
                                <th class="text-right">Returns Paid</th>
                                <th class="text-right">Manage</th>
                            </tr>
                        </thead>
                        <tbody id="invst-list">
                            <tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">Loading shareholders...</td></tr>
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

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.filterInvestors(), 300);
    },

    async loadInvestors() {
        const tbody = document.getElementById('invst-list');
        if (!tbody) return;

        try {
            const res = await API.get('investors/summary');
            const investors = (res && res.data && res.data.investors) ? res.data.investors : [];
            const summary = (res && res.data && res.data.summary) ? res.data.summary : null;

            this.investorsData = investors;
            this.updateKPIs(summary, investors);
            this.filterInvestors();
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-500 text-xs">Failed to load investors data.</td></tr>`;
            UI.toast('Failed to load investors', 'error');
        }
    },

    updateKPIs(summary, investors) {
        let totalCapital = summary?.total_capital || 0;
        let totalReturns = summary?.total_returns_paid || 0;
        let totalEquity = summary?.total_ownership || 0;
        let totalCount = summary?.total_investors || investors.length;

        if (!summary) {
            totalCapital = investors.reduce((sum, i) => sum + parseFloat(i.total_invested || 0), 0);
            totalReturns = investors.reduce((sum, i) => sum + parseFloat(i.total_profit || 0), 0);
            totalEquity = investors.reduce((sum, i) => sum + parseFloat(i.ownership_percentage || 0), 0);
        }

        const capitalEl = document.getElementById('kpi-total-capital');
        const countEl = document.getElementById('kpi-total-shareholders');
        const returnsEl = document.getElementById('kpi-total-returns');
        const equityEl = document.getElementById('kpi-total-equity');

        if (capitalEl) capitalEl.textContent = UI.formatMoney(totalCapital);
        if (countEl) countEl.textContent = totalCount;
        if (returnsEl) returnsEl.textContent = UI.formatMoney(totalReturns);
        if (equityEl) equityEl.textContent = `${totalEquity}%`;
    },

    filterInvestors() {
        const search = (document.getElementById('invst-search')?.value || '').toLowerCase();
        const status = document.getElementById('filter-status')?.value || 'all';
        const tbody = document.getElementById('invst-list');
        if (!tbody) return;

        let filtered = (this.investorsData || []).filter(i => {
            const matchSearch = !search ||
                (i.name || '').toLowerCase().includes(search) ||
                (i.phone || '').toLowerCase().includes(search) ||
                (i.email || '').toLowerCase().includes(search);

            const matchStatus = status === 'all' || (i.status || 'active') === status;
            return matchSearch && matchStatus;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400 text-xs">No matching shareholders found.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(i => `
            <tr class="hover:bg-slate-50/80">
                <td class="py-3">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs font-mono">
                            ${(i.name || 'I').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-semibold text-slate-900 text-xs">${i.name}</div>
                            <div class="text-[11px] text-slate-400">${i.investment_date ? 'Joined ' + UI.formatDate(i.investment_date) : 'Seed Investor'}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3">
                    <div class="text-xs font-medium text-slate-800">${i.phone || '-'}</div>
                    <div class="text-[11px] text-slate-400">${i.email || '-'}</div>
                </td>
                <td class="py-3">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        ${i.ownership_percentage ? i.ownership_percentage + '%' : '0%'} Equity
                    </span>
                </td>
                <td class="py-3">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        ${i.profit_share_percentage ? i.profit_share_percentage + '%' : '0%'} Profit
                    </span>
                </td>
                <td class="data-number text-right font-bold text-emerald-600 text-xs py-3">${UI.formatMoney(i.total_invested || i.investment_amount || 0)}</td>
                <td class="data-number text-right font-bold text-blue-600 text-xs py-3">${UI.formatMoney(i.total_profit || i.return_paid || 0)}</td>
                <td class="py-3 text-right">
                    <button class="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 ml-auto" onclick="Investors.showTxnModal(${i.id}, '${i.name}')">
                        <span class="material-symbols-outlined text-xs">add_card</span> Record Txn
                    </button>
                </td>
            </tr>
        `).join('');
    },

    showModal() {
        const modal = document.getElementById('invst-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">person_add</span>
                        <h3 class="font-geist font-bold text-base text-slate-900">Add New Investor / Shareholder</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 rounded-lg p-1" onclick="document.getElementById('invst-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <form id="invst-form" class="space-y-4">
                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">Full Name *</label>
                            <input type="text" name="name" class="form-input text-xs py-2" placeholder="e.g. Sharif Uddin" required>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Phone *</label>
                                <input type="text" name="phone" class="form-input text-xs py-2" placeholder="01711223344" required>
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Email Address</label>
                                <input type="email" name="email" class="form-input text-xs py-2" placeholder="investor@domain.com">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Ownership Equity (%)</label>
                                <input type="number" step="0.01" min="0" max="100" name="ownership_percentage" class="form-input text-xs py-2" placeholder="20.00">
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Profit Share (%)</label>
                                <input type="number" step="0.01" min="0" max="100" name="profit_share_percentage" class="form-input text-xs py-2" placeholder="20.00">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Initial Capital Investment (৳)</label>
                                <input type="number" step="0.01" name="initial_investment" class="form-input text-xs py-2" placeholder="500000.00">
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Investment Date</label>
                                <input type="date" name="investment_date" class="form-input text-xs py-2" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>

                        <div class="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <button type="button" class="btn btn-secondary text-xs px-4 py-2" onclick="document.getElementById('invst-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary text-xs px-4 py-2" id="save-invst-btn">Create Shareholder</button>
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

            const payload = {
                name: form.name.value,
                phone: form.phone.value,
                email: form.email.value,
                ownership_percentage: form.ownership_percentage.value || 0,
                profit_share_percentage: form.profit_share_percentage.value || 0,
                initial_investment: form.initial_investment.value || 0,
                investment_date: form.investment_date.value
            };

            try {
                await API.post('investors/create', payload);
                modal.classList.add('hidden');
                UI.toast('Shareholder added successfully');
                await this.loadInvestors();
            } catch (err) {
                UI.toast(err.message || 'Failed to add investor', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Create Shareholder';
            }
        });
    },

    showTxnModal(investorId, investorName) {
        const modal = document.getElementById('txn-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">add_card</span>
                        <h3 class="font-geist font-bold text-base text-slate-900">Record Equity Transaction</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 rounded-lg p-1" onclick="document.getElementById('txn-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <form id="txn-form" class="space-y-4">
                        <input type="hidden" name="investor_id" value="${investorId}">

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">Shareholder</label>
                            <input type="text" class="form-input text-xs py-2 bg-slate-100" value="${investorName}" disabled>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Transaction Type *</label>
                                <select name="type" class="form-input text-xs py-2" required>
                                    <option value="additional_investment">Additional Investment</option>
                                    <option value="profit_distribution">Profit Distribution</option>
                                    <option value="withdrawal">Capital Withdrawal</option>
                                </select>
                            </div>
                            <div>
                                <label class="form-label text-xs font-semibold text-slate-700">Amount (৳) *</label>
                                <input type="number" step="0.01" name="amount" class="form-input text-xs py-2" placeholder="25000.00" required>
                            </div>
                        </div>

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">Transaction Date *</label>
                            <input type="date" name="transaction_date" class="form-input text-xs py-2" value="${new Date().toISOString().split('T')[0]}" required>
                        </div>

                        <div>
                            <label class="form-label text-xs font-semibold text-slate-700">Description / Note</label>
                            <input type="text" name="description" class="form-input text-xs py-2" placeholder="e.g. Q2 Profit Distribution Payout">
                        </div>

                        <div class="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            <button type="button" class="btn btn-secondary text-xs px-4 py-2" onclick="document.getElementById('txn-modal').classList.add('hidden')">Cancel</button>
                            <button type="submit" class="btn btn-primary text-xs px-4 py-2" id="save-txn-btn">Record Transaction</button>
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

            const payload = {
                investor_id: parseInt(form.investor_id.value),
                type: form.type.value,
                amount: parseFloat(form.amount.value),
                transaction_date: form.transaction_date.value,
                description: form.description.value
            };

            try {
                await API.post('investors/transaction', payload);
                modal.classList.add('hidden');
                UI.toast('Transaction recorded successfully');
                await this.loadInvestors();
            } catch (err) {
                UI.toast(err.message || 'Failed to record transaction', 'error');
            } finally {
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
