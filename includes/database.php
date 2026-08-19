<?php
/**
 * BusinessM — Database Connection (PDO Singleton)
 */

require_once __DIR__ . '/../config.php';

class Database {
    private static ?PDO $instance = null;

    public static function getInstance(): PDO {
        if (self::$instance === null) {
            $driver = defined('DB_DRIVER') ? DB_DRIVER : 'mysql';
            if ($driver === 'pgsql') {
                $dsn = 'pgsql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME;
                $options = [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false
                ];
            } else {
                $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
                $options = [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'"
                ];
            }
            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
                self::runAutoMigrations();
            } catch (PDOException $e) {
                http_response_code(200);
                echo json_encode([
                    'success' => false,
                    'status' => 'error',
                    'message' => 'Database connection offline. Routing via client PWA engine.'
                ]);
                exit;
            }
        }
        return self::$instance;
    }

    /** Shortcut: run a query with params and return statement */
    public static function query(string $sql, array $params = []): PDOStatement {
        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    /** Fetch one row */
    public static function fetchOne(string $sql, array $params = []): ?array {
        $row = self::query($sql, $params)->fetch();
        return $row ?: null;
    }

    /** Fetch all rows */
    public static function fetchAll(string $sql, array $params = []): array {
        return self::query($sql, $params)->fetchAll();
    }

    /** Insert and return last insert ID */
    public static function insert(string $sql, array $params = []): int {
        self::query($sql, $params);
        return (int) self::getInstance()->lastInsertId();
    }

    /** Update/delete and return affected rows */
    public static function execute(string $sql, array $params = []): int {
        return self::query($sql, $params)->rowCount();
    }

    /** Begin transaction */
    public static function beginTransaction(): void {
        self::getInstance()->beginTransaction();
    }

    /** Commit transaction */
    public static function commit(): void {
        self::getInstance()->commit();
    }

    /** Rollback transaction */
    public static function rollback(): void {
        if (self::getInstance()->inTransaction()) {
            self::getInstance()->rollBack();
        }
    }

    /** Get default location ID dynamically */
    public static function getDefaultLocationId(): int {
        $loc = self::fetchOne("SELECT id FROM locations WHERE is_default = 1 AND status = 'active' LIMIT 1");
        if ($loc) return (int) $loc['id'];
        $loc = self::fetchOne("SELECT id FROM locations WHERE status = 'active' ORDER BY id LIMIT 1");
        if ($loc) return (int) $loc['id'];
        throw new RuntimeException('No active location configured. Please set up at least one location in Settings.');
    }

    /** Get business settings */
    public static function getBusinessSettings(): array {
        $biz = self::fetchOne("SELECT * FROM businesses ORDER BY id LIMIT 1");
        return $biz ?: [
            'name' => APP_NAME,
            'currency' => 'BDT',
            'currency_symbol' => '৳',
            'tax_enabled' => 0,
            'tax_rate' => 0
        ];
    }

    /** Ensure DB ENUM fields and roles are updated for dynamic role portals and status support */
    private static function runAutoMigrations(): void {
        static $migrated = false;
        if ($migrated) return;
        $migrated = true;
        try {
            self::$instance->exec("ALTER TABLE deliveries MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'order_placed'");
            self::$instance->exec("ALTER TABLE returns MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending'");
            self::$instance->exec("ALTER TABLE orders MODIFY COLUMN order_status VARCHAR(50) NOT NULL DEFAULT 'pending'");

            // Ensure roles table has all staff management roles
            $roles = [
                ['admin', 'Full store owner access'],
                ['manager', 'Store Manager - Business operations and analytics'],
                ['sales', 'Sales Representative - Counter sales, POS, and customer management'],
                ['accountant', 'Staff Accountant - Financial ledger, accounts, expenses and reports'],
                ['staff', 'General Staff member']
            ];
            foreach ($roles as $r) {
                self::$instance->exec("INSERT IGNORE INTO roles (name, description) VALUES ('" . $r[0] . "', '" . addslashes($r[1]) . "')");
            }

            // Assign role permissions dynamically if empty
            $rolePermissionsMap = [
                'admin' => "SELECT (SELECT id FROM roles WHERE name = 'admin'), id FROM permissions",
                'manager' => "SELECT (SELECT id FROM roles WHERE name = 'manager'), id FROM permissions WHERE module IN ('dashboard', 'products', 'inventory', 'suppliers', 'orders', 'deliveries', 'returns', 'customers', 'reports', 'notifications') AND action IN ('read', 'create', 'update')",
                'sales' => "SELECT (SELECT id FROM roles WHERE name = 'sales'), id FROM permissions WHERE module IN ('dashboard', 'products', 'sales', 'orders', 'customers', 'deliveries', 'notifications') AND action IN ('read', 'create', 'update')",
                'accountant' => "SELECT (SELECT id FROM roles WHERE name = 'accountant'), id FROM permissions WHERE module IN ('dashboard', 'finance', 'expenses', 'returns', 'reports', 'analytics', 'investors', 'notifications') AND action IN ('read', 'create', 'update')",
                'staff' => "SELECT (SELECT id FROM roles WHERE name = 'staff'), id FROM permissions WHERE module IN ('dashboard', 'products', 'sales', 'orders', 'customers', 'deliveries', 'notifications') AND action IN ('read', 'create', 'update')"
            ];

            foreach ($rolePermissionsMap as $roleName => $selectSql) {
                $roleId = self::fetchOne("SELECT id FROM roles WHERE name = ?", [$roleName])['id'] ?? null;
                if ($roleId) {
                    $hasPerms = self::fetchOne("SELECT COUNT(*) as cnt FROM role_permissions WHERE role_id = ?", [$roleId])['cnt'] ?? 0;
                    if ((int)$hasPerms === 0) {
                        self::$instance->exec("INSERT IGNORE INTO role_permissions (role_id, permission_id) {$selectSql}");
                    }
                }
            }

        } catch (Throwable $e) {
            // Silently ignore if schema already updated or permissions restricted
        }
    }
}
