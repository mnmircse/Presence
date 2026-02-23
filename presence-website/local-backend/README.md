# Attendance System - Local Backend

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Setup

### 1. Database Setup
```bash
# Create database
psql -U postgres -c "CREATE DATABASE attendance_system;"

# Run schema
psql -U postgres -d attendance_system -f database/schema.sql

# Seed initial data
psql -U postgres -d attendance_system -f database/seed.sql
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

### 3. Environment Variables
Create `server/.env`:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/attendance_system
JWT_SECRET=your-secret-key-minimum-32-characters
PORT=3001
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login (student/teacher)
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user

### Students
- `POST /api/attendance/mark` - Mark attendance (WiFi + Face)
- `GET /api/attendance/my-records` - View own attendance
- `POST /api/face/enroll` - Enroll face embedding

### Teachers
- `POST /api/sessions/start` - Start attendance session
- `POST /api/sessions/stop` - Stop attendance session
- `GET /api/sessions/active` - Get active sessions
- `GET /api/attendance/class/:classId` - View class attendance
- `PUT /api/attendance/:id/override` - Override attendance
- `GET /api/attendance/export/:classId` - Export as CSV

### Admin
- `POST /api/classes` - Create class
- `POST /api/wifi-access-points` - Add WiFi AP
- `GET /api/timetable/:classId` - Get timetable
- `POST /api/timetable` - Set timetable
