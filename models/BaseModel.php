<?php

declare(strict_types=1);

abstract class BaseModel
{
    protected PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }
}
