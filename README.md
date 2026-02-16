# Employee Record Management with Leave Application System

This repository now contains an MVC/OOP PHP starter implementation for a role-based Employee Record and Leave Application system with dynamic module loading and database schema.

## Setup
1. Import `database/schema.sql` into MySQL.
2. Set database credentials via environment variables (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`) or edit `config/config.php`.
3. Run local server: `php -S 0.0.0.0:8000`.
4. Open `http://localhost:8000/index.php?action=login`.

## Credentials
Create users in `users` table and store passwords using `password_hash()`.
