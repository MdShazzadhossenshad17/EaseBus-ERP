/**
 * EaseBus — Real-Time Business Profile, Logo Branding & Settings Control Panel
 */

window.Settings = {
    activeTab: 'branding',

    async render(container) {
        container.innerHTML = `
            <!-- Page Header -->
            <div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-jakarta">
                <div>
                    <h1 class="text-2xl font-bold text-white tracking-tight">Business Profile & Settings</h1>
                    <p class="text-slate-400 text-xs mt-1 font-inter">Manage your company branding, logo, store contact details, currency, and account security.</p>
                </div>
            </div>

            <!-- Tab Navigation Header -->
            <div class="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3 font-outfit">
                <button onclick="Settings.switchTab('branding')" id="tab-btn-branding" class="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white border border-blue-500/30 shadow-md flex items-center gap-2 transition-all cursor-pointer">
                    <span class="material-symbols-outlined text-sm">storefront</span> Business Profile & Logo
                </button>
                <button onclick="Settings.switchTab('security')" id="tab-btn-security" class="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-2 transition-all cursor-pointer">
                    <span class="material-symbols-outlined text-sm">lock_reset</span> Account Security
                </button>
            </div>

            <div class="max-w-4xl font-jakarta">
                <!-- Tab 1: Business Profile & Branding -->
                <div id="tab-content-branding" class="space-y-6">
                    <div class="card p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
                        <!-- Live Branding Preview Banner -->
                        <div class="mb-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                            <div id="settings-logo-preview-container" class="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg overflow-hidden border border-blue-400/40">
                                <span id="settings-logo-text" class="font-outfit text-2xl">B</span>
                                <img id="settings-logo-img" src="" alt="Business Logo" class="w-full h-full object-cover hidden">
                            </div>
                            <div class="text-center sm:text-left flex-1">
                                <h3 id="settings-preview-biz-name" class="text-lg font-bold text-white font-jakarta">My Business</h3>
                                <p id="settings-preview-owner-name" class="text-xs text-slate-400 font-inter mt-0.5">Store Owner Workspace • Real-Time Sync Active</p>
                                <div class="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-outfit bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live Brand Card
                                </div>
                            </div>
                        </div>

                        <form id="biz-settings-form" class="space-y-5">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Business / Company Name *</label>
                                    <input type="text" name="name" id="biz-name" class="form-input bg-slate-950 border-slate-800 text-white font-semibold text-xs py-2.5" placeholder="e.g. Apex Enterprise / EaseBus Store" required oninput="Settings.updateLivePreview()">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Store Owner Full Name *</label>
                                    <input type="text" name="full_name" id="biz-owner-name" class="form-input bg-slate-950 border-slate-800 text-white font-semibold text-xs py-2.5" placeholder="Store Owner Name" required oninput="Settings.updateLivePreview()">
                                </div>
                            </div>

                            <!-- Logo URL / Preset Picker -->
                            <div>
                                <div class="flex justify-between items-center mb-2">
                                    <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider font-outfit">Business Logo Image URL</label>
                                    <span class="text-[11px] text-slate-400 font-inter">Paste Logo URL or Pick Preset Badge</span>
                                </div>
                                <input type="url" name="business_logo" id="biz-logo-url" class="form-input bg-slate-950 border-slate-800 text-white text-xs py-2.5 font-mono mb-2" placeholder="https://domain.com/logo.png" oninput="Settings.updateLivePreview()">
                                
                                <div class="flex flex-wrap items-center gap-2 font-outfit">
                                    <span class="text-xs text-slate-400">Quick Logo Presets:</span>
                                    <button type="button" onclick="Settings.setPresetLogo('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80')" class="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition-colors">💎 Modern</button>
                                    <button type="button" onclick="Settings.setPresetLogo('https://images.unsplash.com/photo-1633409325618-4f094c355a6d?w=150&auto=format&fit=crop&q=80')" class="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors">🚀 Tech</button>
                                    <button type="button" onclick="Settings.setPresetLogo('https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=80')" class="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-colors">🏬 Retail</button>
                                    <button type="button" onclick="Settings.setPresetLogo('')" class="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors">Clear Logo</button>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Contact Phone</label>
                                    <input type="text" name="phone" id="biz-phone" class="form-input bg-slate-950 border-slate-800 text-white font-digit text-xs py-2.5" placeholder="+880 1700 000000">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Business Email</label>
                                    <input type="email" name="email" id="biz-email" class="form-input bg-slate-950 border-slate-800 text-white text-xs py-2.5" placeholder="store@business.com">
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Currency Code</label>
                                    <input type="text" name="currency" id="biz-currency" class="form-input bg-slate-950 border-slate-800 text-white font-mono text-xs py-2.5" value="BDT">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Currency Symbol *</label>
                                    <input type="text" name="currency_symbol" id="biz-symbol" class="form-input bg-slate-950 border-slate-800 text-white font-mono text-xs py-2.5" value="৳" required>
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Store Address</label>
                                <textarea name="address" id="biz-address" class="form-input bg-slate-950 border-slate-800 text-white text-xs h-20 py-2.5" placeholder="Enter physical store / office address..."></textarea>
                            </div>

                            <div class="pt-4 flex justify-end">
                                <button type="submit" class="btn btn-primary bg-blue-600 hover:bg-blue-500 font-outfit font-bold text-xs py-2.5 px-6 shadow-md border border-blue-400/30 flex items-center gap-2" id="save-biz-btn">
                                    <span class="material-symbols-outlined text-sm">save</span> Save Business Profile & Logo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Tab 2: Account Security -->
                <div id="tab-content-security" class="hidden space-y-6">
                    <div class="card p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
                        <h3 class="text-lg font-bold text-white font-jakarta mb-1">Change Account Password</h3>
                        <p class="text-slate-400 text-xs font-inter mb-6">Ensure your account is using a long, secure password.</p>

                        <form id="security-form" class="space-y-4 max-w-md">
                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Current Password *</label>
                                <input type="password" name="current_password" id="sec-current-pass" class="form-input bg-slate-950 border-slate-800 text-white text-xs py-2.5" required>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">New Password (min 8 chars) *</label>
                                <input type="password" name="new_password" id="sec-new-pass" class="form-input bg-slate-950 border-slate-800 text-white text-xs py-2.5" minlength="8" required>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-outfit">Confirm New Password *</label>
                                <input type="password" name="confirm_password" id="sec-confirm-pass" class="form-input bg-slate-950 border-slate-800 text-white text-xs py-2.5" minlength="8" required>
                            </div>

                            <div class="pt-2">
                                <button type="submit" class="btn btn-primary bg-amber-600 hover:bg-amber-500 font-outfit font-bold text-xs py-2.5 px-6 shadow-md border border-amber-400/30 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-sm">lock_reset</span> Update Account Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        await this.loadData();
    },

    switchTab(tab) {
        this.activeTab = tab;
        const btnBranding = document.getElementById('tab-btn-branding');
        const btnSecurity = document.getElementById('tab-btn-security');
        const contentBranding = document.getElementById('tab-content-branding');
        const contentSecurity = document.getElementById('tab-content-security');

        if (tab === 'branding') {
            if (btnBranding) { btnBranding.className = "px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white border border-blue-500/30 shadow-md flex items-center gap-2 transition-all cursor-pointer"; }
            if (btnSecurity) { btnSecurity.className = "px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-2 transition-all cursor-pointer"; }
            if (contentBranding) contentBranding.classList.remove('hidden');
            if (contentSecurity) contentSecurity.classList.add('hidden');
        } else {
            if (btnSecurity) { btnSecurity.className = "px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white border border-amber-500/30 shadow-md flex items-center gap-2 transition-all cursor-pointer"; }
            if (btnBranding) { btnBranding.className = "px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-2 transition-all cursor-pointer"; }
            if (contentSecurity) contentSecurity.classList.remove('hidden');
            if (contentBranding) contentBranding.classList.add('hidden');
        }
    },

    setPresetLogo(url) {
        const input = document.getElementById('biz-logo-url');
        if (input) {
            input.value = url;
            this.updateLivePreview();
        }
    },

    updateLivePreview() {
        const name = document.getElementById('biz-name')?.value || 'My Business';
        const owner = document.getElementById('biz-owner-name')?.value || '';
        const logoUrl = document.getElementById('biz-logo-url')?.value || '';

        const nameEl = document.getElementById('settings-preview-biz-name');
        const ownerEl = document.getElementById('settings-preview-owner-name');
        const textEl = document.getElementById('settings-logo-text');
        const imgEl = document.getElementById('settings-logo-img');

        if (nameEl) nameEl.textContent = name;
        if (ownerEl) ownerEl.textContent = owner ? (owner + ' • Store Owner') : 'Store Owner Workspace';

        const initial = (name || 'B').charAt(0).toUpperCase();

        if (logoUrl) {
            if (imgEl) { imgEl.src = logoUrl; imgEl.classList.remove('hidden'); }
            if (textEl) textEl.classList.add('hidden');
        } else {
            if (imgEl) imgEl.classList.add('hidden');
            if (textEl) { textEl.textContent = initial; textEl.classList.remove('hidden'); }
        }
    },

    async loadData() {
        try {
            const res = await API.get('settings/profile');
            const prof = res.data.profile || {};
            const biz = res.data.business || {};

            const nameInput = document.getElementById('biz-name');
            const ownerInput = document.getElementById('biz-owner-name');
            const logoInput = document.getElementById('biz-logo-url');
            const phoneInput = document.getElementById('biz-phone');
            const emailInput = document.getElementById('biz-email');
            const currInput = document.getElementById('biz-currency');
            const symInput = document.getElementById('biz-symbol');
            const addrInput = document.getElementById('biz-address');

            if (nameInput) nameInput.value = prof.business_name || biz.name || '';
            if (ownerInput) ownerInput.value = prof.full_name || '';
            if (logoInput) logoInput.value = prof.business_logo || biz.logo_path || '';
            if (phoneInput) phoneInput.value = prof.phone || biz.phone || '';
            if (emailInput) emailInput.value = prof.email || biz.email || '';
            if (currInput) currInput.value = biz.currency || 'BDT';
            if (symInput) symInput.value = prof.currency_symbol || biz.currency_symbol || '৳';
            if (addrInput) addrInput.value = prof.address || biz.address || '';

            this.updateLivePreview();

            // Forms listeners
            document.getElementById('biz-settings-form')?.addEventListener('submit', this.saveBusiness.bind(this));
            document.getElementById('security-form')?.addEventListener('submit', this.saveSecurity.bind(this));

        } catch (e) {
            UI.toast('Failed to load business profile', 'error');
        }
    },

    async saveBusiness(e) {
        e.preventDefault();
        const btn = document.getElementById('save-biz-btn');
        if (btn) btn.disabled = true;

        const payload = {
            business_name: document.getElementById('biz-name').value,
            full_name: document.getElementById('biz-owner-name').value,
            business_logo: document.getElementById('biz-logo-url').value,
            phone: document.getElementById('biz-phone').value,
            email: document.getElementById('biz-email').value,
            currency: document.getElementById('biz-currency').value,
            currency_symbol: document.getElementById('biz-symbol').value,
            address: document.getElementById('biz-address').value
        };

        try {
            const res = await API.request('settings/profile', 'POST', payload);
            UI.toast('Business profile and logo updated successfully!', 'success');

            if (window.APP_CONFIG) {
                window.APP_CONFIG.currencySymbol = payload.currency_symbol || '৳';
            }

            const currentUser = API.getCurrentUser() || {};
            currentUser.business_name = payload.business_name;
            currentUser.full_name = payload.full_name;
            currentUser.business_logo = payload.business_logo;
            API.setCurrentUser(currentUser);

            if (window.App && typeof window.App.updateTopBarProfile === 'function') {
                window.App.updateTopBarProfile(currentUser);
            }
        } catch(err) {
            UI.toast('Failed to update business profile: ' + err.message, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    async saveSecurity(e) {
        e.preventDefault();
        const currentPass = document.getElementById('sec-current-pass').value;
        const newPass = document.getElementById('sec-new-pass').value;
        const confirmPass = document.getElementById('sec-confirm-pass').value;

        if (newPass !== confirmPass) {
            UI.toast('New password and confirm password do not match.', 'error');
            return;
        }

        try {
            await API.request('auth/change-password', 'POST', {
                current_password: currentPass,
                new_password: newPass,
                confirm_password: confirmPass
            });
            UI.toast('Account password updated successfully!', 'success');
            document.getElementById('security-form').reset();
        } catch(err) {
            UI.toast(err.message || 'Failed to update password', 'error');
        }
    }
};
