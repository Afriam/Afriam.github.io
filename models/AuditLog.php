<?php

declare(strict_types=1);

class AuditLog extends BaseModel
{
    public function record(int $userId, string $action, string $entityType, int $entityId): void
    {
        $stmt = $this->db->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, created_at) VALUES (:user_id, :action, :entity_type, :entity_id, NOW())');
        $stmt->execute([
            'user_id' => $userId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
        ]);
    }
}
