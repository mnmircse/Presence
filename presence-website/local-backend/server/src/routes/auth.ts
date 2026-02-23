import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query, queryOne, execute } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const authRouter = Router();

// Login
authRouter.post('/login',
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid input', 400);
      }

      const { username, password } = req.body;

      const user = await queryOne<any>(
        `SELECT id, username, password_hash, role, full_name, roll_number, department
         FROM users WHERE username = $1`,
        [username]
      );

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        throw new AppError('Invalid credentials', 401);
      }

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.full_name,
          rollNumber: user.roll_number,
          department: user.department
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Register
authRouter.post('/register',
  body('username').trim().isLength({ min: 3, max: 50 }),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().notEmpty(),
  body('role').isIn(['student', 'teacher']),
  body('rollNumber').optional().trim(),
  body('email').optional().isEmail(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid input: ' + JSON.stringify(errors.array()), 400);
      }

      const { username, password, fullName, role, rollNumber, email, department } = req.body;

      // Check existing user
      const existing = await queryOne(
        'SELECT id FROM users WHERE username = $1 OR (email = $2 AND email IS NOT NULL)',
        [username, email]
      );

      if (existing) {
        throw new AppError('Username or email already exists', 409);
      }

      // Check roll number uniqueness for students
      if (role === 'student' && rollNumber) {
        const existingRoll = await queryOne(
          'SELECT id FROM users WHERE roll_number = $1',
          [rollNumber]
        );
        if (existingRoll) {
          throw new AppError('Roll number already exists', 409);
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      await execute(
        `INSERT INTO users (id, username, password_hash, full_name, email, role, roll_number, department)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, username, passwordHash, fullName, email, role, rollNumber, department]
      );

      const token = jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.status(201).json({
        token,
        user: {
          id: userId,
          username,
          role,
          fullName,
          rollNumber,
          department
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});
