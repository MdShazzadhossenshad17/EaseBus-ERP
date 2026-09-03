/**
 * EaseBus ERP — Frontend Application Architecture & Routing Core
 * Coordinates client-side navigation, screen rendering, offline-state caching, and UI workflows
 */

export const FrontendApp = {
  version: '4.1.0',
  name: 'EaseBus ERP',
  currentScreen: 'dashboard',

  screens: [
    'dashboard',
    'orders',
    'products',
    'customers',
    'suppliers',
    'deliveries',
    'returns',
    'expenses',
    'finance',
    'inventory',
    'investors',
    'reports',
    'settings',
    'users',
    'creator'
  ],

  init() {
    console.log(`[EaseBus Frontend] Initialized v${this.version}`);
    this.bindEvents();
  },

  bindEvents() {
    window.addEventListener('popstate', () => {
      const path = window.location.hash.replace('#', '') || 'dashboard';
      this.navigateTo(path);
    });
  },

  navigateTo(screenId) {
    if (!this.screens.includes(screenId)) {
      screenId = 'dashboard';
    }
    this.currentScreen = screenId;
    window.location.hash = `#${screenId}`;
    console.log(`[EaseBus Frontend] Switched to screen: ${screenId}`);
  }
};

export default FrontendApp;
