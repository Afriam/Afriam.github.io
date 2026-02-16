<?php

declare(strict_types=1);

class EmployeeController
{
    public function index(): void
    {
        requireAuth(['admin', 'head', 'dean', 'executive']);
        $employees = (new Employee())->all();
        include BASE_PATH . '/Admin/Employees/index.php';
    }

    public function store(): void
    {
        requireAuth(['admin']);
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            redirect('index.php?action=employees');
        }

        try {
            $employeeModel = new Employee();
            $employeeId = $employeeModel->generateEmployeeId();
            $photoPath = handleUpload($_FILES['profile_photo'] ?? [], ['jpg', 'jpeg', 'png'], 2 * 1024 * 1024, 'profiles');

            $employeePk = $employeeModel->create([
                'user_id' => (int) ($_POST['user_id'] ?? 1),
                'employee_id' => $employeeId,
                'full_name' => trim($_POST['full_name']),
                'gender' => trim($_POST['gender']),
                'civil_status' => trim($_POST['civil_status']),
                'date_of_birth' => $_POST['date_of_birth'],
                'email' => trim($_POST['email']),
                'contact_number' => trim($_POST['contact_number']),
                'address' => trim($_POST['address']),
                'date_hired' => $_POST['date_hired'],
                'employment_status' => trim($_POST['employment_status']),
                'office_id' => (int) $_POST['office_id'],
                'position_id' => (int) $_POST['position_id'],
                'profile_photo' => $photoPath,
            ]);

            if (isset($_FILES['document']) && $_FILES['document']['error'] !== UPLOAD_ERR_NO_FILE) {
                $document = handleUpload($_FILES['document'], ['pdf', 'doc', 'docx'], 5 * 1024 * 1024, 'employee_documents');
                if ($document) {
                    $employeeModel->storeDocument($employeePk, trim($_POST['document_type'] ?? 'other'), $document);
                }
            }

            (new AuditLog())->record((int) $_SESSION['user']['id'], 'create', 'employee', $employeePk);
            $_SESSION['success'] = 'Employee created successfully.';
        } catch (Throwable $exception) {
            $_SESSION['error'] = $exception->getMessage();
        }

        redirect('index.php?action=employees');
    }
}
