CREATE TABLE IF NOT EXISTS attendance_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,

    session_name VARCHAR(100) NOT NULL,

    room_id  INT NOT NULL,
    created_by TINYINT NOT NULL,

    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,

    status ENUM('scheduled', 'ongoing', 'completed')
        DEFAULT 'scheduled',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_session_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_session_admin
        FOREIGN KEY (created_by)
        REFERENCES admin(id)
        ON DELETE CASCADE
);