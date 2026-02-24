-- =====================================
-- Classes Table
-- =====================================

CREATE TABLE IF NOT EXISTS rooms
 (
    id INT AUTO_INCREMENT PRIMARY KEY,

    room_name VARCHAR(100) NOT NULL,
    room_code VARCHAR(50) NOT NULL UNIQUE,

    description TEXT,

    created_by INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
        ON UPDATE CURRENT_TIMESTAMP

);
COMMIT;