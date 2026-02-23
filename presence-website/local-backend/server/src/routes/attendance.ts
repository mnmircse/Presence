import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, execute } from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const attendanceRouter = Router();

/* ============================================================
   GET MY ATTENDANCE RECORDS (FIXES 404)
   ============================================================ */
attendanceRouter.get(
  '/my-records',
  authenticate,
  requireRole('student'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const records = await query(
        `SELECT ar.*, s.start_time, s.status
         FROM attendance_records ar
         JOIN attendance_sessions s ON s.id = ar.session_id
         WHERE ar.student_id = $1
         ORDER BY s.start_time DESC`,
        [req.user!.id]
      );

      res.json(records);
    } catch (e) {
      next(e);
    }
  }
);

/* ============================================================
   WIFI VERIFICATION
   ============================================================ */
attendanceRouter.post(
  '/verify-wifi',
  authenticate,
  requireRole('student'),
  body('sessionId').isUUID(),
  body('wifiData').isArray({ min: 1 }),
  body('wifiData.*.bssid').isString(),
  body('wifiData.*.rssi').isNumeric(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid WiFi payload', 400);
      }

      const { sessionId, wifiData } = req.body;
      const studentId = req.user!.id;

      /* ---- Check session ---- */
      const session = await queryOne<any>(
        `SELECT id, class_id, status, start_time, window_duration_minutes
         FROM attendance_sessions
         WHERE id = $1`,
        [sessionId]
      );

      if (!session || session.status !== 'active') {
        throw new AppError('Session not active', 400);
      }

      const windowEnd = new Date(session.start_time);
      windowEnd.setMinutes(
        windowEnd.getMinutes() + session.window_duration_minutes
      );

      if (new Date() > windowEnd) {
        throw new AppError('Attendance window expired', 400);
      }

      /* ---- ENSURE attendance record exists (CRITICAL FIX) ---- */
      await execute(
        `INSERT INTO attendance_records (session_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT (session_id, student_id) DO NOTHING`,
        [sessionId, studentId]
      );

      /* ---- Load APs ---- */
      const accessPoints = await query<any>(
        `SELECT bssid, rssi_threshold
         FROM wifi_access_points
         WHERE class_id = $1 AND is_active = true`,
        [session.class_id]
      );

      if (!accessPoints.length) {
        throw new AppError('No WiFi access points configured', 400);
      }

      const MIN_APS = Number(process.env.WIFI_MIN_APS_REQUIRED || 2);
      let matched = 0;
      const rssiData: Record<string, number> = {};

      for (const ap of accessPoints) {
        const scanned = wifiData.find(
          (w: any) => w.bssid.toUpperCase() === ap.bssid.toUpperCase()
        );

        if (scanned && scanned.rssi >= ap.rssi_threshold) {
          matched++;
          rssiData[ap.bssid] = scanned.rssi;
        }
      }

      const wifiVerified = matched >= MIN_APS;

      await execute(
        `UPDATE attendance_records
         SET wifi_verified = $1,
             wifi_rssi_data = $2,
             wifi_verified_at = NOW()
         WHERE session_id = $3 AND student_id = $4`,
        [wifiVerified, JSON.stringify(rssiData), sessionId, studentId]
      );

      res.json({
        success: wifiVerified,
        matchedAPs: matched,
        requiredAPs: MIN_APS,
      });
    } catch (e) {
      next(e);
    }
  }
);

/* ============================================================
   FACE VERIFICATION
   ============================================================ */
attendanceRouter.post(
  '/verify-face',
  authenticate,
  requireRole('student'),
  body('sessionId').isUUID(),
  body('faceEmbedding').isArray({ min: 10 }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid face payload', 400);
      }

      const { sessionId, faceEmbedding } = req.body;
      const studentId = req.user!.id;

      const record = await queryOne<any>(
        `SELECT wifi_verified
         FROM attendance_records
         WHERE session_id = $1 AND student_id = $2`,
        [sessionId, studentId]
      );

      if (!record) {
        throw new AppError('Attendance record not found', 404);
      }

      if (!record.wifi_verified) {
        throw new AppError('WiFi verification required first', 400);
      }

      const stored = await queryOne<any>(
        `SELECT embedding
         FROM face_embeddings
         WHERE user_id = $1 AND is_primary = true`,
        [studentId]
      );

      if (!stored) {
        throw new AppError('Face not enrolled', 400);
      }

      const similarity = cosineSimilarity(
        stored.embedding,
        faceEmbedding
      );

      const FACE_THRESHOLD = 0.6;
      const faceVerified = similarity >= FACE_THRESHOLD;

      await execute(
        `UPDATE attendance_records
         SET face_verified = $1,
             face_confidence = $2,
             face_verified_at = NOW()
         WHERE session_id = $3 AND student_id = $4`,
        [faceVerified, similarity, sessionId, studentId]
      );

      res.json({
        success: faceVerified,
        confidence: Math.round(similarity * 100),
      });
    } catch (e) {
      next(e);
    }
  }
);

/* ============================================================
   UTILITY
   ============================================================ */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
