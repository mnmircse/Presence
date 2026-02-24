-- =====================================
-- Admin Table (Single Admin System)
-- =====================================

SET autocommit = 0;
START TRANSACTION;

CREATE TABLE IF NOT EXISTS admin (
    id TINYINT PRIMARY KEY CHECK (id = 1),

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
        ON UPDATE CURRENT_TIMESTAMP
);

COMMIT;
SET autocommit = 1;