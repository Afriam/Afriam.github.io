<?php

declare(strict_types=1);

class LeaveApplication extends BaseModel
{
    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO leave_applications (
                employee_id, leave_type_id, start_date, end_date, total_days,
                reason, supporting_document, status, date_filed
             ) VALUES (
                :employee_id, :leave_type_id, :start_date, :end_date, :total_days,
                :reason, :supporting_document, :status, NOW()
             )'
        );
        $stmt->execute($data);
        return (int) $this->db->lastInsertId();
    }

    public function logApproval(int $leaveId, int $approverId, string $step, string $status, string $remarks = ''): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO leave_approval_logs (leave_application_id, approver_user_id, approval_step, status, remarks, approved_at)
             VALUES (:leave_application_id, :approver_user_id, :approval_step, :status, :remarks, NOW())'
        );
        $stmt->execute([
            'leave_application_id' => $leaveId,
            'approver_user_id' => $approverId,
            'approval_step' => $step,
            'status' => $status,
            'remarks' => $remarks,
        ]);
    }

    public function determineWorkflow(string $roleName, ?string $positionCategory): array
    {
        $stmt = $this->db->prepare('SELECT approver_role FROM leave_workflows WHERE applicant_role = :applicant_role AND (position_category = :position_category OR position_category IS NULL) ORDER BY sequence_no');
        $stmt->execute([
            'applicant_role' => strtolower($roleName),
            'position_category' => $positionCategory,
        ]);
        $steps = array_column($stmt->fetchAll(), 'approver_role');

        if ($steps === []) {
            return ['eo'];
        }

        return $steps;
    }
}
