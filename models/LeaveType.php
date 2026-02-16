<?php

declare(strict_types=1);

class LeaveType extends BaseModel
{
    public function all(): array
    {
        return $this->db->query('SELECT * FROM leave_types WHERE is_active = 1 ORDER BY name')->fetchAll();
    }
}
