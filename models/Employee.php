<?php

declare(strict_types=1);

class Employee extends BaseModel
{
    public function generateEmployeeId(): string
    {
        $year = date('Y');
        $stmt = $this->db->query('SELECT COUNT(*) AS total FROM employees');
        $count = (int) ($stmt->fetch()['total'] ?? 0) + 1;
        return sprintf('EMP-%s-%04d', $year, $count);
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO employees (
                user_id, employee_id, full_name, gender, civil_status, date_of_birth, email, contact_number,
                address, date_hired, employment_status, office_id, position_id, profile_photo
             ) VALUES (
                :user_id, :employee_id, :full_name, :gender, :civil_status, :date_of_birth, :email, :contact_number,
                :address, :date_hired, :employment_status, :office_id, :position_id, :profile_photo
             )'
        );
        $stmt->execute($data);
        return (int) $this->db->lastInsertId();
    }

    public function all(): array
    {
        $sql = 'SELECT e.*, o.name AS office_name, p.name AS position_name
                FROM employees e
                LEFT JOIN offices o ON o.id = e.office_id
                LEFT JOIN positions p ON p.id = e.position_id
                ORDER BY e.created_at DESC';
        return $this->db->query($sql)->fetchAll();
    }

    public function storeDocument(int $employeeId, string $documentType, string $filePath): void
    {
        $stmt = $this->db->prepare('INSERT INTO employee_documents (employee_id, document_type, file_path) VALUES (:employee_id, :document_type, :file_path)');
        $stmt->execute([
            'employee_id' => $employeeId,
            'document_type' => $documentType,
            'file_path' => $filePath,
        ]);
    }
}
