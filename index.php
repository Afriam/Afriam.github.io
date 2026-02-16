<?php

declare(strict_types=1);

require_once __DIR__ . '/config/init.php';

$action = $_GET['action'] ?? 'login';
$isAjax = isset($_GET['ajax']);

$authController = new AuthController();
$dashboardController = new DashboardController();
$employeeController = new EmployeeController();
$leaveController = new LeaveController();

switch ($action) {
    case 'login':
        $authController->login();
        break;
    case 'logout':
        $authController->logout();
        break;
    case 'dashboard':
        $dashboardController->index();
        break;
    case 'employees':
        if ($isAjax) {
            requireAuth(['admin', 'head', 'dean', 'executive']);
            $employees = (new Employee())->all();
            include BASE_PATH . '/Admin/Employees/index.php';
            break;
        }
        $employeeController->index();
        break;
    case 'employees-store':
        $employeeController->store();
        break;
    case 'leave-create':
        if ($isAjax) {
            requireAuth();
            $leaveTypes = (new LeaveType())->all();
            include BASE_PATH . '/Staff/leave_form.php';
            break;
        }
        $leaveController->create();
        break;
    case 'leave-store':
        $leaveController->store();
        break;
    default:
        http_response_code(404);
        echo 'Page not found';
}
