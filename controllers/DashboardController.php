<?php

declare(strict_types=1);

class DashboardController
{
    public function index(): void
    {
        requireAuth();
        $role = $_SESSION['user']['role_name'];

        $templatePath = match ($role) {
            'admin' => BASE_PATH . '/Admin/template/main.php',
            'staff' => BASE_PATH . '/Staff/dashboard.php',
            'head' => BASE_PATH . '/Head/dashboard.php',
            'dean' => BASE_PATH . '/Dean/dashboard.php',
            'executive' => BASE_PATH . '/Executive/dashboard.php',
            default => BASE_PATH . '/Staff/dashboard.php',
        };

        include $templatePath;
    }
}
