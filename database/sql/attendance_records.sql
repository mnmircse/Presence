CREATE TABLE IF NOT EXISTS attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,

    session_id INT NOT NULL,
    student_id INT NOT NULL,

    check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,

    status ENUM('present', 'absent', 'late')
        DEFAULT 'present',

    CONSTRAINT fk_record_session
        FOREIGN KEY (session_id)
        REFERENCES attendance_sessions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_record_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,

    UNIQUE (session_id, student_id)
);