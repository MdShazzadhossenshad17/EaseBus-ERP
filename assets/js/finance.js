/**
 * EaseBus — Finance & Accounts UI Module
 */

window.Finance = {
    accountsData: [],

    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Accounts & Cash</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Monitor liquidity, manage bank & cash registers, and track real-time cash flow.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button class="btn btn-secondary flex items-center gap-1 text-xs" onclick="Finance.loadSummary(); Finance.loadAccounts(); Finance.loadTransactions();">
                        <span class="material-symbols-outlined text-sm">refresh</span> Refresh
                    </button>
                    <button class="btn btn-secondary flex items-center gap-1 text-xs" onclick="Finance.showDepositWithdrawModal()">
                        <span class="material-symbols-outlined text-sm">swap_vert</span> Deposit / Outflow
                    </button>
                    <button class="btn btn-secondary flex items-center gap-1 text-xs" onclick="Finance.showTransferModal()">
                        <span class="material-symbols-outlined text-sm">sync_alt</span> Transfer Funds
                    </button>
                    <button class="btn btn-primary flex items-center gap-1 text-xs" onclick="Finance.showNewAccountModal()">
                        <span class="material-symbols-outlined text-sm">add_card</span> New Account
                    </button>
                </div>
            </div>

            <!-- KPI Cards Header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="fin-kpi-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-red-500 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm animate-pulse"><div class="h-10 bg-slate-100 rounded"></div></div>
            </div>

            <!-- Accounts Grid Header -->
            <div class="mb-4 flex justify-between items-center">
                <h3 class="font-geist font-bold text-slate-900 text-lg">Financial Accounts & Cash Boxes</h3>
                <span class="text-xs text-slate-500" id="acc-count-label">Loading accounts...</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" id="accounts-grid">
                <div class="col-span-3 text-center py-8 text-slate-400 text-xs">Loading accounts...</div>
            </div>

            <!-- Transactions Table Card -->
            <div class="card shadow-sm border-slate-200">
                <div class="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50/70 gap-4">
                    <div class="flex items-center gap-3 flex-wrap">
                        <h3 class="font-geist font-bold text-slate-900 text-base mr-2">Real-Time Transactions Ledger</h3>
                        <div class="relative w-64">
                            <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                            <input type="text" id="fin-search" placeholder="Search account, description..." class="form-input text-xs py-1.5 pl-9 pr-3 rounded border-slate-300" onkeyup="Finance.debounceSearch()">
                        </div>
                        <select id="fin-acc-filter" class="form-input text-xs py-1.5 px-3 rounded border-slate-300 w-44" onchange="Finance.loadTransactions()">
                            <option value="all">All Accounts</option>
                        </select>
                        <select id="fin-type-filter" class="form-input text-xs py-1.5 px-3 rounded border-slate-300 w-36" onchange="Finance.loadTransactions()">
                            <option value="all">All Types</option>
                            <option value="inflow">Inflow (+)</option>
                            <option value="outflow">Outflow (-)</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp & Date</th>
                                <th>Account</th>
                                <th>Description & Reference</th>
                                <th>Type</th>
                                <th class="text-right">Transaction Amount</th>
                                <th class="text-right">Balance After</th>
                            </tr>
                        </thead>
                        <tbody id="txn-list">
                            <tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">Loading transactions...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="finance-modal" class="fixed inset-0 modal-overlay z-50 hidden flex items-center justify-center p-4"></div>
        `;

        await Promise.all([
            this.loadSummary(),
            this.loadAccounts(),
            this.loadTransactions()
        ]);
    },

    searchTimeout: null,
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadTransactions(), 400);
    },

    async loadSummary() {
        try {
            const res = await API.get('finance/summary');
            const s = res.data.summary;
            const container = document.getElementById('fin-kpi-container');
            if (!container) return;

            container.innerHTML = `
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Liquidity</p>
                    <h3 class="text-2xl font-mono-data font-bold text-slate-900">${UI.formatMoney(s.total_liquidity)}</h3>
                    <p class="text-xs text-slate-500 mt-1">Total cash & bank reserves</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Monthly Inflows (+)</p>
                    <h3 class="text-2xl font-mono-data font-bold text-emerald-700">+${UI.formatMoney(s.monthly_inflow, false)}</h3>
                    <p class="text-xs text-slate-500 mt-1">Total deposits & revenue</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-red-500 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Monthly Outflows (-)</p>
                    <h3 class="text-2xl font-mono-data font-bold text-red-600">-${UI.formatMoney(s.monthly_outflow, false)}</h3>
                    <p class="text-xs text-slate-500 mt-1">Total expenses & payouts</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Net Cash Position</p>
                    <h3 class="text-2xl font-mono-data font-bold ${s.net_cash_flow >= 0 ? 'text-emerald-700' : 'text-red-600'}">${UI.formatMoney(s.net_cash_flow)}</h3>
                    <p class="text-xs text-slate-500 mt-1">Net cash position (MTD)</p>
                </div>
            `;
        } catch (e) {
            console.error('Failed to load finance summary', e);
        }
    },

    async loadAccounts() {
        const grid = document.getElementById('accounts-grid');
        const countLabel = document.getElementById('acc-count-label');
        if (!grid) return;

        try {
            const res = await API.get('finance/accounts');
            this.accountsData = res.data.accounts || [];

            if (countLabel) countLabel.textContent = `${this.accountsData.length} Active Accounts`;

            // Populate account filter dropdown
            const filterSel = document.getElementById('fin-acc-filter');
            if (filterSel) {
                const currentVal = filterSel.value;
                filterSel.innerHTML = `<option value="all">All Accounts</option>` +
                    this.accountsData.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
                filterSel.value = currentVal;
            }

            const getTypeBadge = (type) => {
                const map = {
                    'cash': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'bank': 'bg-blue-50 text-blue-700 border-blue-200',
                    'mobile_banking': 'bg-pink-50 text-pink-700 border-pink-200',
                    'other': 'bg-slate-50 text-slate-700 border-slate-200'
                };
                return map[type] || 'bg-slate-50 text-slate-700 border-slate-200';
            };

            grid.innerHTML = this.accountsData.map(a => `
                <div class="card p-5 relative overflow-hidden group hover:shadow-md transition">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h4 class="font-geist font-bold text-slate-900 text-base">${a.name}</h4>
                            ${a.bank_name ? `<p class="text-xs text-slate-500">${a.bank_name} ${a.account_number ? '• ' + a.account_number : ''}</p>` : ''}
                        </div>
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getTypeBadge(a.type)}">
                            ${a.type.replace('_', ' ')}
                        </span>
                    </div>

                    <div class="my-2">
                        <span class="text-xs text-slate-400 font-medium">Available Balance</span>
                        <h3 class="text-2xl font-mono-data font-bold text-slate-900 mt-0.5">${UI.formatMoney(a.current_balance)}</h3>
                    </div>

                    <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                        <button class="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1" onclick="Finance.reconcile(${a.id})">
                            <span class="material-symbols-outlined text-xs">sync</span> Reconcile
                        </button>
                        <div class="flex gap-2">
                            <button class="text-emerald-700 hover:underline font-medium" onclick="Finance.showDepositWithdrawModal(${a.id}, 'inflow')">+ Deposit</button>
                            <button class="text-red-600 hover:underline font-medium" onclick="Finance.showDepositWithdrawModal(${a.id}, 'outflow')">- Outflow</button>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (e) {
            grid.innerHTML = `<div class="col-span-3 text-center py-8 text-red-500 text-xs">Failed to load accounts.</div>`;
        }
    },

    async loadTransactions() {
        const tbody = document.getElementById('txn-list');
        const search = document.getElementById('fin-search')?.value || '';
        const accId = document.getElementById('fin-acc-filter')?.value || 'all';
        const type = document.getElementById('fin-type-filter')?.value || 'all';

        if (!tbody) return;

        try {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400 text-xs">Loading transactions...</td></tr>`;
            const res = await API.get(`finance/transactions?account_id=${accId}&type=${type}&search=${encodeURIComponent(search)}&limit=100`);
            const txns = res.data.transactions || [];

            if (txns.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-xs">No matching financial transactions found.</td></tr>`;
                return;
            }

            const getRefBadge = (ref) => {
                const colors = {
                    'order': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'expense': 'bg-red-50 text-red-700 border-red-200',
                    'return': 'bg-orange-50 text-orange-700 border-orange-200',
                    'transfer': 'bg-blue-50 text-blue-700 border-blue-200',
                    'manual': 'bg-slate-50 text-slate-700 border-slate-200'
                };
                return colors[ref] || 'bg-slate-50 text-slate-700 border-slate-200';
            };

            tbody.innerHTML = txns.map(t => `
                <tr class="hover:bg-slate-50/80 text-xs">
                    <td class="py-3">
                        <div class="font-medium text-slate-900">${UI.formatDate(t.transaction_date)}</div>
                        <div class="text-[11px] text-slate-400 font-mono">${new Date(t.transaction_date).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td class="font-bold text-slate-900 py-3">${t.account_name}</td>
                    <td class="py-3">
                        <div class="font-medium text-slate-900">${t.description}</div>
                        ${t.reference_type ? `<span class="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${getRefBadge(t.reference_type)}">${t.reference_type}</span>` : ''}
                    </td>
                    <td class="py-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            t.type === 'inflow' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                        }">${t.type}</span>
                    </td>
                    <td class="data-number text-right font-bold py-3 ${t.type === 'inflow' ? 'text-emerald-700' : 'text-red-600'}">
                        ${t.type === 'inflow' ? '+' : '-'}${UI.formatMoney(t.amount, false)}
                    </td>
                    <td class="data-number text-right font-semibold text-slate-900 py-3">${UI.formatMoney(t.balance_after)}</td>
                </tr>
            `).join('');

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 text-xs">Failed to load transactions.</td></tr>`;
        }
    },

    showNewAccountModal() {
        const modal = document.getElementById('finance-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">add_card</span>
                        <h3 class="font-geist font-semibold text-lg text-slate-900">Add New Account</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('finance-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <form id="new-account-form" class="p-6 space-y-4">
                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Account Name *</label>
                        <input type="text" name="name" class="form-input text-xs" placeholder="e.g. Main Cash Box, DBBL Corporate, bKash Merchant..." required>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Account Type *</label>
                        <select name="type" class="form-input text-xs" required>
                            <option value="cash">Cash Register / Cash Box</option>
                            <option value="bank">Bank Account</option>
                            <option value="mobile_banking">Mobile Banking (bKash / Nagad / Rocket)</option>
                            <option value="other">Other Account</option>
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Bank / Provider Name</label>
                            <input type="text" name="bank_name" class="form-input text-xs" placeholder="e.g. Dutch Bangla Bank, bKash">
                        </div>
                        <div>
                            <label class="form-label text-xs font-semibold uppercase text-slate-600">Account / Phone #</label>
                            <input type="text" name="account_number" class="form-input text-xs font-mono" placeholder="e.g. 150-120-4921">
                        </div>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Opening Balance (৳)</label>
                        <input type="number" step="0.01" name="initial_balance" class="form-input text-xs" value="0" min="0">
                    </div>

                    <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                        <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('finance-modal').classList.add('hidden')">Cancel</button>
                        <button type="submit" class="btn btn-primary text-xs px-4" id="submit-acc-btn">Create Account</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('new-account-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('submit-acc-btn');
            btn.disabled = true;
            btn.textContent = 'Creating...';

            try {
                await API.post('finance/create_account', {
                    name: form.name.value,
                    type: form.type.value,
                    bank_name: form.bank_name.value,
                    account_number: form.account_number.value,
                    initial_balance: form.initial_balance.value || 0
                });

                modal.classList.add('hidden');
                UI.toast('Financial account created successfully!');
                await Promise.all([this.loadSummary(), this.loadAccounts(), this.loadTransactions()]);
            } catch (err) {
                UI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        };
    },

    showDepositWithdrawModal(preselectAccId = null, preselectType = 'inflow') {
        const options = this.accountsData.map(a => 
            `<option value="${a.id}" ${a.id == preselectAccId ? 'selected' : ''}>${a.name} (${UI.formatMoney(a.current_balance)})</option>`
        ).join('');

        const modal = document.getElementById('finance-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">swap_vert</span>
                        <h3 class="font-geist font-semibold text-lg text-slate-900">Record Cash Deposit / Outflow</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('finance-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <form id="dep-form" class="p-6 space-y-4">
                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Transaction Type *</label>
                        <select name="type" class="form-input text-xs" required>
                            <option value="inflow" ${preselectType === 'inflow' ? 'selected' : ''}>Deposit / Cash Inflow (+)</option>
                            <option value="outflow" ${preselectType === 'outflow' ? 'selected' : ''}>Withdrawal / Cash Outflow (-)</option>
                        </select>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Select Account *</label>
                        <select name="account_id" class="form-input text-xs" required>
                            <option value="">-- Choose Financial Account --</option>
                            ${options}
                        </select>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Amount (৳) *</label>
                        <input type="number" step="0.01" name="amount" class="form-input text-xs font-mono" min="0.01" placeholder="0.00" required>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Description / Reason *</label>
                        <input type="text" name="description" class="form-input text-xs" placeholder="e.g. Sales collection, Office supplies cash out" required>
                    </div>

                    <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                        <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('finance-modal').classList.add('hidden')">Cancel</button>
                        <button type="submit" class="btn btn-primary text-xs px-4" id="submit-dep-btn">Record Transaction</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('dep-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('submit-dep-btn');
            btn.disabled = true;
            btn.textContent = 'Processing...';

            try {
                await API.post('finance/deposit_withdraw', {
                    account_id: form.account_id.value,
                    type: form.type.value,
                    amount: form.amount.value,
                    description: form.description.value
                });

                modal.classList.add('hidden');
                UI.toast('Cash transaction recorded successfully!');
                await Promise.all([this.loadSummary(), this.loadAccounts(), this.loadTransactions()]);
            } catch (err) {
                UI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Record Transaction';
            }
        };
    },

    showTransferModal() {
        if (!this.accountsData || this.accountsData.length < 2) {
            UI.toast('You need at least two active accounts to make a transfer.', 'error');
            return;
        }

        const options = this.accountsData.map(a => `<option value="${a.id}">${a.name} (${UI.formatMoney(a.current_balance)})</option>`).join('');

        const modal = document.getElementById('finance-modal');
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-fade-in">
                <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-blue-600">sync_alt</span>
                        <h3 class="font-geist font-semibold text-lg text-slate-900">Transfer Funds</h3>
                    </div>
                    <button class="text-slate-400 hover:text-slate-600 p-1" onclick="document.getElementById('finance-modal').classList.add('hidden')">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <form id="transfer-form" class="p-6 space-y-4">
                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">From Account (Source) *</label>
                        <select name="from_account_id" class="form-input text-xs" required>
                            <option value="">Select source account...</option>
                            ${options}
                        </select>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">To Account (Destination) *</label>
                        <select name="to_account_id" class="form-input text-xs" required>
                            <option value="">Select destination account...</option>
                            ${options}
                        </select>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Transfer Amount (৳) *</label>
                        <input type="number" step="0.01" name="amount" class="form-input text-xs font-mono" min="0.01" placeholder="0.00" required>
                    </div>

                    <div>
                        <label class="form-label text-xs font-semibold uppercase text-slate-600">Description / Reference *</label>
                        <input type="text" name="description" class="form-input text-xs" placeholder="e.g. Bank deposit from Cash Box" required>
                    </div>

                    <div class="pt-4 flex justify-end gap-2 border-t border-slate-100">
                        <button type="button" class="btn btn-secondary text-xs px-4" onclick="document.getElementById('finance-modal').classList.add('hidden')">Cancel</button>
                        <button type="submit" class="btn btn-primary text-xs px-4" id="save-transfer-btn">Confirm Transfer</button>
                    </div>
                </form>
            </div>
        `;
        modal.classList.remove('hidden');

        document.getElementById('transfer-form').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = document.getElementById('save-transfer-btn');

            if (form.from_account_id.value === form.to_account_id.value) {
                UI.toast('Source and destination accounts must be different.', 'error');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Processing Transfer...';

            try {
                await API.post('finance/transfer', {
                    from_account_id: form.from_account_id.value,
                    to_account_id: form.to_account_id.value,
                    amount: form.amount.value,
                    description: form.description.value
                });

                modal.classList.add('hidden');
                UI.toast('Fund transfer completed successfully!');
                await Promise.all([this.loadSummary(), this.loadAccounts(), this.loadTransactions()]);
            } catch (err) {
                UI.toast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Confirm Transfer';
            }
        };
    },

    async reconcile(id) {
        if (!confirm('Recalculate account balance based on all transaction history to fix any discrepancies. Continue?')) return;

        try {
            const res = await API.post('finance/reconcile', { account_id: id });
            const r = res.data.result;

            if (r.discrepancy_found) {
                UI.toast(`Reconciled! Fixed discrepancy of ${UI.formatMoney(r.difference)}. New balance: ${UI.formatMoney(r.calculated_balance)}`);
            } else {
                UI.toast('Balance is perfectly accurate. No discrepancy found.');
            }
            await Promise.all([this.loadSummary(), this.loadAccounts()]);
        } catch (e) {
            UI.toast(e.message, 'error');
        }
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'finance') {
    window.Finance.render(document.getElementById('screen-container'));
}
