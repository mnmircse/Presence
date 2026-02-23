import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { query, queryOne, execute } from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const sessionsRouter = Router();

// Start attendance session (Teacher only)
sessionsRouter.post('/start',
  authenticate,
  requireRole('teacher', 'admin'),
  body('classId').isUUID(),
  body('timetableSlotId').optional().isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid input', 400);
      }

      const { classId, timetableSlotId } = req.body;
      const teacherId = req.user!.id;

      // Verify teacher owns this class
      const classData = await queryOne<any>(
        'SELECT id, class_name FROM classes WHERE id = $1 AND teacher_id = $2',
        [classId, teacherId]
      );

      if (!classData) {
        throw new AppError('Class not found or not authorized', 404);
      }

      // Check for existing active session
      const activeSession = await queryOne(
        `SELECT id FROM attendance_sessions 
         WHERE class_id = $1 AND status = 'active'`,
        [classId]
      );

      if (activeSession) {
        throw new AppError('An active session already exists for this class', 409);
      }

      const sessionId = uuidv4();
      
      await execute(
        `INSERT INTO attendance_sessions 
         (id, class_id, teacher_id, timetable_slot_id, session_date, start_time, status, window_duration_minutes)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, NOW(), 'active', 5)`,
        [sessionId, classId, teacherId, timetableSlotId]
      );

      // The trigger will auto-create absent records for enrolled students

      const session = await queryOne(
        `SELECT s.*, c.class_name, c.subject
         FROM attendance_sessions s
         JOIN classes c ON c.id = s.class_id
         WHERE s.id = $1`,
        [sessionId]
      );

      res.status(201).json({
        message: 'Attendance session started',
        session
      });
    } catch (error) {
      next(error);
    }
  }
);

// Stop attendance session (Teacher only)
sessionsRouter.post('/stop/:sessionId',
  authenticate,
  requireRole('teacher', 'admin'),
  param('sessionId').isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { sessionId } = req.params;
      const teacherId = req.user!.id;

      const session = await queryOne<any>(
        `SELECT s.id, s.teacher_id, s.status 
         FROM attendance_sessions s
         WHERE s.id = $1`,
        [sessionId]
      );

      if (!session) {
        throw new AppError('Session not found', 404);
      }

      if (session.teacher_id !== teacherId && req.user!.role !== 'admin') {
        throw new AppError('Not authorized', 403);
      }

      if (session.status !== 'active') {
        throw new AppError('Session is not active', 400);
      }

      await execute(
        `UPDATE attendance_sessions 
         SET status = 'completed', end_time = NOW()
         WHERE id = $1`,
        [sessionId]
      );

      res.json({ message: 'Session stopped successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Get active sessions for a class
sessionsRouter.get('/active',
  authenticate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      let sessions;

      if (req.user!.role === 'teacher') {
        // Teachers see their own active sessions
        sessions = await query(
          `SELECT s.*, c.class_name, c.subject,
                  (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id AND ar.status = 'present') as present_count,
                  (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id) as total_count
           FROM attendance_sessions s
           JOIN classes c ON c.id = s.class_id
           WHERE s.teacher_id = $1 AND s.status = 'active'
           ORDER BY s.start_time DESC`,
          [req.user!.id]
        );
      } else if (req.user!.role === 'student') {
        // Students see active sessions for their enrolled classes
        sessions = await query(
          `SELECT s.*, c.class_name, c.subject,
                  ar.status as my_status, ar.wifi_verified, ar.face_verified
           FROM attendance_sessions s
           JOIN classes c ON c.id = s.class_id
           JOIN class_enrollments ce ON ce.class_id = c.id
           LEFT JOIN attendance_records ar ON ar.session_id = s.id AND ar.student_id = $1
           WHERE ce.student_id = $1 AND s.status = 'active'
           ORDER BY s.start_time DESC`,
          [req.user!.id]
        );
      } else {
        // Admin sees all active sessions
        sessions = await query(
          `SELECT s.*, c.class_name, c.subject, u.full_name as teacher_name,
                  (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id AND ar.status = 'present') as present_count,
                  (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id) as total_count
           FROM attendance_sessions s
           JOIN classes c ON c.id = s.class_id
           JOIN users u ON u.id = s.teacher_id
           WHERE s.status = 'active'
           ORDER BY s.start_time DESC`
        );
      }

      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  }
);

// Get session details with attendance records
sessionsRouter.get('/:sessionId',
  authenticate,
  param('sessionId').isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { sessionId } = req.params;

      const session = await queryOne<any>(
        `SELECT s.*, c.class_name, c.subject, c.class_code,
                u.full_name as teacher_name
         FROM attendance_sessions s
         JOIN classes c ON c.id = s.class_id
         JOIN users u ON u.id = s.teacher_id
         WHERE s.id = $1`,
        [sessionId]
      );

      if (!session) {
        throw new AppError('Session not found', 404);
      }

      // Get attendance records
      const records = await query(
        `SELECT ar.*, u.full_name as student_name, u.roll_number
         FROM attendance_records ar
         JOIN users u ON u.id = ar.student_id
         WHERE ar.session_id = $1
         ORDER BY u.roll_number`,
        [sessionId]
      );

      res.json({ session, records });
    } catch (error) {
      next(error);
    }
  }
);

// Get session history for a class
sessionsRouter.get('/history/:classId',
  authenticate,
  requireRole('teacher', 'admin'),
  param('classId').isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { classId } = req.params;

      const sessions = await query(
        `SELECT s.*, 
                (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id AND ar.status = 'present') as present_count,
                (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id) as total_count
         FROM attendance_sessions s
         WHERE s.class_id = $1
         ORDER BY s.session_date DESC, s.start_time DESC
         LIMIT 50`,
        [classId]
      );

      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  }
);
