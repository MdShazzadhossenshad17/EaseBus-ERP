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

if (empty($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$userRole = $_SESSION['user_role'] ?? 'guest';
$biz = Database::getBusinessSettings();
$csrfToken = generateCsrfToken();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - <?php echo esc($biz['name']); ?></title>
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    
    <!-- Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
    
    <!-- CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../assets/css/app.css">
    
    <!-- State -->
    <script>
        window.APP_CONFIG = {
            name: "<?php echo esc($biz['name']); ?>",
            currency: "<?php echo esc($biz['currency']); ?>",
            currencySymbol: "<?php echo esc($biz['currency_symbol']); ?>",
            userRole: "<?php echo esc($userRole); ?>",
            username: "<?php echo esc($_SESSION['username'] ?? 'User'); ?>",
            csrfToken: "<?php echo esc($csrfToken); ?>"
        };
        try {
            sessionStorage.setItem('csrf_token', window.APP_CONFIG.csrfToken);
        } catch(e) {}
    </script>
</head>
<body class="bg-slate-50 text-slate-900 font-inter antialiased flex h-screen overflow-hidden">

    <!-- Sidebar -->
    <aside id="sidebar" class="bg-slate-900 text-white w-64 flex-shrink-0 flex flex-col h-full transition-transform duration-300 transform -translate-x-full md:translate-x-0 absolute md:relative z-20">
        <div class="h-16 flex items-center px-5 border-b border-slate-800">
            <a href="#dashboard" class="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
                <img src="../assets/img/logo.png" alt="EaseBus Logo" class="w-8 h-8 rounded-lg object-cover shadow-sm ring-1 ring-white/10">
                <h1 class="font-geist text-xl font-semibold tracking-tight text-white"><?php echo esc($biz['name']); ?></h1>
            </a>
            <button id="close-sidebar" class="ml-auto md:hidden text-slate-400 hover:text-white">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        
        <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1" id="main-nav">
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
            
            <?php if ($userRole === 'admin' || $userRole === 'manager'): ?>
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
                    <?php echo substr($_SESSION['username'] ?? 'U', 0, 1); ?>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium text-white"><?php echo esc($_SESSION['username'] ?? ''); ?></p>
                    <p class="text-xs text-slate-400 capitalize"><?php echo esc($userRole); ?></p>
                </div>
                <button id="logout-btn" class="ml-auto text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800" title="Log out">
                    <span class="material-symbols-outlined text-lg">logout</span>
                </button>
            </div>
        </div>
    </aside>

    <!-- Mobile overlay -->
    <div id="mobile-overlay" class="fixed inset-0 bg-slate-900 bg-opacity-50 z-10 hidden md:hidden"></div>

    <!-- Main content -->
    <div class="flex-1 flex flex-col h-full overflow-hidden">
        
        <!-- Top header -->
        <header class="bg-white border-b border-slate-200 h-16 flex items-center px-4 sm:px-6 z-10">
            <button id="open-sidebar" class="md:hidden mr-4 text-slate-500 hover:text-slate-700">
                <span class="material-symbols-outlined">menu</span>
            </button>
            
            <h2 id="page-title" class="font-geist text-xl font-semibold text-slate-800">Dashboard</h2>
            
            <div class="ml-auto flex items-center space-x-4">
                <button class="text-slate-400 hover:text-slate-600 relative">
                    <span class="material-symbols-outlined">notifications</span>
                    <span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white hidden" id="notif-badge"></span>
                </button>
            </div>
        </header>

        <!-- Main workspace -->
        <main id="workspace" class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 relative">
            <!-- Loading overlay -->
            <div id="loading-overlay" class="absolute inset-0 bg-slate-50 bg-opacity-75 z-50 flex items-center justify-center hidden">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            
            <!-- Screens render here -->
            <div id="screen-container"></div>
        </main>
    </div>

    <!-- Toast container -->
    <div id="toast-container" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2"></div>

    <!-- Scripts -->
    <script src="../assets/js/api.js"></script>
    <script src="../assets/js/components.js"></script>
    <script src="../assets/js/app.js"></script>
</body>
</html>
