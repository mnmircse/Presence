-- Attendance System Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop tables if exist (for fresh setup)
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS face_embeddings CASCADE;
DROP TABLE IF EXISTS timetable_slots CASCADE;
DROP TABLE IF EXISTS wifi_access_points CASCADE;
DROP TABLE IF EXISTS class_enrollments CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    roll_number VARCHAR(20) UNIQUE, -- For students only
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_roll_number ON users(roll_number);

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_name VARCHAR(100) NOT NULL,
    class_code VARCHAR(20) UNIQUE NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    semester INTEGER,
    academic_year VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_code ON classes(class_code);

-- ============================================
-- CLASS ENROLLMENTS (Student-Class mapping)
-- ============================================
CREATE TABLE class_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, class_id)
);

CREATE INDEX idx_enrollments_student ON class_enrollments(student_id);
CREATE INDEX idx_enrollments_class ON class_enrollments(class_id);

-- ============================================
-- WIFI ACCESS POINTS
-- ============================================
CREATE TABLE wifi_access_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ssid VARCHAR(100) NOT NULL,
    bssid VARCHAR(17) NOT NULL, -- MAC address format: XX:XX:XX:XX:XX:XX
    location_name VARCHAR(100) NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    rssi_threshold INTEGER DEFAULT -70, -- Minimum RSSI to consider "present"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bssid)
);

CREATE INDEX idx_wifi_class ON wifi_access_points(class_id);
CREATE INDEX idx_wifi_ssid ON wifi_access_points(ssid);

-- ============================================
-- TIMETABLE SLOTS
-- ============================================
CREATE TABLE timetable_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, day_of_week, start_time)
);

CREATE INDEX idx_timetable_class ON timetable_slots(class_id);
CREATE INDEX idx_timetable_day ON timetable_slots(day_of_week);

-- ============================================
-- FACE EMBEDDINGS
-- ============================================
CREATE TABLE face_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    embedding FLOAT8[] NOT NULL, -- 128-dimensional face descriptor
    embedding_hash VARCHAR(64) NOT NULL, -- SHA256 hash for duplicate detection
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(embedding_hash) -- Prevent duplicate face enrollments
);

CREATE INDEX idx_face_user ON face_embeddings(user_id);
CREATE INDEX idx_face_hash ON face_embeddings(embedding_hash);

-- ============================================
-- ATTENDANCE SESSIONS
-- ============================================
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timetable_slot_id UUID REFERENCES timetable_slots(id) ON DELETE SET NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE, -- NULL means session is active
    window_duration_minutes INTEGER DEFAULT 5, -- Fixed 5-minute window
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_class ON attendance_sessions(class_id);
CREATE INDEX idx_sessions_teacher ON attendance_sessions(teacher_id);
CREATE INDEX idx_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_sessions_status ON attendance_sessions(status);

-- ============================================
-- ATTENDANCE RECORDS
-- ============================================
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Verification status
    wifi_verified BOOLEAN DEFAULT false,
    face_verified BOOLEAN DEFAULT false,
    
    -- Final status (default: absent)
    status VARCHAR(20) DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    
    -- WiFi verification details
    wifi_rssi_data JSONB, -- Store RSSI readings from all APs
    wifi_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Face verification details
    face_confidence FLOAT, -- Matching confidence score
    face_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Override details
    is_manual_override BOOLEAN DEFAULT false,
    override_by UUID REFERENCES users(id) ON DELETE SET NULL,
    override_reason TEXT,
    override_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    marked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, student_id)
);

CREATE INDEX idx_records_session ON attendance_records(session_id);
CREATE INDEX idx_records_student ON attendance_records(student_id);
CREATE INDEX idx_records_status ON attendance_records(status);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to attendance_records table
CREATE TRIGGER update_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-close expired sessions
CREATE OR REPLACE FUNCTION close_expired_sessions()
RETURNS void AS $$
BEGIN
    UPDATE attendance_sessions
    SET status = 'completed',
        end_time = start_time + (window_duration_minutes || ' minutes')::INTERVAL
    WHERE status = 'active'
    AND start_time + (window_duration_minutes || ' minutes')::INTERVAL < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to initialize absent records when session starts
CREATE OR REPLACE FUNCTION initialize_attendance_records()
RETURNS TRIGGER AS $$
BEGIN
    -- Create absent records for all enrolled students
    INSERT INTO attendance_records (session_id, student_id, status)
    SELECT NEW.id, ce.student_id, 'absent'
    FROM class_enrollments ce
    WHERE ce.class_id = NEW.class_id
    ON CONFLICT (session_id, student_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_initial_records
    AFTER INSERT ON attendance_sessions
    FOR EACH ROW
    EXECUTE FUNCTION initialize_attendance_records();

-- Function to mark present only when both verifications pass
CREATE OR REPLACE FUNCTION update_attendance_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.wifi_verified = true AND NEW.face_verified = true THEN
        NEW.status = 'present';
        NEW.marked_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_mark_present
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_status();

-- ============================================
-- VIEWS
-- ============================================

-- View for attendance summary
CREATE OR REPLACE VIEW attendance_summary AS
SELECT 
    c.id AS class_id,
    c.class_name,
    c.subject,
    s.id AS session_id,
    s.session_date,
    s.status AS session_status,
    COUNT(ar.id) AS total_students,
    COUNT(CASE WHEN ar.status = 'present' THEN 1 END) AS present_count,
    COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) AS absent_count,
    ROUND(
        COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(ar.id), 0) * 100, 2
    ) AS attendance_percentage
FROM classes c
JOIN attendance_sessions s ON s.class_id = c.id
LEFT JOIN attendance_records ar ON ar.session_id = s.id
GROUP BY c.id, c.class_name, c.subject, s.id, s.session_date, s.status;

-- View for student attendance history
CREATE OR REPLACE VIEW student_attendance_history AS
SELECT 
    u.id AS student_id,
    u.full_name AS student_name,
    u.roll_number,
    c.class_name,
    c.subject,
    s.session_date,
    ar.status,
    ar.wifi_verified,
    ar.face_verified,
    ar.is_manual_override,
    ar.marked_at
FROM users u
JOIN attendance_records ar ON ar.student_id = u.id
JOIN attendance_sessions s ON s.id = ar.session_id
JOIN classes c ON c.id = s.class_id
WHERE u.role = 'student'
ORDER BY s.session_date DESC;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE users IS 'All system users - students, teachers, and admins';
COMMENT ON TABLE classes IS 'Course/class definitions';
COMMENT ON TABLE wifi_access_points IS 'WiFi APs for classroom presence detection';
COMMENT ON TABLE face_embeddings IS '128-dim face descriptors for recognition';
COMMENT ON TABLE attendance_sessions IS 'Teacher-started attendance windows';
COMMENT ON TABLE attendance_records IS 'Individual student attendance per session';
COMMENT ON COLUMN attendance_records.wifi_rssi_data IS 'JSON: {bssid: rssi_value, ...}';
COMMENT ON COLUMN face_embeddings.embedding_hash IS 'SHA256 of embedding for duplicate detection';
