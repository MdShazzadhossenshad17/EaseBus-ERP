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
        
        <div class="p-4 border-t border-slate-800 bg-slate-950/80">
            <div class="flex items-center gap-3">
                <div id="user-avatar" class="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-inner overflow-hidden border border-blue-400/30 shrink-0 font-outfit">
                    <?php echo $avatarInitial; ?>
                </div>
                <div class="flex-1 min-w-0">
                    <p id="user-display-name" class="text-xs font-bold text-white truncate font-jakarta"><?php echo esc($_SESSION['username'] ?? ''); ?></p>
                    <p id="user-role-display" class="text-[11px] text-blue-400 font-semibold truncate font-outfit capitalize"><?php echo esc($userRole); ?></p>
                </div>
                <button id="logout-btn" onclick="App.logout(event)" class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-red-500/20 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all cursor-pointer shrink-0" title="Sign Out">
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
        <header class="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 h-16 flex items-center px-4 sm:px-6 z-50 relative text-white">
            <button id="open-sidebar" class="md:hidden mr-4 text-slate-400 hover:text-white">
                <span class="material-symbols-outlined">menu</span>
            </button>
            
            <h2 id="page-title" class="font-geist text-xl font-semibold text-slate-100">Dashboard</h2>
            
            <div class="ml-auto flex items-center space-x-3 relative">
                <!-- Working Notifications Bell Dropdown -->
                <div class="relative">
                    <button id="notif-dropdown-btn" onclick="App.toggleNotifDropdown(event)" class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/90 border border-transparent hover:border-slate-700/60 transition-all relative cursor-pointer group shadow-sm" title="Notifications Center">
                        <span class="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">notifications</span>
                        <span class="absolute top-1.5 right-1.5 flex h-2.5 w-2.5" id="notif-badge">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 border border-slate-900"></span>
                        </span>
                    </button>

                    <!-- Redesigned Notifications Dropdown Panel -->
                    <div id="notif-dropdown-menu" class="hidden absolute right-0 mt-3 w-96 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/80 divide-y divide-slate-800/80 z-50 overflow-hidden font-jakarta animate-fade-in ring-1 ring-white/10">
                        <!-- Dropdown Header -->
                        <div class="p-4 bg-slate-950 flex items-center justify-between">
                            <div class="flex items-center gap-2.5">
                                <div class="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                                    <span class="material-symbols-outlined text-base">notifications_active</span>
                                </div>
                                <div>
                                    <h4 class="font-bold text-white text-xs font-outfit tracking-wide">Live Notification Feed</h4>
                                    <p class="text-[10px] text-slate-400 font-inter">Real-Time Store Activity & Alerts</p>
                                </div>
                            </div>
                            <button onclick="App.clearNotifs(event)" class="px-2.5 py-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/30 transition-all cursor-pointer">
                                Mark All Read
                            </button>
                        </div>

                        <!-- Notification List -->
                        <div class="max-h-80 overflow-y-auto divide-y divide-slate-800/60 text-xs" id="notif-list-container">
                            <!-- item 1: Order -->
                            <div class="p-3.5 hover:bg-slate-800/60 transition-colors flex items-start gap-3 group cursor-pointer">
                                <div class="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/20 group-hover:scale-105 transition-transform">
                                    <span class="material-symbols-outlined text-base">shopping_cart</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between">
                                        <p class="font-bold text-white text-[12px] truncate">Sales Engine Ready</p>
                                        <span class="text-[10px] text-slate-400 font-mono">Just now</span>
                                    </div>
                                    <p class="text-slate-300 text-[11px] mt-0.5 font-inter leading-relaxed">Orders, deliveries, and payment calculations synced real-time.</p>
                                    <div class="mt-1.5 flex items-center gap-2">
                                        <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">Sales Order</span>
                                    </div>
                                </div>
                            </div>

                            <!-- item 2: Logistics -->
                            <div class="p-3.5 hover:bg-slate-800/60 transition-colors flex items-start gap-3 group cursor-pointer">
                                <div class="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/20 group-hover:scale-105 transition-transform">
                                    <span class="material-symbols-outlined text-base">local_shipping</span>
                                    </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between">
                                        <p class="font-bold text-white text-[12px] truncate">Deliveries Synced</p>
                                        <span class="text-[10px] text-slate-400 font-mono">5 mins ago</span>
                                    </div>
                                    <p class="text-slate-300 text-[11px] mt-0.5 font-inter leading-relaxed">Active customer shipments tracking updated.</p>
                                    <div class="mt-1.5 flex items-center gap-2">
                                        <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">Logistics</span>
                                    </div>
                                </div>
                            </div>

                            <!-- item 3: Returns -->
                            <div class="p-3.5 hover:bg-slate-800/60 transition-colors flex items-start gap-3 group cursor-pointer">
                                <div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20 group-hover:scale-105 transition-transform">
                                    <span class="material-symbols-outlined text-base">assignment_return</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between">
                                        <p class="font-bold text-white text-[12px] truncate">Returns Workflow Updated</p>
                                        <span class="text-[10px] text-slate-400 font-mono">10 mins ago</span>
                                    </div>
                                    <p class="text-slate-300 text-[11px] mt-0.5 font-inter leading-relaxed">Returned consignments auto-list under Pending status with Remove Order option.</p>
                                    <div class="mt-1.5 flex items-center gap-2">
                                        <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">Customer Returns</span>
                                    </div>
                                </div>
                            </div>

                            <!-- item 4: Security -->
                            <div class="p-3.5 hover:bg-slate-800/60 transition-colors flex items-start gap-3 group cursor-pointer">
                                <div class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                                    <span class="material-symbols-outlined text-base">shield</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between">
                                        <p class="font-bold text-white text-[12px] truncate">Security & RBAC Active</p>
                                        <span class="text-[10px] text-slate-400 font-mono">15 mins ago</span>
                                    </div>
                                    <p class="text-slate-300 text-[11px] mt-0.5 font-inter leading-relaxed">Staff sub-accounts can manage daily operations while owner settings remain protected.</p>
                                    <div class="mt-1.5 flex items-center gap-2">
                                        <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Security</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Dropdown Footer -->
                        <div class="p-3 text-center bg-slate-950 font-outfit border-t border-slate-800/80">
                            <a href="#reports" onclick="App.closeAllDropdowns()" class="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1">
                                <span class="material-symbols-outlined text-sm">analytics</span> View All Store Analytics & Activity Logs
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Circular Profile Icon & Dropdown Trigger -->
                <div class="relative">
                    <button id="profile-dropdown-btn" onclick="App.toggleProfileDropdown(event)" class="flex items-center gap-2.5 p-1.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer shadow-md group">
                        <div class="relative w-9 h-9">
                            <div id="top-bar-avatar-container" class="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-inner overflow-hidden border border-blue-400/40">
                                <span id="top-bar-avatar-text" class="font-outfit text-sm"><?php echo $avatarInitial; ?></span>
                                <img id="top-bar-avatar-img" src="" alt="Business Logo" class="w-full h-full object-cover hidden">
                            </div>
                            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full ring-1 ring-emerald-400/50 z-10"></span>
                        </div>
                        <div class="hidden sm:flex flex-col text-left pr-1">
                            <span id="top-bar-biz-name" class="text-xs font-bold font-jakarta text-white group-hover:text-blue-300 transition-colors truncate max-w-[140px]"><?php echo esc($_SESSION['business_name'] ?? ($biz['name'] ?? 'eloria')); ?></span>
                            <span id="top-bar-owner-name" class="text-[10px] text-slate-400 font-inter truncate max-w-[140px]"><?php echo esc($_SESSION['username'] ?? ''); ?></span>
                        </div>
                        <span class="material-symbols-outlined text-slate-400 group-hover:text-white text-sm transition-transform duration-200" id="profile-dropdown-arrow">expand_more</span>
                    </button>

                    <!-- Interactive Profile Dropdown Panel -->
                    <div id="profile-dropdown-menu" class="hidden absolute right-0 top-full mt-2.5 w-72 bg-slate-900 border border-slate-700/90 divide-y divide-slate-800/80 z-50 overflow-hidden font-jakarta shadow-2xl rounded-2xl ring-1 ring-white/10">
                        <!-- Profile Card Header -->
                        <div class="p-4 bg-slate-950">
                            <div class="flex items-center gap-3">
                                <div id="dropdown-avatar-container" class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-lg overflow-hidden border border-blue-400/40">
                                    <span id="dropdown-avatar-text" class="font-outfit text-lg"><?php echo $avatarInitial; ?></span>
                                    <img id="dropdown-avatar-img" src="" alt="Business Logo" class="w-full h-full object-cover hidden">
                                </div>
                                <div class="overflow-hidden">
                                    <h4 id="dropdown-biz-name" class="font-bold text-white text-sm truncate"><?php echo esc($_SESSION['business_name'] ?? ($biz['name'] ?? 'eloria')); ?></h4>
                                    <p id="dropdown-owner-name" class="text-xs text-slate-300 font-inter truncate"><?php echo esc($_SESSION['username'] ?? ''); ?></p>
                                    <span class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-outfit bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        <span class="w-1 h-1 rounded-full bg-blue-400"></span> <span id="dropdown-role-text">Store Owner</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Quick Links -->
                        <div class="py-2 px-1.5 font-outfit">
                            <button onclick="App.closeProfileDropdown(); App.showProfileSettingsModal();" class="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition-all group text-left cursor-pointer">
                                <div class="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/20">
                                    <span class="material-symbols-outlined text-sm">manage_accounts</span>
                                </div>
                                <div>
                                    <div class="font-bold text-white text-xs">Edit My Profile Settings</div>
                                    <div class="text-[10px] text-slate-400 font-inter">Edit name, phone, email & password</div>
                                </div>
                            </button>
                            <a id="dropdown-biz-settings-link" href="#settings" onclick="App.closeProfileDropdown()" class="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition-all group">
                                <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500/20">
                                    <span class="material-symbols-outlined text-sm">storefront</span>
                                </div>
                                <div>
                                    <div class="font-bold text-white text-xs">Business Profile & Logo</div>
                                    <div class="text-[10px] text-slate-400 font-inter">Update business name, logo, phone</div>
                                </div>
                            </a>
                            <button id="dropdown-report-issue-btn" onclick="App.closeProfileDropdown(); App.showReportIssueModal();" class="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition-all group text-left cursor-pointer">
                                <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20">
                                    <span class="material-symbols-outlined text-sm">bug_report</span>
                                </div>
                                <div>
                                    <div class="font-bold text-amber-300 text-xs">Report Issue to Creator</div>
                                    <div class="text-[10px] text-slate-400 font-inter">Direct bug report & live support</div>
                                </div>
                            </button>
                        </div>

                        <!-- Logout Button -->
                        <div class="p-2">
                            <button onclick="App.logout(event)" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold font-outfit rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30 transition-all cursor-pointer">
                                <span class="material-symbols-outlined text-sm">logout</span> Sign Out of Account
                            </button>
                        </div>
                    </div>
                </div>
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
