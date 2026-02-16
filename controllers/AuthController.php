<?php

declare(strict_types=1);

class AuthController
{
    public function login(): void
    {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $userModel = new User();
            $user = $userModel->findByUsername(trim($_POST['username'] ?? ''));

            if ($user && password_verify($_POST['password'] ?? '', $user['password'])) {
                session_regenerate_id(true);
                $_SESSION['user'] = [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role_name' => strtolower($user['role_name']),
                    'position_category' => $user['position_category'] ?? null,
                ];
                redirect('index.php?action=dashboard');
            }

            $_SESSION['error'] = 'Invalid credentials.';
            redirect('index.php?action=login');
        }

        include BASE_PATH . '/views/auth/login.php';
    }

    public function logout(): void
    {
        $_SESSION = [];
        session_destroy();
        redirect('index.php?action=login');
    }
}
