/**
 * BusinessM — UI Components
 */

const UI = {
    /** Show a toast notification */
    toast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        const bg = type === 'success' ? 'bg-green-600' : (type === 'error' ? 'bg-red-600' : 'bg-blue-600');
        
        toast.className = `flex items-center p-4 mb-2 text-white rounded shadow-lg transition-all duration-300 transform translate-x-full opacity-0 ${bg}`;
        toast.innerHTML = `
            <div class="text-sm font-medium">${message}</div>
            <button class="ml-4 opacity-75 hover:opacity-100" onclick="this.parentElement.remove()">
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
        }, 5000);
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
        const symbol = window.APP_CONFIG?.currencySymbol || '৳';
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
