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
    
    <div class="max-w-lg w-full bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden relative z-10">
        <div class="p-8 sm:p-10">
            <div class="text-center mb-8 flex flex-col items-center">
                <div class="relative mb-4">
                    <div class="absolute inset-0 bg-blue-600/30 rounded-2xl blur-md"></div>
                    <img src="../assets/img/logo.png" alt="EaseBus Logo" class="relative w-16 h-16 rounded-2xl shadow-lg object-cover ring-1 ring-white/20">
                </div>
                <h1 class="text-3xl font-bold tracking-tight text-white font-geist">Setup <?php echo APP_NAME; ?></h1>
                <p class="text-sm text-slate-400 mt-2">Create initial administrator account</p>
            </div>

            <div id="error-message" class="hidden mb-6 p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-xl text-sm backdrop-blur-sm"></div>
            <div id="success-message" class="hidden mb-6 p-4 bg-green-950/50 border border-green-800 text-green-200 rounded-xl text-sm backdrop-blur-sm">
                Account created successfully. <a href="login.php" class="font-bold text-blue-400 hover:text-blue-300 underline transition-colors">Click here to log in.</a>
            </div>

                <div>
                    <label for="business_name" class="block text-sm font-medium text-slate-300 mb-1.5">Business / Company Name</label>
                    <input type="text" id="business_name" name="business_name" class="input-field" placeholder="e.g. Apex Enterprise / EaseBus Trading">
                </div>

                <!-- Business Logo Selection -->
                <div>
                    <div class="flex justify-between items-center mb-1.5">
                        <label for="business_logo" class="block text-sm font-medium text-slate-300">Business Logo / Avatar</label>
                        <span class="text-xs text-slate-500 font-mono">(Optional — Skip or add now)</span>
                    </div>
                    <input type="url" id="business_logo" name="business_logo" class="input-field mb-2 text-xs" placeholder="Paste Logo Image URL (e.g. https://.../logo.png)">
                    
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-400">Preset Badges:</span>
                        <button type="button" onclick="setLogoPreset('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80')" class="px-2 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition-colors">💎 Modern</button>
                        <button type="button" onclick="setLogoPreset('https://images.unsplash.com/photo-1633409325618-4f094c355a6d?w=150&auto=format&fit=crop&q=80')" class="px-2 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors">🚀 Tech</button>
                        <button type="button" onclick="setLogoPreset('https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=80')" class="px-2 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-colors">🏬 Retail</button>
                        <button type="button" onclick="setLogoPreset('')" class="px-2 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors">Clear</button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="username" class="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
                        <input type="text" id="username" name="username" class="input-field" placeholder="Username" required>
                    </div>
                    <div>
                        <label for="full_name" class="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                        <input type="text" id="full_name" name="full_name" class="input-field" placeholder="Full name" required>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="email" class="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                        <input type="email" id="email" name="email" class="input-field" placeholder="name@company.com" required>
                    </div>
                    <div>
                        <label for="phone" class="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
                        <input type="text" id="phone" name="phone" class="input-field" placeholder="+1 (555) 000-0000" required>
                    </div>
                </div>

                <div>
                    <label for="password" class="block text-sm font-medium text-slate-300 mb-1.5">Password (min 8 chars)</label>
                    <input type="password" id="password" name="password" class="input-field" minlength="8" placeholder="••••••••" required>
                </div>

                <button type="submit" id="submit-btn" class="btn-primary mt-6">
                    Create Account & Business Workspace
                </button>
            </form>
            
            <div class="mt-8 text-center text-sm text-slate-500 border-t border-slate-800/80 pt-6">
                <p>Already set up? <a href="login.php" class="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-colors">Log in here</a></p>
            </div>
        </div>
    </div>

    <script>
        function setLogoPreset(url) {
            document.getElementById('business_logo').value = url;
        }

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
                        business_name: form.business_name.value,
                        business_logo: form.business_logo.value,
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
