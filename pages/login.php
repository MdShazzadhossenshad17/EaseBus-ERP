<?php
/**
 * BusinessM — Login Page
 */
require_once __DIR__ . '/../config.php';
if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_start();
}

if (!empty($_SESSION['user_id'])) {
    header('Location: app.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - <?php echo APP_NAME; ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        h1, h2, h3 { font-family: 'Geist', sans-serif; }
        .input-field {
            width: 100%; padding: 0.75rem 1rem; 
            background-color: #0f172a; 
            border: 1px solid #334155; 
            color: #f8fafc;
            border-radius: 0.5rem; outline: none; 
            transition: all 0.2s ease-in-out;
        }
        .input-field::placeholder { color: #64748b; }
        .input-field:focus { 
            border-color: #3b82f6; 
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25); 
            background-color: #1e293b;
        }
        .btn-primary {
            background-color: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; transition: all 0.2s ease-in-out; width: 100%;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -2px rgba(37, 99, 235, 0.2);
        }
        .btn-primary:hover { 
            background-color: #3b82f6; 
            box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3), 0 4px 6px -4px rgba(37, 99, 235, 0.3);
            transform: translateY(-1px);
        }
        .btn-primary:active {
            transform: translateY(0);
        }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-inter text-slate-100 relative overflow-hidden">
    <!-- Ambient light effects -->
    <div class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none"></div>
    
    <div class="max-w-md w-full bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden relative z-10">
        <div class="p-8 sm:p-10">
            <div class="text-center mb-8 flex flex-col items-center">
                <a href="../index.php" class="flex flex-col items-center group cursor-pointer">
                    <div class="relative mb-4">
                        <div class="absolute inset-0 bg-blue-600/30 rounded-2xl blur-md group-hover:bg-blue-600/50 transition-all duration-300"></div>
                        <img src="../assets/img/logo.png" alt="EaseBus Logo" class="relative w-16 h-16 rounded-2xl shadow-lg object-cover ring-1 ring-white/20 group-hover:scale-105 transition-transform duration-300">
                    </div>
                    <h1 class="text-3xl font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors"><?php echo APP_NAME; ?></h1>
                </a>
                <p class="text-sm text-slate-400 mt-2">Smart Business Management Suite</p>
            </div>

            <div id="error-message" class="hidden mb-6 p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-xl text-sm backdrop-blur-sm"></div>

            <form id="login-form" class="space-y-5">
                <div>
                    <label for="username" class="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
                    <input type="text" id="username" name="username" class="input-field" placeholder="Enter username" required autofocus>
                </div>

                <div>
                    <div class="flex justify-between items-center mb-1.5">
                        <label for="password" class="block text-sm font-medium text-slate-300">Password</label>
                    </div>
                    <input type="password" id="password" name="password" class="input-field" placeholder="••••••••" required>
                </div>

                <button type="submit" id="submit-btn" class="btn-primary mt-6">
                    Sign In
                </button>
            </form>

            <div class="mt-8 text-center text-xs text-slate-500 border-t border-slate-800/80 pt-6">
                <p>Don't have an account? <a href="register.php" class="text-blue-400 font-semibold hover:text-blue-300 hover:underline transition-colors">Create a Business Account (Sign Up)</a></p>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', async () => {
            // Check if we need to show the initial setup link
            try {
                // If register.php is accessible, maybe it's a new setup. 
                // A more robust check would be an API endpoint that returns if users exist.
                // For V1, we'll just check if we get a specific error from login, or we can just always show it for now
                // and register.php will block if not admin and users exist.
                document.getElementById('setup-notice').classList.remove('hidden');
            } catch (e) {}

            const form = document.getElementById('login-form');
            const errorDiv = document.getElementById('error-message');
            const submitBtn = document.getElementById('submit-btn');

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                errorDiv.classList.add('hidden');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Signing in...';

                try {
                    const response = await fetch('../api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: form.username.value,
                            password: form.password.value
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        window.location.href = 'app.php';
                    } else {
                        throw new Error(data.message || 'Login failed');
                    }
                } catch (error) {
                    errorDiv.textContent = error.message;
                    errorDiv.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign In';
                }
            });
        });
    </script>
</body>
</html>
