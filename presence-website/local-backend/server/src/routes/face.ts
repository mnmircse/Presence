import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { query, queryOne, execute } from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const faceRouter = Router();

// Enroll face embedding
faceRouter.post('/enroll',
  authenticate,
  requireRole('student'),
  body('embedding').isArray().isLength({ min: 128, max: 128 }),
  body('embedding.*').isNumeric(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid embedding format. Expected 128-dimensional array.', 400);
      }

      const { embedding } = req.body;
      const userId = req.user!.id;

      // Generate hash for duplicate detection
      const embeddingHash = crypto
        .createHash('sha256')
        .update(embedding.join(','))
        .digest('hex');

      // Check for duplicate face across ALL users
      const duplicate = await queryOne<any>(
        `SELECT fe.id, u.full_name 
         FROM face_embeddings fe
         JOIN users u ON u.id = fe.user_id
         WHERE fe.embedding_hash = $1`,
        [embeddingHash]
      );

      if (duplicate) {
        throw new AppError(
          `This face is already enrolled for another user (${duplicate.full_name}). Duplicate faces are not allowed.`,
          409
        );
      }

      // Check similarity with existing embeddings (1:N check)
      const allEmbeddings = await query<any>(
        `SELECT fe.embedding, fe.user_id, u.full_name
         FROM face_embeddings fe
         JOIN users u ON u.id = fe.user_id
         WHERE fe.user_id != $1`,
        [userId]
      );

      for (const existing of allEmbeddings) {
        const similarity = calculateCosineSimilarity(existing.embedding, embedding);
        if (similarity > 0.85) { // High similarity threshold
          throw new AppError(
            `Face too similar to existing enrollment (${existing.full_name}). Each person can only enroll once.`,
            409
          );
        }
      }

      // Remove existing embeddings for this user (re-enrollment)
      await execute(
        'DELETE FROM face_embeddings WHERE user_id = $1',
        [userId]
      );

      // Insert new embedding
      const embeddingId = uuidv4();
      await execute(
        `INSERT INTO face_embeddings (id, user_id, embedding, embedding_hash, is_primary)
         VALUES ($1, $2, $3, $4, true)`,
        [embeddingId, userId, embedding, embeddingHash]
      );

      res.status(201).json({
        message: 'Face enrolled successfully',
        embeddingId
      });
    } catch (error) {
      next(error);
    }
  }
);

// Check if face is enrolled
faceRouter.get('/status',
  authenticate,
  requireRole('student'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;

      const embedding = await queryOne(
        `SELECT id, created_at FROM face_embeddings 
         WHERE user_id = $1 AND is_primary = true`,
        [userId]
      );

      res.json({
        enrolled: !!embedding,
        enrolledAt: embedding?.created_at || null
      });
    } catch (error) {
      next(error);
    }
  }
);

// Identify face (1:N matching for a session)
faceRouter.post('/identify',
  authenticate,
  body('embedding').isArray().isLength({ min: 128, max: 128 }),
  body('sessionId').isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid input', 400);
      }

      const { embedding, sessionId } = req.body;

      // Get session's class
      const session = await queryOne<any>(
        `SELECT class_id FROM attendance_sessions WHERE id = $1 AND status = 'active'`,
        [sessionId]
      );

      if (!session) {
        throw new AppError('Session not found or inactive', 404);
      }

      // Get all enrolled faces for students in this class
      const enrolledFaces = await query<any>(
        `SELECT fe.embedding, fe.user_id, u.full_name, u.roll_number
         FROM face_embeddings fe
         JOIN users u ON u.id = fe.user_id
         JOIN class_enrollments ce ON ce.student_id = u.id
         WHERE ce.class_id = $1 AND fe.is_primary = true`,
        [session.class_id]
      );

      if (enrolledFaces.length === 0) {
        throw new AppError('No enrolled faces in this class', 400);
      }

      // Find best match
      let bestMatch: any = null;
      let bestSimilarity = 0;

      for (const face of enrolledFaces) {
        const similarity = calculateCosineSimilarity(face.embedding, embedding);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = face;
        }
      }

      const MATCH_THRESHOLD = 0.6;

      if (bestSimilarity >= MATCH_THRESHOLD && bestMatch) {
        res.json({
          matched: true,
          confidence: Math.round(bestSimilarity * 100),
          student: {
            id: bestMatch.user_id,
            name: bestMatch.full_name,
            rollNumber: bestMatch.roll_number
          }
        });
      } else {
        res.json({
          matched: false,
          confidence: Math.round(bestSimilarity * 100),
          message: 'No matching face found'
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// Delete face enrollment
faceRouter.delete('/enrollment',
  authenticate,
  requireRole('student'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;

      const result = await execute(
        'DELETE FROM face_embeddings WHERE user_id = $1',
        [userId]
      );

      if (result === 0) {
        throw new AppError('No face enrollment found', 404);
      }

      res.json({ message: 'Face enrollment deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// Helper function for cosine similarity
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
