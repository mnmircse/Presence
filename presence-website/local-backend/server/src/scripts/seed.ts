import bcrypt from 'bcrypt';
import { pool, execute, query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_PASSWORD = 'password123';

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Generate password hash
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    console.log('Generated password hash for default password:', DEFAULT_PASSWORD);

    // Clear existing data
    console.log('\n📦 Clearing existing data...');
    await execute('DELETE FROM attendance_records');
    await execute('DELETE FROM attendance_sessions');
    await execute('DELETE FROM face_embeddings');
    await execute('DELETE FROM timetable_slots');
    await execute('DELETE FROM wifi_access_points');
    await execute('DELETE FROM class_enrollments');
    await execute('DELETE FROM classes');
    await execute('DELETE FROM users');

    // Create users
    console.log('\n👥 Creating users...');
    
    const teachers = [
      { id: uuidv4(), username: 'teacher1', fullName: 'Dr. Rajesh Kumar', email: 'rajesh@college.edu', department: 'Computer Science' },
      { id: uuidv4(), username: 'teacher2', fullName: 'Prof. Priya Sharma', email: 'priya@college.edu', department: 'Computer Science' }
    ];

    const students = [
      { id: uuidv4(), username: 'student1', fullName: 'Amit Singh', email: 'amit@student.edu', rollNumber: 'CS2021001' },
      { id: uuidv4(), username: 'student2', fullName: 'Priya Patel', email: 'priyap@student.edu', rollNumber: 'CS2021002' },
      { id: uuidv4(), username: 'student3', fullName: 'Rahul Verma', email: 'rahul@student.edu', rollNumber: 'CS2021003' },
      { id: uuidv4(), username: 'student4', fullName: 'Sneha Gupta', email: 'sneha@student.edu', rollNumber: 'CS2021004' },
      { id: uuidv4(), username: 'student5', fullName: 'Vikram Reddy', email: 'vikram@student.edu', rollNumber: 'CS2021005' }
    ];

    // Insert teachers
    for (const teacher of teachers) {
      await execute(
        `INSERT INTO users (id, username, password_hash, full_name, email, role, department)
         VALUES ($1, $2, $3, $4, $5, 'teacher', $6)`,
        [teacher.id, teacher.username, passwordHash, teacher.fullName, teacher.email, teacher.department]
      );
      console.log(`  ✓ Teacher: ${teacher.username}`);
    }

    // Insert students
    for (const student of students) {
      await execute(
        `INSERT INTO users (id, username, password_hash, full_name, email, role, roll_number, department)
         VALUES ($1, $2, $3, $4, $5, 'student', $6, 'Computer Science')`,
        [student.id, student.username, passwordHash, student.fullName, student.email, student.rollNumber]
      );
      console.log(`  ✓ Student: ${student.username} (${student.rollNumber})`);
    }

    // Insert admin
    const adminId = uuidv4();
    await execute(
      `INSERT INTO users (id, username, password_hash, full_name, email, role, department)
       VALUES ($1, 'admin', $2, 'System Admin', 'admin@college.edu', 'admin', 'IT')`,
      [adminId, passwordHash]
    );
    console.log('  ✓ Admin: admin');

    // Create classes
    console.log('\n📚 Creating classes...');
    
    const classes = [
      { id: uuidv4(), name: 'CS-A Section', code: 'CS301A', subject: 'Data Structures', teacherId: teachers[0].id },
      { id: uuidv4(), name: 'CS-B Section', code: 'CS301B', subject: 'Database Systems', teacherId: teachers[1].id },
      { id: uuidv4(), name: 'CS-A Section', code: 'CS302A', subject: 'Operating Systems', teacherId: teachers[0].id }
    ];

    for (const cls of classes) {
      await execute(
        `INSERT INTO classes (id, class_name, class_code, subject, teacher_id, semester, academic_year)
         VALUES ($1, $2, $3, $4, $5, 3, '2024-25')`,
        [cls.id, cls.name, cls.code, cls.subject, cls.teacherId]
      );
      console.log(`  ✓ Class: ${cls.code} - ${cls.subject}`);
    }

    // Enroll students
    console.log('\n📝 Enrolling students...');
    
    // All students in CS301A
    for (const student of students) {
      await execute(
        'INSERT INTO class_enrollments (id, class_id, student_id) VALUES ($1, $2, $3)',
        [uuidv4(), classes[0].id, student.id]
      );
    }
    console.log(`  ✓ Enrolled all 5 students in ${classes[0].code}`);

    // First 3 students in CS301B
    for (let i = 0; i < 3; i++) {
      await execute(
        'INSERT INTO class_enrollments (id, class_id, student_id) VALUES ($1, $2, $3)',
        [uuidv4(), classes[1].id, students[i].id]
      );
    }
    console.log(`  ✓ Enrolled 3 students in ${classes[1].code}`);

    // Last 3 students in CS302A
    for (let i = 2; i < 5; i++) {
      await execute(
        'INSERT INTO class_enrollments (id, class_id, student_id) VALUES ($1, $2, $3)',
        [uuidv4(), classes[2].id, students[i].id]
      );
    }
    console.log(`  ✓ Enrolled 3 students in ${classes[2].code}`);

    // Add WiFi access points
    console.log('\n📶 Adding WiFi access points...');
    
    const wifiAPs = [
      { ssid: 'COLLEGE_WIFI', bssid: 'AA:BB:CC:DD:EE:01', location: 'Room 101 - Front', classId: classes[0].id, threshold: -65 },
      { ssid: 'COLLEGE_WIFI', bssid: 'AA:BB:CC:DD:EE:02', location: 'Room 101 - Middle', classId: classes[0].id, threshold: -70 },
      { ssid: 'COLLEGE_WIFI', bssid: 'AA:BB:CC:DD:EE:03', location: 'Room 101 - Back', classId: classes[0].id, threshold: -75 },
      { ssid: 'COLLEGE_WIFI', bssid: 'AA:BB:CC:DD:EE:04', location: 'Room 102 - Front', classId: classes[1].id, threshold: -65 },
      { ssid: 'COLLEGE_WIFI', bssid: 'AA:BB:CC:DD:EE:05', location: 'Room 102 - Middle', classId: classes[1].id, threshold: -70 },
      { ssid: 'COLLEGE_WIFI', bssid: 'AA:BB:CC:DD:EE:06', location: 'Room 102 - Back', classId: classes[1].id, threshold: -75 }
    ];

    for (const ap of wifiAPs) {
      await execute(
        `INSERT INTO wifi_access_points (id, ssid, bssid, location_name, class_id, rssi_threshold)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), ap.ssid, ap.bssid, ap.location, ap.classId, ap.threshold]
      );
    }
    console.log(`  ✓ Added ${wifiAPs.length} WiFi access points`);

    // Add timetable slots
    console.log('\n📅 Creating timetable...');
    
    const timetableSlots = [
      // CS301A - Monday, Wednesday, Friday at 9 AM
      { classId: classes[0].id, day: 1, start: '09:00', end: '10:00', room: '101' },
      { classId: classes[0].id, day: 3, start: '09:00', end: '10:00', room: '101' },
      { classId: classes[0].id, day: 5, start: '09:00', end: '10:00', room: '101' },
      // CS301B - Tuesday, Thursday at 10 AM
      { classId: classes[1].id, day: 2, start: '10:00', end: '11:00', room: '102' },
      { classId: classes[1].id, day: 4, start: '10:00', end: '11:00', room: '102' },
      // CS302A - Monday, Wednesday at 11 AM
      { classId: classes[2].id, day: 1, start: '11:00', end: '12:00', room: '103' },
      { classId: classes[2].id, day: 3, start: '11:00', end: '12:00', room: '103' }
    ];

    for (const slot of timetableSlots) {
      await execute(
        `INSERT INTO timetable_slots (id, class_id, day_of_week, start_time, end_time, room_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), slot.classId, slot.day, slot.start, slot.end, slot.room]
      );
    }
    console.log(`  ✓ Added ${timetableSlots.length} timetable slots`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Login credentials:');
    console.log('  Teachers: teacher1 / teacher2');
    console.log('  Students: student1 / student2 / student3 / student4 / student5');
    console.log('  Admin: admin');
    console.log(`  Password: ${DEFAULT_PASSWORD}`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
