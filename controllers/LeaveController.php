<?php

declare(strict_types=1);

class LeaveController
{
    public function create(): void
    {
        requireAuth();
        $leaveTypes = (new LeaveType())->all();
        include BASE_PATH . '/Staff/leave_form.php';
    }

    public function store(): void
    {
        requireAuth();

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            redirect('index.php?action=leave-create');
        }

        try {
            $employeeId = (int) ($_POST['employee_id'] ?? 0);
            $startDate = new DateTime($_POST['start_date']);
            $endDate = new DateTime($_POST['end_date']);
            $days = (int) $startDate->diff($endDate)->format('%a') + 1;

            $supportingDocument = handleUpload($_FILES['supporting_document'] ?? [], ['pdf', 'jpg', 'jpeg', 'png'], 5 * 1024 * 1024, 'leave_supports');

            $leaveModel = new LeaveApplication();
            $leaveId = $leaveModel->create([
                'employee_id' => $employeeId,
                'leave_type_id' => (int) $_POST['leave_type_id'],
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'total_days' => $days,
                'reason' => trim($_POST['reason']),
                'supporting_document' => $supportingDocument,
                'status' => 'pending',
            ]);

            $workflow = $leaveModel->determineWorkflow($_SESSION['user']['role_name'], $_SESSION['user']['position_category'] ?? null);
            foreach ($workflow as $idx => $step) {
                $leaveModel->logApproval($leaveId, (int) $_SESSION['user']['id'], 'Step ' . ($idx + 1) . ' - ' . strtoupper($step), $idx === 0 ? 'pending' : 'queued');
            }

            (new AuditLog())->record((int) $_SESSION['user']['id'], 'create', 'leave_application', $leaveId);
            $_SESSION['success'] = 'Leave application submitted.';
        } catch (Throwable $exception) {
            $_SESSION['error'] = $exception->getMessage();
        }

        redirect('index.php?action=leave-create');
    }
}
