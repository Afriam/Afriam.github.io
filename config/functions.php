<?php

declare(strict_types=1);

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function redirect(string $path): void
{
    header('Location: ' . BASE_URL . ltrim($path, '/'));
    exit;
}

function requireAuth(array $roles = []): void
{
    if (empty($_SESSION['user'])) {
        redirect('index.php?action=login');
    }

    if ($roles !== [] && !in_array($_SESSION['user']['role_name'], $roles, true)) {
        http_response_code(403);
        exit('Access denied');
    }
}

function handleUpload(array $file, array $allowedExt, int $maxSize, string $subDir): ?string
{
    if (!isset($file['tmp_name']) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('File upload failed.');
    }

    if ($file['size'] > $maxSize) {
        throw new RuntimeException('File too large.');
    }

    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, $allowedExt, true)) {
        throw new RuntimeException('Invalid file type.');
    }

    $targetDir = BASE_PATH . '/uploads/' . trim($subDir, '/');
    if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        throw new RuntimeException('Cannot create upload directory.');
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
    $targetPath = $targetDir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        throw new RuntimeException('Unable to move uploaded file.');
    }

    return 'uploads/' . trim($subDir, '/') . '/' . $filename;
}
