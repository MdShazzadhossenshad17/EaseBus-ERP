<?php
/**
 * BusinessM — Database Connection (PDO Singleton)
 */

require_once __DIR__ . '/../config.php';

class Database {
    private static ?PDO $instance = null;

    public static function getInstance(): PDO {
        if (self::$instance === null) {
            $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'"
            ];
            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Database connection failed. Please ensure MySQL is running.'
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
}
