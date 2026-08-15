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
        body { font-family: 'Inter', sans-serif; background-color: #F8FAFC; color: #0F172A; }
        h1, h2, h3 { font-family: 'Geist', sans-serif; }
        .input-field {
            width: 100%; padding: 0.75rem 1rem; border: 1px solid #E2E8F0; border-radius: 0.375rem; outline: none; transition: all 0.2s;
        }
        .input-field:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
        .btn-primary {
            background-color: #0F172A; color: white; padding: 0.75rem 1.5rem; border-radius: 0.375rem; font-weight: 500; transition: background-color 0.2s; width: 100%;
        }
        .btn-primary:hover { background-color: #1E293B; }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
        <div class="p-8">
            <div class="text-center mb-8 flex flex-col items-center">
                <a href="../index.php" class="flex flex-col items-center group cursor-pointer">
                    <img src="../assets/img/logo.png" alt="EaseBus Logo" class="w-16 h-16 rounded-2xl shadow-md mb-3 object-cover border border-slate-200 group-hover:scale-105 transition-transform duration-200">
                    <h1 class="text-3xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors"><?php echo APP_NAME; ?></h1>
                </a>
                <p class="text-sm text-slate-500 mt-1">Smart Business Management Suite</p>
            </div>

            <div id="error-message" class="hidden mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm"></div>

            <form id="login-form" class="space-y-5">
                <div>
                    <label for="username" class="block text-sm font-medium text-slate-700 mb-1">Username</label>
                    <input type="text" id="username" name="username" class="input-field" required autofocus>
                </div>

                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label for="password" class="block text-sm font-medium text-slate-700">Password</label>
                    </div>
                    <input type="password" id="password" name="password" class="input-field" required>
                </div>

                <button type="submit" id="submit-btn" class="btn-primary mt-6">
                    Sign In
                </button>
            </form>

            <div class="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
                <p>Don't have an account? <a href="register.php" class="text-blue-600 font-semibold hover:underline">Create a Business Account (Sign Up)</a></p>
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
