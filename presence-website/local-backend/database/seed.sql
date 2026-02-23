-- Seed Data for Attendance System
-- Password for all users: "password123" (bcrypt hash)

-- ============================================
-- USERS
-- ============================================

-- Teachers
INSERT INTO users (id, username, password_hash, full_name, email, role, department) VALUES
('a1b2c3d4-e5f6-4789-abcd-111111111111', 'teacher1', '$2b$10$rOzJqQZQXqZQXqZQXqZQXeKqZQXqZQXqZQXqZQXqZQXqZQXqZQXqZ', 'Dr. Rajesh Kumar', 'rajesh@college.edu', 'teacher', 'Computer Science'),
('a1b2c3d4-e5f6-4789-abcd-222222222222', 'teacher2', '$2b$10$rOzJqQZQXqZQXqZQXqZQXeKqZQXqZQXqZQXqZQXqZQXqZQXqZQXqZ', 'Prof. Priya Sharma', 'priya@college.edu', 'teacher', 'Computer Science');

-- Students
INSERT INTO users (id, username, password_hash, full_name, email, role, roll_number, department) VALUES
('b1b2c3d4-e5f6-4789-abcd-111111111111', 'student1', '$2b$10$rOzJqQZQXqZQXqZQXqZQXeKqZQXqZQXqZQXqZQXqZQXqZQXqZQXqZ', 'Amit Singh', 'amit@student.edu', 'student', 'CS2021001', 'Computer Science'),
('b1b2c3d4-e5f6-4789-abcd-222222222222', 'student2', '$2b$10$rOzJqQZQXqZQXqZQXqZQXeKqZQXqZQXqZQXqZQXqZQXqZQXqZQXqZ', 'Priya Patel', 'priyap@student.edu', 'student', 'CS2021002', 'Computer Science'),
('b1b2c3d4-e5f6-4789-abcd-333333333333', 'student3', '$2b$10$rOzJqQZQXqZQXqZQXqZQXeKqZQXqZQXqZQXqZQXqZQXqZQXqZQXqZ', 'Rahul Verma', 'rahul@student.edu', 'student', 'CS2021003', 'Computer Science'),
('b1b2c3d4-e5f6-4789-abcd-444444444444', 'student4', '$2b$10$rOzJqQZQXqZQXqZQXqZQXeKqZQXqZQXqZQXqZQXqZQXqZQXqZQXqZ', 'Sneha Gupta', 'sneha@student.edu', 'student', 'CS2021004', 'Computer Science'),
('b1b2c3d4-e5f6-4789-abcd-555555555555', 'student5', '$2b$10$rOzJqQZQXqZQXqZQXqZQXeKqZQXqZQXqZQXqZQXqZQXqZQXqZQXqZ', 'Vikram Reddy', 'vikram@student.edu', 'student', 'CS2021005', 'Computer Science');

-- Admin
INSERT INTO users (id, username, password_hash, full_name, email, role, department) VALUES
('c1b2c3d4-e5f6-4789-abcd-111111111111', 'admin', '$2b$10$rOzJqQZQXqZQXqZQXqZQXeKqZQXqZQXqZQXqZQXqZQXqZQXqZQXqZ', 'System Admin', 'admin@college.edu', 'admin', 'IT');

-- ============================================
-- CLASSES
-- ============================================
INSERT INTO classes (id, class_name, class_code, subject, teacher_id, semester, academic_year) VALUES
('d1b2c3d4-e5f6-4789-abcd-111111111111', 'CS-A Section', 'CS301A', 'Data Structures', 'a1b2c3d4-e5f6-4789-abcd-111111111111', 3, '2024-25'),
('d1b2c3d4-e5f6-4789-abcd-222222222222', 'CS-B Section', 'CS301B', 'Database Systems', 'a1b2c3d4-e5f6-4789-abcd-222222222222', 3, '2024-25'),
('d1b2c3d4-e5f6-4789-abcd-333333333333', 'CS-A Section', 'CS302A', 'Operating Systems', 'a1b2c3d4-e5f6-4789-abcd-111111111111', 3, '2024-25');

-- ============================================
-- CLASS ENROLLMENTS
-- ============================================
INSERT INTO class_enrollments (student_id, class_id) VALUES
-- All students in CS301A
('b1b2c3d4-e5f6-4789-abcd-111111111111', 'd1b2c3d4-e5f6-4789-abcd-111111111111'),
('b1b2c3d4-e5f6-4789-abcd-222222222222', 'd1b2c3d4-e5f6-4789-abcd-111111111111'),
('b1b2c3d4-e5f6-4789-abcd-333333333333', 'd1b2c3d4-e5f6-4789-abcd-111111111111'),
('b1b2c3d4-e5f6-4789-abcd-444444444444', 'd1b2c3d4-e5f6-4789-abcd-111111111111'),
('b1b2c3d4-e5f6-4789-abcd-555555555555', 'd1b2c3d4-e5f6-4789-abcd-111111111111'),
-- Some students in CS301B
('b1b2c3d4-e5f6-4789-abcd-111111111111', 'd1b2c3d4-e5f6-4789-abcd-222222222222'),
('b1b2c3d4-e5f6-4789-abcd-222222222222', 'd1b2c3d4-e5f6-4789-abcd-222222222222'),
('b1b2c3d4-e5f6-4789-abcd-333333333333', 'd1b2c3d4-e5f6-4789-abcd-222222222222'),
-- Some students in CS302A
('b1b2c3d4-e5f6-4789-abcd-333333333333', 'd1b2c3d4-e5f6-4789-abcd-333333333333'),
('b1b2c3d4-e5f6-4789-abcd-444444444444', 'd1b2c3d4-e5f6-4789-abcd-333333333333'),
('b1b2c3d4-e5f6-4789-abcd-555555555555', 'd1b2c3d4-e5f6-4789-abcd-333333333333');

-- ============================================
-- WIFI ACCESS POINTS
-- ============================================
INSERT INTO wifi_access_points (id, ssid, bssid, location_name, class_id, rssi_threshold) VALUES
-- Room 101 (3 APs for triangulation)
('e1b2c3d4-e5f6-4789-abcd-111111111111', 'COLLEGE_WIFI', 'AA:BB:CC:DD:EE:01', 'Room 101 - Front', 'd1b2c3d4-e5f6-4789-abcd-111111111111', -65),
('e1b2c3d4-e5f6-4789-abcd-222222222222', 'COLLEGE_WIFI', 'AA:BB:CC:DD:EE:02', 'Room 101 - Middle', 'd1b2c3d4-e5f6-4789-abcd-111111111111', -70),
('e1b2c3d4-e5f6-4789-abcd-333333333333', 'COLLEGE_WIFI', 'AA:BB:CC:DD:EE:03', 'Room 101 - Back', 'd1b2c3d4-e5f6-4789-abcd-111111111111', -75),
-- Room 102 (3 APs)
('e1b2c3d4-e5f6-4789-abcd-444444444444', 'COLLEGE_WIFI', 'AA:BB:CC:DD:EE:04', 'Room 102 - Front', 'd1b2c3d4-e5f6-4789-abcd-222222222222', -65),
('e1b2c3d4-e5f6-4789-abcd-555555555555', 'COLLEGE_WIFI', 'AA:BB:CC:DD:EE:05', 'Room 102 - Middle', 'd1b2c3d4-e5f6-4789-abcd-222222222222', -70),
('e1b2c3d4-e5f6-4789-abcd-666666666666', 'COLLEGE_WIFI', 'AA:BB:CC:DD:EE:06', 'Room 102 - Back', 'd1b2c3d4-e5f6-4789-abcd-222222222222', -75);

-- ============================================
-- TIMETABLE SLOTS
-- ============================================
INSERT INTO timetable_slots (id, class_id, day_of_week, start_time, end_time, room_number) VALUES
-- CS301A - Monday, Wednesday, Friday
('f1b2c3d4-e5f6-4789-abcd-111111111111', 'd1b2c3d4-e5f6-4789-abcd-111111111111', 1, '09:00', '10:00', '101'),
('f1b2c3d4-e5f6-4789-abcd-222222222222', 'd1b2c3d4-e5f6-4789-abcd-111111111111', 3, '09:00', '10:00', '101'),
('f1b2c3d4-e5f6-4789-abcd-333333333333', 'd1b2c3d4-e5f6-4789-abcd-111111111111', 5, '09:00', '10:00', '101'),
-- CS301B - Tuesday, Thursday
('f1b2c3d4-e5f6-4789-abcd-444444444444', 'd1b2c3d4-e5f6-4789-abcd-222222222222', 2, '10:00', '11:00', '102'),
('f1b2c3d4-e5f6-4789-abcd-555555555555', 'd1b2c3d4-e5f6-4789-abcd-222222222222', 4, '10:00', '11:00', '102'),
-- CS302A - Monday, Wednesday
('f1b2c3d4-e5f6-4789-abcd-666666666666', 'd1b2c3d4-e5f6-4789-abcd-333333333333', 1, '11:00', '12:00', '103'),
('f1b2c3d4-e5f6-4789-abcd-777777777777', 'd1b2c3d4-e5f6-4789-abcd-333333333333', 3, '11:00', '12:00', '103');

-- ============================================
-- NOTE: Password for all seeded users
-- ============================================
-- The password hash above is a placeholder.
-- When running the server, use bcrypt to generate proper hashes.
-- Default password: "password123"
-- 
-- To generate a proper hash, run in Node.js:
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('password123', 10);
-- console.log(hash);
