import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { query, queryOne, execute } from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const timetableRouter = Router();

// Get timetable for a class
timetableRouter.get('/:classId',
  authenticate,
  param('classId').isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { classId } = req.params;

      const slots = await query(
        `SELECT ts.*, c.class_name, c.subject
         FROM timetable_slots ts
         JOIN classes c ON c.id = ts.class_id
         WHERE ts.class_id = $1
         ORDER BY ts.day_of_week, ts.start_time`,
        [classId]
      );

      res.json({ slots });
    } catch (error) {
      next(error);
    }
  }
);

// Get today's timetable for a student
timetableRouter.get('/student/today',
  authenticate,
  requireRole('student'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const studentId = req.user!.id;
      const today = new Date().getDay(); // 0-6

      const slots = await query(
        `SELECT ts.*, c.class_name, c.subject, c.class_code,
                u.full_name as teacher_name
         FROM timetable_slots ts
         JOIN classes c ON c.id = ts.class_id
         JOIN users u ON u.id = c.teacher_id
         JOIN class_enrollments ce ON ce.class_id = c.id
         WHERE ce.student_id = $1 AND ts.day_of_week = $2
         ORDER BY ts.start_time`,
        [studentId, today]
      );

      res.json({ slots, dayOfWeek: today });
    } catch (error) {
      next(error);
    }
  }
);

// Get teacher's timetable for today
timetableRouter.get('/teacher/today',
  authenticate,
  requireRole('teacher'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const teacherId = req.user!.id;
      const today = new Date().getDay();

      const slots = await query(
        `SELECT ts.*, c.class_name, c.subject, c.class_code,
                (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id) as student_count
         FROM timetable_slots ts
         JOIN classes c ON c.id = ts.class_id
         WHERE c.teacher_id = $1 AND ts.day_of_week = $2
         ORDER BY ts.start_time`,
        [teacherId, today]
      );

      res.json({ slots, dayOfWeek: today });
    } catch (error) {
      next(error);
    }
  }
);

// Add timetable slot (Teacher/Admin)
timetableRouter.post('/',
  authenticate,
  requireRole('teacher', 'admin'),
  body('classId').isUUID(),
  body('dayOfWeek').isInt({ min: 0, max: 6 }),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('endTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('roomNumber').optional().isString().isLength({ max: 20 }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid input', 400);
      }

      const { classId, dayOfWeek, startTime, endTime, roomNumber } = req.body;

      // Verify class ownership
      if (req.user!.role === 'teacher') {
        const classData = await queryOne(
          'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
          [classId, req.user!.id]
        );
        if (!classData) {
          throw new AppError('Class not found or not authorized', 404);
        }
      }

      // Check for time conflicts
      const conflict = await queryOne(
        `SELECT id FROM timetable_slots
         WHERE class_id = $1 AND day_of_week = $2
         AND (
           (start_time <= $3 AND end_time > $3) OR
           (start_time < $4 AND end_time >= $4) OR
           (start_time >= $3 AND end_time <= $4)
         )`,
        [classId, dayOfWeek, startTime, endTime]
      );

      if (conflict) {
        throw new AppError('Time slot conflicts with existing schedule', 409);
      }

      const slotId = uuidv4();
      await execute(
        `INSERT INTO timetable_slots (id, class_id, day_of_week, start_time, end_time, room_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [slotId, classId, dayOfWeek, startTime, endTime, roomNumber]
      );

      res.status(201).json({
        message: 'Timetable slot created',
        slotId
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update timetable slot
timetableRouter.put('/:slotId',
  authenticate,
  requireRole('teacher', 'admin'),
  param('slotId').isUUID(),
  body('dayOfWeek').optional().isInt({ min: 0, max: 6 }),
  body('startTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('endTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('roomNumber').optional().isString().isLength({ max: 20 }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { slotId } = req.params;
      const { dayOfWeek, startTime, endTime, roomNumber } = req.body;

      const slot = await queryOne<any>(
        `SELECT ts.*, c.teacher_id
         FROM timetable_slots ts
         JOIN classes c ON c.id = ts.class_id
         WHERE ts.id = $1`,
        [slotId]
      );

      if (!slot) {
        throw new AppError('Slot not found', 404);
      }

      if (req.user!.role === 'teacher' && slot.teacher_id !== req.user!.id) {
        throw new AppError('Not authorized', 403);
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (dayOfWeek !== undefined) {
        updates.push(`day_of_week = $${paramCount++}`);
        values.push(dayOfWeek);
      }
      if (startTime) {
        updates.push(`start_time = $${paramCount++}`);
        values.push(startTime);
      }
      if (endTime) {
        updates.push(`end_time = $${paramCount++}`);
        values.push(endTime);
      }
      if (roomNumber !== undefined) {
        updates.push(`room_number = $${paramCount++}`);
        values.push(roomNumber);
      }

      if (updates.length === 0) {
        throw new AppError('No updates provided', 400);
      }

      values.push(slotId);
      await execute(
        `UPDATE timetable_slots SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );

      res.json({ message: 'Slot updated' });
    } catch (error) {
      next(error);
    }
  }
);

// Delete timetable slot
timetableRouter.delete('/:slotId',
  authenticate,
  requireRole('teacher', 'admin'),
  param('slotId').isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { slotId } = req.params;

      const result = await execute(
        'DELETE FROM timetable_slots WHERE id = $1',
        [slotId]
      );

      if (result === 0) {
        throw new AppError('Slot not found', 404);
      }

      res.json({ message: 'Slot deleted' });
    } catch (error) {
      next(error);
    }
  }
);
