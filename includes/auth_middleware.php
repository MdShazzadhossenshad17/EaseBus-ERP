<?php
/**
 * BusinessM — Authentication Middleware
 * 
 * Include at the top of any protected endpoint.
 * Verifies session, enforces role-based access, handles CSRF.
 */

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/validation.php';

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path'     => '/',
        'httponly'  => true,
        'samesite'  => 'Lax'
    ]);
    session_start();
}

/**
 * Require the user to be logged in.
 * Sends 401 JSON and exits if not authenticated.
 */
function requireAuth(): void {
    if (empty($_SESSION['user_id'])) {
        jsonError('Authentication required. Please log in.', 401);
    }
    // Verify user still exists and is active
    $user = Database::fetchOne(
        "SELECT id, status, must_change_password FROM users WHERE id = ?",
        [$_SESSION['user_id']]
    );
    if (!$user || $user['status'] !== 'active') {
        session_destroy();
        jsonError('Your account has been deactivated. Please contact an administrator.', 401);
    }
}

/**
 * Require a specific role (or higher).
 * Admin > Manager > Staff
 */
function requireRole(string ...$allowedRoles): void {
    requireAuth();
    $userRole = $_SESSION['user_role'] ?? '';
    if (!in_array($userRole, $allowedRoles)) {
        jsonError('You do not have permission to perform this action.', 403);
    }
}

/**
 * Check if the current user has a specific permission.
 */
function hasPermission(string $module, string $action): bool {
    if (empty($_SESSION['user_id'])) return false;
    if (($_SESSION['user_role'] ?? '') === 'admin') return true;
    if (($_SESSION['user_role'] ?? '') === 'creator') return true;
    if ($module === 'dashboard' && $action === 'read') return true;

    $perm = Database::fetchOne(
        "SELECT 1 FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         JOIN user_roles ur ON ur.role_id = rp.role_id
         WHERE ur.user_id = ? AND p.module = ? AND p.action = ?",
        [$_SESSION['user_id'], $module, $action]
    );
    return $perm !== null;
}

/**
 * Require a specific permission. Sends 403 if not allowed.
 */
function requirePermission(string $module, string $action): void {
    requireAuth();
    if (!hasPermission($module, $action)) {
        jsonError("You do not have permission to {$action} in {$module}.", 403);
    }
}

/**
 * Generate CSRF token
 */
function generateCsrfToken(): string {
    if (empty($_SESSION[CSRF_TOKEN_NAME])) {
        $_SESSION[CSRF_TOKEN_NAME] = bin2hex(random_bytes(32));
    }
    return $_SESSION[CSRF_TOKEN_NAME];
}

/**
 * Verify CSRF token for state-changing requests
 */
function verifyCsrf(): void {
    $method = getRequestMethod();
    if (in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'])) {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (empty($token) || !hash_equals($_SESSION[CSRF_TOKEN_NAME] ?? '', $token)) {
            jsonError('Invalid or missing security token. Please refresh the page.', 403);
        }
    }
}

/**
 * Set CORS headers for API
 */
function setCorsHeaders(): void {
    header('Access-Control-Allow-Origin: ' . APP_URL);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
