CREATE TABLE IF NOT EXISTS access_points (
    id INT AUTO_INCREMENT PRIMARY KEY,

    ap_name VARCHAR(100) NOT NULL,
    mac_address VARCHAR(17) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NOT NULL UNIQUE,

    room_id INT NOT NULL,
    managed_by TINYINT NULL,

    status ENUM('active', 'inactive', 'maintenance')
        DEFAULT 'active',

    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key: Link to Rooms
    CONSTRAINT fk_ap_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE,

    -- Foreign Key: Link to Users (Admin/Developer)
    CONSTRAINT fk_ap_manager
        FOREIGN KEY (managed_by)
        REFERENCES admin(id)
        ON DELETE SET NULL
);