<?php

declare(strict_types=1);

define('APP_NAME', 'SLC Employee Record & Leave System');
define('BASE_PATH', dirname(__DIR__));
define('BASE_URL', '/');

define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('DB_NAME') ?: 'employee_leave_system');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');
