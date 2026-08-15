/**
 * BusinessM — API Client Wrapper
 */

const API = {
    baseUrl: '../api',

    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}/${endpoint}`;
        
        // Get CSRF token if available
        let csrfToken = '';
        try {
            csrfToken = sessionStorage.getItem('csrf_token') || (window.APP_CONFIG && window.APP_CONFIG.csrfToken) || '';
        } catch(e) {}

        const headers = {
            'Accept': 'application/json'
        };

        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
            headers['X-CSRF-Token'] = csrfToken;
            if (data instanceof FormData) {
                // Fetch automatically sets Content-Type for FormData
            } else {
                headers['Content-Type'] = 'application/json';
            }
        }

        const options = {
            method,
            headers,
        };

        if (data && method !== 'GET') {
            options.body = data instanceof FormData ? data : JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            // Handle global 401 Unauthorized
            if (response.status === 401 && !endpoint.startsWith('auth/')) {
                window.location.href = 'login.php';
                return null;
            }

            // Save new CSRF token if provided
            if (result.csrf_token) {
                sessionStorage.setItem('csrf_token', result.csrf_token);
            }

            if (!response.ok) {
                let msg = result.message || 'An error occurred';
                if (result.errors) {
                    msg += ': ' + Object.values(result.errors).join(' ');
                }
                throw new Error(msg);
            }

            return result;
        } catch (error) {
            console.error(`API Error (${method} ${endpoint}):`, error);
            throw error;
        }
    },

    get(endpoint) { return this.request(endpoint, 'GET'); },
    post(endpoint, data) { return this.request(endpoint, 'POST', data); },
    put(endpoint, data) { return this.request(endpoint, 'PUT', data); },
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }
};
