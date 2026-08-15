<?php
/**
 * BusinessM — Registration Page
 * Used primarily for the very first admin user setup.
 */
require_once __DIR__ . '/../config.php';
if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_start();
}

if (!empty($_SESSION['user_id'])) {
    // Only admins can register new users from within the app, this page is for initial setup
    header('Location: app.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Setup - <?php echo APP_NAME; ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #F8FAFC; color: #0F172A; }
        h1, h2, h3 { font-family: 'Geist', sans-serif; }
        .input-field { width: 100%; padding: 0.75rem 1rem; border: 1px solid #E2E8F0; border-radius: 0.375rem; outline: none; transition: all 0.2s; }
        .input-field:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
        .btn-primary { background-color: #0F172A; color: white; padding: 0.75rem 1.5rem; border-radius: 0.375rem; font-weight: 500; transition: background-color 0.2s; width: 100%; }
        .btn-primary:hover { background-color: #1E293B; }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-lg w-full bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
        <div class="p-8">
            <div class="text-center mb-8 flex flex-col items-center">
                <img src="../assets/img/logo.png" alt="EaseBus Logo" class="w-16 h-16 rounded-2xl shadow-md mb-3 object-cover border border-slate-200">
                <h1 class="text-3xl font-bold tracking-tight text-slate-900">Setup <?php echo APP_NAME; ?></h1>
                <p class="text-sm text-slate-500 mt-1">Create initial administrator account</p>
            </div>

            <div id="error-message" class="hidden mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm"></div>
            <div id="success-message" class="hidden mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                Account created successfully. <a href="login.php" class="font-bold underline">Click here to log in.</a>
            </div>

            <form id="register-form" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="username" class="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input type="text" id="username" name="username" class="input-field" required>
                    </div>
                    <div>
                        <label for="full_name" class="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input type="text" id="full_name" name="full_name" class="input-field" required>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="email" class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" id="email" name="email" class="input-field" required>
                    </div>
                    <div>
                        <label for="phone" class="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input type="text" id="phone" name="phone" class="input-field" required>
                    </div>
                </div>

                <div>
                    <label for="password" class="block text-sm font-medium text-slate-700 mb-1">Password (min 8 chars)</label>
                    <input type="password" id="password" name="password" class="input-field" minlength="8" required>
                </div>

                <button type="submit" id="submit-btn" class="btn-primary mt-6">
                    Create Admin Account
                </button>
            </form>
            
            <div class="mt-6 text-center text-sm text-slate-500">
                <p>Already set up? <a href="login.php" class="text-blue-600 hover:underline font-medium">Log in here</a></p>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const errorDiv = document.getElementById('error-message');
            const successDiv = document.getElementById('success-message');
            const submitBtn = document.getElementById('submit-btn');

            errorDiv.classList.add('hidden');
            successDiv.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';

            try {
                const response = await fetch('../api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: form.username.value,
                        full_name: form.full_name.value,
                        email: form.email.value,
                        phone: form.phone.value,
                        password: form.password.value
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    form.reset();
                    form.style.display = 'none';
                    successDiv.classList.remove('hidden');
                } else {
                    let msg = data.message || 'Registration failed';
                    if (data.errors) {
                        msg += ': ' + Object.values(data.errors).join(' ');
                    }
                    throw new Error(msg);
                }
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Admin Account';
            }
        });
    </script>
</body>
</html>
