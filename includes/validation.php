<?php
/**
 * BusinessM — Input Validation Helpers
 */

class Validator {
    private array $errors = [];
    private array $data;

    public function __construct(array $data) {
        $this->data = $data;
    }

    public function required(string $field, string $label = ''): self {
        $label = $label ?: $field;
        if (!isset($this->data[$field]) || trim((string) $this->data[$field]) === '') {
            $this->errors[$field] = "{$label} is required.";
        }
        return $this;
    }

    public function minLength(string $field, int $min, string $label = ''): self {
        $label = $label ?: $field;
        if (isset($this->data[$field]) && strlen(trim($this->data[$field])) < $min) {
            $this->errors[$field] = "{$label} must be at least {$min} characters.";
        }
        return $this;
    }

    public function maxLength(string $field, int $max, string $label = ''): self {
        $label = $label ?: $field;
        if (isset($this->data[$field]) && strlen(trim($this->data[$field])) > $max) {
            $this->errors[$field] = "{$label} must not exceed {$max} characters.";
        }
        return $this;
    }

    public function email(string $field, string $label = ''): self {
        $label = $label ?: $field;
        if (isset($this->data[$field]) && $this->data[$field] !== '' && !filter_var($this->data[$field], FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = "{$label} must be a valid email address.";
        }
        return $this;
    }

    public function numeric(string $field, string $label = ''): self {
        $label = $label ?: $field;
        if (isset($this->data[$field]) && $this->data[$field] !== '' && !is_numeric($this->data[$field])) {
            $this->errors[$field] = "{$label} must be a number.";
        }
        return $this;
    }

    public function min(string $field, float $min, string $label = ''): self {
        $label = $label ?: $field;
        if (isset($this->data[$field]) && is_numeric($this->data[$field]) && (float) $this->data[$field] < $min) {
            $this->errors[$field] = "{$label} must be at least {$min}.";
        }
        return $this;
    }

    public function max(string $field, float $max, string $label = ''): self {
        $label = $label ?: $field;
        if (isset($this->data[$field]) && is_numeric($this->data[$field]) && (float) $this->data[$field] > $max) {
            $this->errors[$field] = "{$label} must not exceed {$max}.";
        }
        return $this;
    }

    public function integer(string $field, string $label = ''): self {
        $label = $label ?: $field;
        if (isset($this->data[$field]) && $this->data[$field] !== '' && !ctype_digit((string) $this->data[$field])) {
            $this->errors[$field] = "{$label} must be a whole number.";
        }
        return $this;
    }

    public function unique(string $field, string $table, string $column, ?int $excludeId = null, string $label = ''): self {
        $label = $label ?: $field;
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            $sql = "SELECT id FROM {$table} WHERE {$column} = ?";
            $params = [$this->data[$field]];
            if ($excludeId !== null) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }
            $existing = Database::fetchOne($sql, $params);
            if ($existing) {
                $this->errors[$field] = "{$label} already exists.";
            }
        }
        return $this;
    }

    public function inList(string $field, array $allowed, string $label = ''): self {
        $label = $label ?: $field;
        if (isset($this->data[$field]) && $this->data[$field] !== '' && !in_array($this->data[$field], $allowed)) {
            $this->errors[$field] = "{$label} must be one of: " . implode(', ', $allowed) . '.';
        }
        return $this;
    }

    public function match(string $field, string $otherField, string $label = '', string $otherLabel = ''): self {
        $label = $label ?: $field;
        $otherLabel = $otherLabel ?: $otherField;
        $hasField = isset($this->data[$field]) && $this->data[$field] !== '';
        $hasOther = isset($this->data[$otherField]) && $this->data[$otherField] !== '';
        if ($hasField && (!$hasOther || $this->data[$field] !== $this->data[$otherField])) {
            $this->errors[$field] = "{$label} must match {$otherLabel}.";
        }
        return $this;
    }

    public function date(string $field, string $label = ''): self {
        $label = $label ?: $field;
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            $d = \DateTime::createFromFormat('Y-m-d', $this->data[$field]);
            if (!$d || $d->format('Y-m-d') !== $this->data[$field]) {
                $this->errors[$field] = "{$label} must be a valid date (YYYY-MM-DD).";
            }
        }
        return $this;
    }

    public function passes(): bool {
        return empty($this->errors);
    }

    public function fails(): bool {
        return !$this->passes();
    }

    public function errors(): array {
        return $this->errors;
    }

    public function firstError(): string {
        return reset($this->errors) ?: '';
    }

    /** Return validated & trimmed value */
    public function value(string $field, $default = null) {
        $val = $this->data[$field] ?? $default;
        return is_string($val) ? trim($val) : $val;
    }
}
