<?php
/**
 * EaseBus — App Shell
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/auth_middleware.php';

if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_start();
}
header('Content-Type: text/html; charset=UTF-8');

if (empty($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$userRole = $_SESSION['user_role'] ?? 'guest';
$biz = Database::getBusinessSettings();
$csrfToken = generateCsrfToken();
$username = $_SESSION['username'] ?? 'User';
$jsUsername = json_encode($username, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$jsCurrency = json_encode($biz['currency'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$jsCurrencySymbol = json_encode($biz['currency_symbol'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$jsUserRole = json_encode($userRole, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$jsAppName = json_encode($biz['name'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$jsCsrf = json_encode($csrfToken, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$avatarInitial = esc(mb_substr($username, 0, 1));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Dashboard - <?php echo esc($biz['name']); ?></title>
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Hind+Siliguri:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+Bengali:wght@500;600;700&family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@600;700;800&family=Space+Grotesk:wght@500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
    
    <!-- CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../assets/css/app.css">
    
    <!-- State -->
    <script>
        window.APP_CONFIG = {
            name: <?php echo $jsAppName; ?>,
            currency: <?php echo $jsCurrency; ?>,
            currencySymbol: <?php echo $jsCurrencySymbol; ?>,
            userRole: <?php echo $jsUserRole; ?>,
            username: <?php echo $jsUsername; ?>,
            userId: <?php echo (int)($_SESSION['user_id'] ?? 0); ?>,
            csrfToken: <?php echo $jsCsrf; ?>
        };
        try {
            sessionStorage.setItem('csrf_token', window.APP_CONFIG.csrfToken);
        } catch(e) {}
    </script>
</head>
<body class="bg-slate-950 text-slate-100 font-inter antialiased flex h-screen overflow-hidden relative">
    <!-- Ambient light effects -->
    <div class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>

    <!-- Sidebar -->
    <aside id="sidebar" class="bg-slate-900 text-white w-64 flex-shrink-0 flex flex-col h-full transition-transform duration-300 transform -translate-x-full md:translate-x-0 absolute md:relative z-20 border-r border-slate-800">
        <div class="h-16 flex items-center px-5 border-b border-slate-800">
            <a id="brand-logo-link" href="#dashboard" class="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
                <img src="../assets/img/logo.png" alt="EaseBus Logo" class="w-8 h-8 rounded-lg object-cover shadow-sm ring-1 ring-white/10">
                <h1 id="brand-name-display" class="font-geist text-xl font-semibold tracking-tight text-white">EaseBus</h1>
            </a>
            <button id="close-sidebar" class="ml-auto md:hidden text-slate-400 hover:text-white">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        
        <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1" id="main-nav">
            <?php if ($userRole === 'creator' || strtolower($_SESSION['username'] ?? '') === 'shad@dbms.com'): ?>
            <div id="creator-suite-header" class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-slate-800/80 mb-2">
                <span class="material-symbols-outlined text-base text-amber-400">shield</span> Creator Master Suite
            </div>
            <a href="#creator-overview" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-amber-400">dashboard</span> Platform Overview
            </a>
            <a href="#creator-stores" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-blue-400">store</span> Stores & Tenants
            </a>
            <a href="#creator-transactions" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-emerald-400">swap_horiz</span> Live Transactions
            </a>
            <a href="#creator-inventory" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-purple-400">inventory_2</span> Global Inventory
            </a>
            <a href="#creator-health" class="nav-item group flex items-center px-3 py-2 text-sm font-semibold rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-cyan-400">dns</span> Server & DB Health
            </a>
            <?php else: ?>
            <a href="#dashboard" class="nav-item active group flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">
                <span class="material-symbols-outlined mr-3 text-lg">dashboard</span> Dashboard
            </a>
            
            <div class="pt-4 pb-1">
                <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Business Operations</p>
            </div>
            
            <a href="#products" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">inventory_2</span> Products & Stock
            </a>
            <a href="#inventory" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">warehouse</span> Inventory Management
            </a>
            <a href="#suppliers" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">local_shipping</span> Suppliers
            </a>
            <a href="#orders" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">shopping_cart</span> Orders & Sales
            </a>
            <a href="#deliveries" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">moped</span> Deliveries & Logistics
            </a>
            <a href="#returns" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">assignment_return</span> Customer Returns
            </a>
            <a href="#customers" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">people</span> Customers
            </a>
            
            <div class="pt-4 pb-1">
                <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Finance & Equity</p>
            </div>
            
            <a href="#finance" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">account_balance_wallet</span> Accounts & Cash
            </a>
            <a href="#expenses" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">receipt_long</span> Expenses
            </a>
            <a href="#investors" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">handshake</span> Investors & Equity
            </a>
            
            <div class="pt-4 pb-1">
                <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Management</p>
            </div>
            
            <a href="#reports" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">bar_chart</span> Analytics & Reports
            </a>
            <a href="#users" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">manage_accounts</span> Users & Staff
            </a>
            <a href="#settings" class="nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white">
                <span class="material-symbols-outlined mr-3 text-lg text-slate-400 group-hover:text-white">settings</span> Settings
            </a>
            <?php endif; ?>
        </nav>
        
        <div class="p-4 border-t border-slate-800">
            <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                    <?php echo $avatarInitial; ?>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium text-white"><?php echo esc($_SESSION['username'] ?? ''); ?></p>
                    <p class="text-xs text-slate-400 capitalize"><?php echo esc($userRole); ?></p>
                </div>
                <button id="logout-btn" onclick="App.logout(event)" class="ml-auto text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all cursor-pointer" title="Log out">
                    <span class="material-symbols-outlined text-lg">logout</span>
                </button>
            </div>
        </div>
    </aside>

    <!-- Mobile overlay -->
    <div id="mobile-overlay" class="fixed inset-0 bg-slate-900 bg-opacity-50 z-10 hidden md:hidden"></div>

    <!-- Main content -->
    <div class="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        <!-- Top header -->
        <header class="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 h-16 flex items-center px-4 sm:px-6 z-10 text-white">
            <button id="open-sidebar" class="md:hidden mr-4 text-slate-400 hover:text-white">
                <span class="material-symbols-outlined">menu</span>
            </button>
            
            <h2 id="page-title" class="font-geist text-xl font-semibold text-slate-100">Dashboard</h2>
            
            <div class="ml-auto flex items-center space-x-4">
                <button class="text-slate-400 hover:text-white relative">
                    <span class="material-symbols-outlined">notifications</span>
                    <span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-900 hidden" id="notif-badge"></span>
                </button>
                <button id="header-logout-btn" onclick="App.logout(event)" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-outfit rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-all cursor-pointer" title="Log Out">
                    <span class="material-symbols-outlined text-sm">logout</span> Log Out
                </button>
            </div>
        </header>

        <!-- Main workspace -->
        <main id="workspace" class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950 relative text-slate-100">
            <!-- Loading overlay -->
            <div id="loading-overlay" class="absolute inset-0 bg-slate-950 bg-opacity-75 z-50 flex items-center justify-center hidden">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            
            <!-- Screens render here -->
            <div id="screen-container"></div>
        </main>
    </div>

    <!-- Toast container -->
    <div id="toast-container" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2"></div>

    <!-- Scripts -->
    <script src="../assets/js/api.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/components.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/dashboard.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/products.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/inventory.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/suppliers.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/orders.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/deliveries.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/returns.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/customers.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/finance.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/expenses.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/investors.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/reports.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/users.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/creator.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/settings.js?v=<?php echo time(); ?>"></script>
    <script src="../assets/js/app.js?v=<?php echo time(); ?>"></script>
</body>
</html>
