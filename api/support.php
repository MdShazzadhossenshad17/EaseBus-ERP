<?php
/**
 * EaseBus — Platform Creator Support Tickets & Real-Time System Health API
 */

require_once __DIR__ . '/../includes/auth_middleware.php';

requireAuth();

$method = getRequestMethod();
$action = $_GET['action'] ?? $_POST['action'] ?? '';

function isPlatformCreatorSession(): bool {
    $uname = strtolower($_SESSION['username'] ?? '');
    $email = strtolower($_SESSION['email'] ?? '');
    return $uname === 'shad@dbms.com' || $uname === 'shad' || $email === 'shad@dbms.com' || ($_SESSION['user_role'] ?? '') === 'creator';
}

if ($method === 'GET' && $action === 'health_diagnostics') {
    if (!isPlatformCreatorSession()) {
        jsonError('Access restricted to Platform Creator', 403);
    }

    try {
        $dbStatus = 'Online & Healthy';
        $userCount = Database::fetchOne("SELECT COUNT(*) as cnt FROM users")['cnt'] ?? 0;
        $orderCount = Database::fetchOne("SELECT COUNT(*) as cnt FROM orders")['cnt'] ?? 0;
        $ticketCount = Database::fetchOne("SELECT COUNT(*) as cnt FROM support_tickets WHERE status = 'open'")['cnt'] ?? 0;

        jsonSuccess('Platform diagnostics loaded', [
            'diagnostics' => [
                'db_status' => $dbStatus,
                'php_version' => PHP_VERSION,
                'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB',
                'active_stores' => $userCount,
                'total_orders' => $orderCount,
                'open_issues' => $ticketCount,
                'server_time' => date('Y-m-d H:i:s'),
                'pwa_version' => 'easebus-cache-v21.0'
            ]
        ]);
    } catch (\Exception $e) {
        jsonError('Failed to load system diagnostics: ' . $e->getMessage(), 500);
    }
}

if ($method === 'GET' && $action === 'list') {
    $isCreator = isPlatformCreatorSession();
    $userId = (int)($_SESSION['user_id'] ?? 0);

    if ($isCreator) {
        $tickets = Database::fetchAll(
            "SELECT t.*, u.full_name as user_full_name, u.business_name
             FROM support_tickets t
             LEFT JOIN users u ON u.id = t.user_id
             ORDER BY t.id DESC"
        );
    } else {
        $tickets = Database::fetchAll(
            "SELECT t.* FROM support_tickets t WHERE t.user_id = ? ORDER BY t.id DESC",
            [$userId]
        );
    }

    jsonSuccess('Support tickets loaded', ['tickets' => $tickets]);
}

if ($method === 'POST' && $action === 'create') {
    verifyCsrf();

    $sessUname = strtolower($_SESSION['username'] ?? '');
    $sessRole = strtolower($_SESSION['user_role'] ?? '');
    if ($sessUname !== 'hisham' && $sessRole !== 'creator' && $sessRole !== 'owner') {
        jsonError('Only Business / Store Owners are permitted to report issues directly to Platform Creator', 403);
    }
    $input = getJsonInput();

    $subject = trim($input['subject'] ?? '');
    $description = trim($input['description'] ?? '');
    $category = trim($input['category'] ?? 'System Bug');
    $priority = trim($input['priority'] ?? 'Normal');

    if (empty($subject) || empty($description)) {
        jsonError('Please fill in both Subject and Issue Details', 400);
    }

    $userId = (int)($_SESSION['user_id'] ?? 0);
    $username = $_SESSION['username'] ?? 'User';
    $email = $_SESSION['email'] ?? '';
    $businessName = $_SESSION['business_name'] ?? 'eloria';

    $ticketId = Database::insert(
        "INSERT INTO support_tickets (user_id, store_name, username, email, category, subject, description, priority, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')",
        [$userId, $businessName, $username, $email, $category, $subject, $description, $priority]
    );

    jsonSuccess('Report submitted directly to Platform Creator (shad@dbms.com)', [
        'ticket_id' => $ticketId
    ]);
}

if ($method === 'POST' && $action === 'update_status') {
    if (!isPlatformCreatorSession()) {
        jsonError('Access restricted to Platform Creator', 403);
    }

    $input = getJsonInput();
    $ticketId = (int)($input['ticket_id'] ?? 0);
    $newStatus = trim($input['status'] ?? 'resolved');
    $response = trim($input['response'] ?? '');

    if (!$ticketId) {
        jsonError('Ticket ID required', 400);
    }

    Database::execute(
        "UPDATE support_tickets SET status = ?, response = ? WHERE id = ?",
        [$newStatus, $response, $ticketId]
    );

    jsonSuccess('Ticket status updated cleanly', ['ticket_id' => $ticketId, 'status' => $newStatus]);
}

jsonError('Invalid action', 400);
