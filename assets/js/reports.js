/**
 * BusinessM — Intelligence & Analytics UI Module
 */

window.Reports = {
    currentReportData: null,
    currentValuationData: null,

    async render(container) {
        container.innerHTML = `
            <!-- Top Bar -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-geist font-bold text-slate-900 tracking-tight">Intelligence & Analytics</h1>
                    <p class="text-slate-500 text-sm mt-0.5">Executive financial performance, profit margins, expense distribution, and asset valuation.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-secondary flex items-center gap-1 text-xs" onclick="Reports.printReport()">
                        <span class="material-symbols-outlined text-sm">print</span> Print
                    </button>
                    <button class="btn btn-primary flex items-center gap-1 text-xs" onclick="Reports.exportCSV()">
                        <span class="material-symbols-outlined text-sm">download</span> Export CSV
                    </button>
                </div>
            </div>

            <!-- Date Filter Bar -->
            <div class="card p-4 mb-6 bg-white border border-slate-200 shadow-sm">
                <form id="pl-form" class="flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Range Presets:</span>
                        <div class="flex flex-wrap items-center gap-1.5" id="preset-btn-group">
                            <button type="button" class="preset-btn px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" onclick="Reports.setPreset(7, this)">7 Days</button>
                            <button type="button" class="preset-btn px-3 py-1 text-xs font-medium rounded-full bg-blue-600 text-white shadow-sm" id="btn-preset-default" onclick="Reports.setPreset(30, this)">30 Days</button>
                            <button type="button" class="preset-btn px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" onclick="Reports.setPreset(90, this)">90 Days</button>
                            <button type="button" class="preset-btn px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" onclick="Reports.setPreset(365, this)">This Year</button>
                            <button type="button" class="px-3 py-1 text-xs font-medium rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 flex items-center gap-1 transition-colors" onclick="Reports.resetRange()">
                                <span class="material-symbols-outlined text-xs">restart_alt</span> Reset Range
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-slate-500 font-medium">From:</label>
                            <input type="date" id="pl-start" class="form-input text-xs py-1 px-2 border-slate-300 rounded" required>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-slate-500 font-medium">To:</label>
                            <input type="date" id="pl-end" class="form-input text-xs py-1 px-2 border-slate-300 rounded" required>
                        </div>
                        <button type="submit" class="btn btn-primary py-1 px-3 text-xs">Apply Filter</button>
                    </div>
                </form>
            </div>

            <!-- KPI Cards Header -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6" id="kpi-cards-container">
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm animate-pulse"><div class="h-12 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm animate-pulse"><div class="h-12 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-orange-600 shadow-sm animate-pulse"><div class="h-12 bg-slate-100 rounded"></div></div>
                <div class="card p-5 bg-white border-l-4 border-emerald-600 shadow-sm animate-pulse"><div class="h-12 bg-slate-100 rounded"></div></div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <!-- P&L Statement Card -->
                <div class="card lg:col-span-2 shadow-sm border-slate-200">
                    <div class="card-header bg-slate-50 border-b border-slate-200 flex justify-between items-center py-3.5 px-6">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-slate-600 text-lg">account_balance</span>
                            <h3 class="card-title text-base font-semibold text-slate-900">Profit & Loss Income Statement</h3>
                        </div>
                        <span class="text-xs font-mono text-slate-500" id="statement-period">--</span>
                    </div>
                    <div class="p-6" id="pl-result">
                        <div class="py-12 text-center text-slate-400">Loading statement data...</div>
                    </div>
                </div>

                <!-- Expense Distribution Card -->
                <div class="card shadow-sm border-slate-200">
                    <div class="card-header bg-slate-50 border-b border-slate-200 flex justify-between items-center py-3.5 px-6">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-slate-600 text-lg">pie_chart</span>
                            <h3 class="card-title text-base font-semibold text-slate-900">Expense Allocation</h3>
                        </div>
                    </div>
                    <div class="p-5" id="expense-distribution">
                        <div class="py-12 text-center text-slate-400">Loading expenses...</div>
                    </div>
                </div>
            </div>

            <!-- Bottom Row: Top Products & Inventory Valuation -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Top Products Leaderboard -->
                <div class="card shadow-sm border-slate-200">
                    <div class="card-header bg-slate-50 border-b border-slate-200 flex justify-between items-center py-3.5 px-6">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-slate-600 text-lg">workspace_premium</span>
                            <h3 class="card-title text-base font-semibold text-slate-900">Top Performing Products</h3>
                        </div>
                    </div>
                    <div class="p-0 overflow-x-auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Category</th>
                                    <th class="text-right">Units Sold</th>
                                    <th class="text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody id="top-products-list">
                                <tr><td colspan="4" class="text-center py-8 text-slate-400">Loading top products...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Current Inventory Valuation Asset Table -->
                <div class="card shadow-sm border-slate-200">
                    <div class="card-header bg-slate-50 border-b border-slate-200 flex justify-between items-center py-3.5 px-6">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-slate-600 text-lg">inventory</span>
                            <h3 class="card-title text-base font-semibold text-slate-900">Asset Valuation Summary</h3>
                        </div>
                        <button class="text-blue-600 hover:text-blue-800 text-xs font-semibold" onclick="Reports.loadValuation()">Refresh</button>
                    </div>
                    <div class="p-0 max-h-[350px] overflow-y-auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product Item</th>
                                    <th>Category</th>
                                    <th class="text-right">Stock Qty</th>
                                    <th class="text-right">Asset Value</th>
                                </tr>
                            </thead>
                            <tbody id="val-list">
                                <tr><td colspan="4" class="text-center py-8 text-slate-400">Loading valuation...</td></tr>
                            </tbody>
                            <tfoot id="val-foot" class="hidden bg-slate-50 font-semibold border-t-2 border-slate-200">
                                <!-- Dynamic totals -->
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Setup initial date values (last 30 days)
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        
        document.getElementById('pl-start').value = start.toISOString().split('T')[0];
        document.getElementById('pl-end').value = end.toISOString().split('T')[0];
        
        document.getElementById('pl-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generatePL();
        });
        
        await Promise.all([
            this.generatePL(),
            this.loadValuation()
        ]);
    },
    
    setPreset(days, btnEl = null) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        
        document.getElementById('pl-start').value = start.toISOString().split('T')[0];
        document.getElementById('pl-end').value = end.toISOString().split('T')[0];

        // Update pill active highlight state
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
            btn.classList.add('bg-slate-100', 'text-slate-600');
        });

        if (btnEl) {
            btnEl.classList.remove('bg-slate-100', 'text-slate-600');
            btnEl.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
        }

        this.generatePL();
    },

    resetRange() {
        const defaultBtn = document.getElementById('btn-preset-default');
        this.setPreset(30, defaultBtn);
        UI.toast('Date filter reset to 30 days');
    },
    
    async generatePL() {
        const start = document.getElementById('pl-start').value;
        const end = document.getElementById('pl-end').value;
        const resultDiv = document.getElementById('pl-result');
        const periodSpan = document.getElementById('statement-period');
        
        try {
            UI.setLoading(true);
            const res = await API.get(`reports/profit_loss?start_date=${start}&end_date=${end}`);
            const r = res.data.report;
            this.currentReportData = r;

            if (periodSpan) {
                periodSpan.textContent = `${UI.formatDate(r.period.start)} - ${UI.formatDate(r.period.end)}`;
            }

            // Render KPI cards
            const netClass = r.net_profit >= 0 ? 'border-emerald-500 text-emerald-600' : 'border-red-500 text-red-600';
            document.getElementById('kpi-cards-container').innerHTML = `
                <div class="card p-5 bg-white border-l-4 border-blue-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Gross Revenue</p>
                    <h3 class="text-2xl font-mono-data font-bold text-slate-900">${UI.formatMoney(r.revenue)}</h3>
                    <p class="text-xs text-slate-500 mt-2">${r.order_count} orders (${UI.formatMoney(r.avg_order_value)} avg)</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-indigo-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Gross Profit</p>
                    <h3 class="text-2xl font-mono-data font-bold text-indigo-600">${UI.formatMoney(r.gross_profit)}</h3>
                    <p class="text-xs text-slate-500 mt-2">${r.gross_margin_percent}% Gross Margin</p>
                </div>
                <div class="card p-5 bg-white border-l-4 border-orange-600 shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Operating Expenses</p>
                    <h3 class="text-2xl font-mono-data font-bold text-orange-600">${UI.formatMoney(r.operating_expenses)}</h3>
                    <p class="text-xs text-slate-500 mt-2">${r.revenue > 0 ? ((r.operating_expenses / r.revenue) * 100).toFixed(1) : '0.0'}% Expense Ratio</p>
                </div>
                <div class="card p-5 bg-white border-l-4 ${netClass} shadow-sm">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Net Margin / Profit</p>
                    <h3 class="text-2xl font-mono-data font-bold">${UI.formatMoney(r.net_profit)}</h3>
                    <p class="text-xs text-slate-500 mt-2">${r.net_margin_percent}% Net Profitability</p>
                </div>
            `;
            
            // Render P&L Statement Table
            resultDiv.innerHTML = `
                <div class="space-y-4">
                    <div class="flex justify-between items-center py-2.5 px-4 bg-slate-50 rounded border border-slate-200">
                        <span class="text-slate-700 font-medium text-sm">Total Gross Revenue</span>
                        <span class="font-mono-data font-semibold text-slate-900">${UI.formatMoney(r.revenue)}</span>
                    </div>
                    <div class="flex justify-between items-center py-2.5 px-4 bg-slate-50 rounded border border-slate-200">
                        <span class="text-slate-600 text-sm">Cost of Goods Sold (COGS)</span>
                        <span class="font-mono-data font-medium text-red-600">-${UI.formatMoney(r.cogs)}</span>
                    </div>
                    <div class="flex justify-between items-center py-3 px-4 bg-blue-50/70 border border-blue-200 rounded">
                        <span class="text-blue-950 font-bold text-sm">Gross Operating Profit</span>
                        <span class="font-mono-data font-bold text-base text-blue-700">${UI.formatMoney(r.gross_profit)} (${r.gross_margin_percent}%)</span>
                    </div>
                    
                    <div class="flex justify-between items-center py-2.5 px-4 bg-slate-50 rounded border border-slate-200">
                        <span class="text-slate-600 text-sm">Total Operating Expenses</span>
                        <span class="font-mono-data font-medium text-orange-600">-${UI.formatMoney(r.operating_expenses)}</span>
                    </div>
                    
                    <div class="flex justify-between items-center py-3.5 px-5 bg-slate-900 text-white rounded-lg shadow-sm mt-4">
                        <div>
                            <span class="text-sm font-bold block">Net Profit / (Loss)</span>
                            <span class="text-[11px] text-slate-400">Final bottom-line earnings after expenses</span>
                        </div>
                        <span class="font-mono-data font-bold text-2xl ${r.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                            ${UI.formatMoney(r.net_profit)}
                        </span>
                    </div>

                    <div class="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                        <span>Current Stock Asset Value: <strong>${UI.formatMoney(r.current_inventory_value)}</strong></span>
                        <span>Average Order Size: <strong>${UI.formatMoney(r.avg_order_value)}</strong></span>
                    </div>
                </div>
            `;

            // Render Expense Breakdown Progress Bars
            const expContainer = document.getElementById('expense-distribution');
            if (r.expense_breakdown && r.expense_breakdown.length > 0) {
                const totalExp = r.operating_expenses || 1;
                expContainer.innerHTML = `
                    <div class="space-y-4">
                        ${r.expense_breakdown.map(item => {
                            const amt = parseFloat(item.total_amount);
                            const pct = Math.min(100, Math.round((amt / totalExp) * 100));
                            return `
                                <div>
                                    <div class="flex justify-between text-xs mb-1 font-medium">
                                        <span class="text-slate-700">${item.category_name}</span>
                                        <span class="font-mono-data text-slate-900">${UI.formatMoney(amt)} (${pct}%)</span>
                                    </div>
                                    <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div class="bg-orange-500 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                expContainer.innerHTML = `<div class="py-8 text-center text-slate-400 text-xs">No operating expenses recorded for this date range.</div>`;
            }

            // Render Top Products Table
            const tpList = document.getElementById('top-products-list');
            if (r.top_products && r.top_products.length > 0) {
                tpList.innerHTML = r.top_products.map((p, idx) => `
                    <tr class="hover:bg-slate-50/80">
                        <td class="font-medium text-slate-900 text-xs py-3">
                            <span class="inline-block w-4 text-center font-bold ${idx === 0 ? 'text-amber-500' : 'text-slate-400'}">${idx + 1}.</span>
                            ${p.product_name}
                        </td>
                        <td class="text-xs text-slate-500 py-3">${p.category_name}</td>
                        <td class="data-number text-right text-xs py-3">${p.total_units}</td>
                        <td class="data-number text-right text-xs font-semibold text-blue-600 py-3">${UI.formatMoney(p.total_sales)}</td>
                    </tr>
                `).join('');
            } else {
                tpList.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-400 text-xs">No sales recorded in this period.</td></tr>`;
            }
            
        } catch (err) {
            UI.toast(err.message, 'error');
        } finally {
            UI.setLoading(false);
        }
    },
    
    async loadValuation() {
        const tbody = document.getElementById('val-list');
        const tfoot = document.getElementById('val-foot');
        if (!tbody) return;
        
        try {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-slate-400 text-xs">Loading asset valuation...</td></tr>`;
            const res = await API.get('reports/inventory_valuation');
            const data = res.data.valuation;
            this.currentValuationData = data;
            
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-slate-400 text-xs">No active inventory items found.</td></tr>`;
                tfoot.classList.add('hidden');
                return;
            }
            
            let totalQty = 0;
            let totalVal = 0;
            
            tbody.innerHTML = data.map(item => {
                const qty = parseFloat(item.total_qty);
                const val = parseFloat(item.total_value);
                totalQty += qty;
                totalVal += val;
                return `
                    <tr class="hover:bg-slate-50/80">
                        <td class="font-medium text-slate-900 text-xs py-2.5">${item.product_name}</td>
                        <td class="text-xs text-slate-500 py-2.5">${item.category_name}</td>
                        <td class="data-number text-right text-xs py-2.5">${qty}</td>
                        <td class="data-number text-right text-xs font-semibold text-blue-700 py-2.5">${UI.formatMoney(val)}</td>
                    </tr>
                `;
            }).join('');
            
            tfoot.innerHTML = `
                <tr>
                    <td class="py-3 px-4 text-xs font-bold" colspan="2">Total Inventory Valuation</td>
                    <td class="py-3 px-4 data-number text-right text-xs font-bold">${totalQty} units</td>
                    <td class="py-3 px-4 data-number text-right text-sm font-bold text-blue-700">${UI.formatMoney(totalVal)}</td>
                </tr>
            `;
            tfoot.classList.remove('hidden');
            
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-red-500 text-xs">Failed to load asset valuation.</td></tr>`;
        }
    },

    exportCSV() {
        if (!this.currentReportData) {
            UI.toast('Please generate a report first.', 'error');
            return;
        }

        const r = this.currentReportData;
        let csv = "EaseBus Financial & Analytics Statement\n";
        csv += `Period: ${r.period.start} to ${r.period.end}\n\n`;
        csv += "Metric,Value\n";
        csv += `Gross Revenue,${r.revenue}\n`;
        csv += `Cost of Goods Sold (COGS),${r.cogs}\n`;
        csv += `Gross Profit,${r.gross_profit}\n`;
        csv += `Gross Margin (%),${r.gross_margin_percent}%\n`;
        csv += `Operating Expenses,${r.operating_expenses}\n`;
        csv += `Net Profit,${r.net_profit}\n`;
        csv += `Net Margin (%),${r.net_margin_percent}%\n`;
        csv += `Total Orders,${r.order_count}\n`;
        csv += `Average Order Value,${r.avg_order_value}\n`;
        csv += `Current Inventory Valuation,${r.current_inventory_value}\n\n`;

        if (r.expense_breakdown && r.expense_breakdown.length > 0) {
            csv += "Expense Category,Amount\n";
            r.expense_breakdown.forEach(e => {
                csv += `"${e.category_name}",${e.total_amount}\n`;
            });
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `EaseBus_Report_${r.period.start}_to_${r.period.end}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        UI.toast('Report CSV exported successfully');
    },

    printReport() {
        window.print();
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'reports') {
    window.Reports.render(document.getElementById('screen-container'));
}
