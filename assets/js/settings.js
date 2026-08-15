/**
 * BusinessM — Settings UI Module
 */

window.Settings = {
    async render(container) {
        container.innerHTML = `
            <div class="mb-6">
                <h1 class="text-2xl font-geist font-semibold text-slate-900">Settings</h1>
                <p class="text-slate-500 mt-1">Manage application configuration.</p>
            </div>
            
            <div class="max-w-3xl">
                <div class="card mb-6">
                    <div class="card-header">
                        <h3 class="card-title">Business Profile</h3>
                    </div>
                    <div class="card-body">
                        <form id="biz-settings-form" class="space-y-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="form-label">Business Name *</label>
                                    <input type="text" name="name" id="biz-name" class="form-input" required>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="form-label">Currency *</label>
                                        <input type="text" name="currency" id="biz-currency" class="form-input" required>
                                    </div>
                                    <div>
                                        <label class="form-label">Symbol *</label>
                                        <input type="text" name="currency_symbol" id="biz-symbol" class="form-input" required>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="form-label">Phone</label>
                                    <input type="text" name="phone" id="biz-phone" class="form-input">
                                </div>
                                <div>
                                    <label class="form-label">Email</label>
                                    <input type="email" name="email" id="biz-email" class="form-input">
                                </div>
                            </div>
                            
                            <div>
                                <label class="form-label">Address</label>
                                <textarea name="address" id="biz-address" class="form-input h-20"></textarea>
                            </div>
                            
                            <div class="p-4 bg-slate-50 rounded border border-slate-200 mt-4">
                                <h4 class="font-medium text-sm mb-3">Tax Settings</h4>
                                <div class="flex items-center gap-4">
                                    <label class="flex items-center gap-2 text-sm">
                                        <input type="checkbox" name="tax_enabled" id="biz-tax-enabled" class="rounded border-slate-300">
                                        Enable Tax globally
                                    </label>
                                    <div class="flex items-center gap-2">
                                        <span class="text-sm text-slate-500">Default Rate (%)</span>
                                        <input type="number" step="0.01" name="tax_rate" id="biz-tax-rate" class="form-input w-24">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="pt-4 flex justify-end">
                                <button type="submit" class="btn btn-primary" id="save-biz-btn">Save Business Profile</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        await this.loadData();
    },
    
    async loadData() {
        try {
            const res = await API.get('settings/business');
            const biz = res.data.business;
            
            document.getElementById('biz-name').value = biz.name;
            document.getElementById('biz-currency').value = biz.currency;
            document.getElementById('biz-symbol').value = biz.currency_symbol;
            document.getElementById('biz-phone').value = biz.phone || '';
            document.getElementById('biz-email').value = biz.email || '';
            document.getElementById('biz-address').value = biz.address || '';
            document.getElementById('biz-tax-enabled').checked = biz.tax_enabled == 1;
            document.getElementById('biz-tax-rate').value = biz.tax_rate;
            
            // Attach listener
            document.getElementById('biz-settings-form').addEventListener('submit', this.saveBusiness.bind(this));
            
        } catch (e) {
            UI.toast('Failed to load settings', 'error');
        }
    },
    
    async saveBusiness(e) {
        e.preventDefault();
        const form = e.target;
        const btn = document.getElementById('save-biz-btn');
        
        btn.disabled = true;
        btn.textContent = 'Saving...';
        
        try {
            await API.put('settings/business', {
                name: form.name.value,
                currency: form.currency.value,
                currency_symbol: form.currency_symbol.value,
                phone: form.phone.value,
                email: form.email.value,
                address: form.address.value,
                tax_enabled: form.tax_enabled.checked ? 1 : 0,
                tax_rate: form.tax_rate.value || 0
            });
            
            UI.toast('Business profile updated');
            
            // Update global config and title
            window.APP_CONFIG.name = form.name.value;
            window.APP_CONFIG.currencySymbol = form.currency_symbol.value;
            document.querySelector('#sidebar h1').textContent = form.name.value;
            
        } catch (err) {
            UI.toast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Business Profile';
        }
    }
};

// Auto-register with router if active
if (window.App && window.App.currentRoute === 'settings') {
    window.Settings.render(document.getElementById('screen-container'));
}
