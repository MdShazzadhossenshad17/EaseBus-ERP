/**
 * BusinessM — UI Components
 */

const UI = {
    _lastToast: '',
    _lastToastTime: 0,
    /** Show a toast notification */
    toast(message, type = 'success') {
        const now = Date.now();
        if (this._lastToast === message && (now - this._lastToastTime) < 1500) {
            return; // Ignore rapid duplicate toasts
        }
        this._lastToast = message;
        this._lastToastTime = now;

        const container = document.getElementById('toast-container');
        if (!container) return;

        // Keep maximum 3 toasts visible at once
        while (container.children.length >= 3) {
            container.removeChild(container.firstChild);
        }

        const toast = document.createElement('div');
        const bg = type === 'success' ? 'bg-emerald-600 border border-emerald-500' : (type === 'error' ? 'bg-red-600 border border-red-500' : (type === 'warning' ? 'bg-amber-600 border border-amber-500' : 'bg-blue-600 border border-blue-500'));
        
        toast.className = `flex items-center justify-between p-3 mb-2 text-white rounded-xl shadow-xl transition-all duration-300 transform translate-x-full opacity-0 ${bg} font-jakarta text-xs font-semibold z-[99999]`;
        toast.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-base">${type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : (type === 'warning' ? 'warning' : 'info'))}</span>
                <span>${message}</span>
            </div>
            <button class="ml-3 opacity-75 hover:opacity-100 p-0.5 rounded hover:bg-white/20 cursor-pointer" onclick="this.parentElement.remove()">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /** Show/hide loading overlay */
    setLoading(isLoading) {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            if (isLoading) loader.classList.remove('hidden');
            else loader.classList.add('hidden');
        }
    },

    /** Format money */
    formatMoney(amount, showSymbol = true) {
        let symbol = window.APP_CONFIG?.currencySymbol || '৳';
        if (typeof symbol !== 'string' || symbol.includes('ó') || symbol.includes('º') || symbol.includes('Ã')) {
            symbol = '৳';
        }
        const num = parseFloat(amount);
        if (isNaN(num)) return showSymbol ? `${symbol} 0.00` : '0.00';
        const formatted = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const prefix = num < 0 ? '-' : '';
        return showSymbol ? `${prefix}${symbol} ${formatted}` : `${prefix}${formatted}`;
    },

    /** Format date */
    formatDate(dateString) {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    /** Render an empty state */
    emptyState(icon, title, description, actionHtml = '') {
        return `
            <div class="flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-slate-200">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <span class="material-symbols-outlined text-3xl text-slate-400">${icon}</span>
                </div>
                <h3 class="text-lg font-geist font-medium text-slate-900 mb-1">${title}</h3>
                <p class="text-sm text-slate-500 mb-6 max-w-sm">${description}</p>
                ${actionHtml}
            </div>
        `;
    }
};

window.isStoreOwner = function(user) {
    if (!user) {
        user = (typeof API !== 'undefined' && API.getCurrentUser) ? API.getCurrentUser() : null;
    }
    if (!user) {
        try { user = JSON.parse(localStorage.getItem('easebus_user') || 'null'); } catch(e) {}
    }
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'admin' || role === 'owner' || role === 'creator' || !user.created_by;
};

window.isCreatorUser = function(user) {
    if (!user) {
        user = (typeof API !== 'undefined' && API.getCurrentUser) ? API.getCurrentUser() : null;
    }
    if (!user) {
        try { user = JSON.parse(localStorage.getItem('easebus_user') || 'null'); } catch(e) {}
    }
    if (!user) {
        try { user = JSON.parse(sessionStorage.getItem('easebus_user') || 'null'); } catch(e) {}
    }
    if (!user) {
        // If we are currently in Creator portal route and not logged out, return true
        if (typeof window !== 'undefined' && window.location && window.location.hash && window.location.hash.startsWith('#creator')) {
            return true;
        }
        return false;
    }
    const role = (user.role || '').toLowerCase();
    const uname = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const fullName = (user.full_name || '').toLowerCase();
    return role === 'creator' || 
           role === 'platform creator' ||
           uname === 'shad@dbms.com' || 
           email === 'shad@dbms.com' || 
           uname === 'mdshazzadhossenshad586@gmail.com' || 
           email === 'mdshazzadhossenshad586@gmail.com' || 
           fullName.includes('shazzad') ||
           fullName.includes('shad') ||
           Boolean(window.Creator && window.Creator.isReadOnlyMode) ||
           (typeof window !== 'undefined' && window.location && window.location.hash && window.location.hash.startsWith('#creator'));
};
