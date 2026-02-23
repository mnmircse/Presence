import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../config/database';

export interface AuthUser {
  id: string;
  username: string;
  role: 'student' | 'teacher' | 'admin';
  fullName: string;
  rollNumber?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    
    const decoded = jwt.verify(token, secret) as { userId: string };
    
    const user = await queryOne<any>(
      `SELECT id, username, role, full_name, roll_number 
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name,
      rollNumber: user.roll_number
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
