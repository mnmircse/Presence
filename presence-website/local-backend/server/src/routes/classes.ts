import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { query, queryOne, execute } from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const classesRouter = Router();

// Get all students (for enrollment) - MUST be before /:classId to avoid route conflict
classesRouter.get('/students/all',
  authenticate,
  requireRole('teacher', 'admin'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const students = await query(
        `SELECT id, full_name as "fullName", roll_number as "rollNumber", email, department
         FROM users
         WHERE role = 'student'
         ORDER BY roll_number`
      );

      res.json({ students });
    } catch (error) {
      next(error);
    }
  }
);

// Get all classes (filtered by role)
classesRouter.get('/',
  authenticate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      let classes;

      if (req.user!.role === 'teacher') {
        classes = await query(
          `SELECT c.*, 
                  (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id) as student_count
           FROM classes c
           WHERE c.teacher_id = $1
           ORDER BY c.class_name`,
          [req.user!.id]
        );
      } else if (req.user!.role === 'student') {
        classes = await query(
          `SELECT c.*, u.full_name as teacher_name
           FROM classes c
           JOIN class_enrollments ce ON ce.class_id = c.id
           JOIN users u ON u.id = c.teacher_id
           WHERE ce.student_id = $1
           ORDER BY c.class_name`,
          [req.user!.id]
        );
      } else {
        // Admin sees all
        classes = await query(
          `SELECT c.*, u.full_name as teacher_name,
                  (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id) as student_count
           FROM classes c
           LEFT JOIN users u ON u.id = c.teacher_id
           ORDER BY c.class_name`
        );
      }

      res.json({ classes });
    } catch (error) {
      next(error);
    }
  }
);

// Get class details
classesRouter.get('/:classId',
  authenticate,
  param('classId').isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { classId } = req.params;

      const classData = await queryOne<any>(
        `SELECT c.*, u.full_name as teacher_name
         FROM classes c
         LEFT JOIN users u ON u.id = c.teacher_id
         WHERE c.id = $1`,
        [classId]
      );

      if (!classData) {
        throw new AppError('Class not found', 404);
      }

      // Get enrolled students
      const students = await query(
        `SELECT u.id, u.full_name as "fullName", u.roll_number as "rollNumber", u.email,
                (SELECT COUNT(*) FROM face_embeddings fe WHERE fe.user_id = u.id) > 0 as face_enrolled
         FROM users u
         JOIN class_enrollments ce ON ce.student_id = u.id
         WHERE ce.class_id = $1
         ORDER BY u.roll_number`,
        [classId]
      );

      // Get WiFi access points
      const wifiAPs = await query(
        `SELECT id, ssid, bssid, location_name, rssi_threshold, is_active
         FROM wifi_access_points
         WHERE class_id = $1`,
        [classId]
      );

      res.json({ class: classData, students, wifiAPs });
    } catch (error) {
      next(error);
    }
  }
);

// Create class (Teacher/Admin)
classesRouter.post('/',
  authenticate,
  requireRole('teacher', 'admin'),
  body('className').trim().notEmpty().isLength({ max: 100 }),
  body('classCode').trim().notEmpty().isLength({ max: 20 }),
  body('subject').trim().notEmpty().isLength({ max: 100 }),
  body('semester').optional().isInt({ min: 1, max: 12 }),
  body('academicYear').optional().isString(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid input', 400);
      }

      const { className, classCode, subject, semester, academicYear } = req.body;
      const teacherId = req.user!.id;

      // Check for duplicate class code
      const existing = await queryOne(
        'SELECT id FROM classes WHERE class_code = $1',
        [classCode]
      );

      if (existing) {
        throw new AppError('Class code already exists', 409);
      }

      const classId = uuidv4();
      await execute(
        `INSERT INTO classes (id, class_name, class_code, subject, teacher_id, semester, academic_year)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [classId, className, classCode, subject, teacherId, semester, academicYear]
      );

      res.status(201).json({
        message: 'Class created successfully',
        classId
      });
    } catch (error) {
      next(error);
    }
  }
);

// Enroll student in class
classesRouter.post('/:classId/enroll',
  authenticate,
  requireRole('teacher', 'admin'),
  param('classId').isUUID(),
  body('studentId').isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { classId } = req.params;
      const { studentId } = req.body;

      // Verify student exists
      const student = await queryOne(
        "SELECT id FROM users WHERE id = $1 AND role = 'student'",
        [studentId]
      );

      if (!student) {
        throw new AppError('Student not found', 404);
      }

      // Check if already enrolled
      const existing = await queryOne(
        'SELECT id FROM class_enrollments WHERE class_id = $1 AND student_id = $2',
        [classId, studentId]
      );

      if (existing) {
        throw new AppError('Student already enrolled', 409);
      }

      await execute(
        'INSERT INTO class_enrollments (id, class_id, student_id) VALUES ($1, $2, $3)',
        [uuidv4(), classId, studentId]
      );

      res.status(201).json({ message: 'Student enrolled successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk enroll students
classesRouter.post('/:classId/enroll-bulk',
  authenticate,
  requireRole('teacher', 'admin'),
  param('classId').isUUID(),
  body('studentIds').isArray(),
  body('studentIds.*').isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { classId } = req.params;
      const { studentIds } = req.body;

      let enrolled = 0;
      let skipped = 0;

      for (const studentId of studentIds) {
        try {
          const existing = await queryOne(
            'SELECT id FROM class_enrollments WHERE class_id = $1 AND student_id = $2',
            [classId, studentId]
          );

          if (!existing) {
            await execute(
              'INSERT INTO class_enrollments (id, class_id, student_id) VALUES ($1, $2, $3)',
              [uuidv4(), classId, studentId]
            );
            enrolled++;
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      }

      res.json({ message: `Enrolled ${enrolled} students, skipped ${skipped}` });
    } catch (error) {
      next(error);
    }
  }
);

// Remove student from class
classesRouter.delete('/:classId/students/:studentId',
  authenticate,
  requireRole('teacher', 'admin'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { classId, studentId } = req.params;

      const result = await execute(
        'DELETE FROM class_enrollments WHERE class_id = $1 AND student_id = $2',
        [classId, studentId]
      );

      if (result === 0) {
        throw new AppError('Enrollment not found', 404);
      }

      res.json({ message: 'Student removed from class' });
    } catch (error) {
      next(error);
    }
  }
);

// Note: /students/all route moved to top of file to avoid /:classId route conflict
