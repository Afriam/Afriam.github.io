<?php

declare(strict_types=1);

class User extends BaseModel
{
    public function findByUsername(string $username): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT u.*, r.name AS role_name, p.category AS position_category
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN employees e ON e.user_id = u.id
             LEFT JOIN positions p ON p.id = e.position_id
             WHERE u.username = :username LIMIT 1'
        );
        $stmt->execute(['username' => $username]);
        return $stmt->fetch() ?: null;
    }
}
