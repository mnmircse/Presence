import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { query, queryOne, execute } from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export const wifiRouter = Router();

/* ============================================================
   ALLOWED SSIDs (FIXED LOCATIONS)
   ============================================================ */
const ALLOWED_SSIDS = ['rec', 'HOME_Wi-Fi', 'sec'] as const;
type AllowedSSID = typeof ALLOWED_SSIDS[number];

/* ============================================================
   GET WIFI ACCESS POINTS FOR A CLASS
   ============================================================ */
wifiRouter.get(
  '/class/:classId',
  authenticate,
  param('classId').isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid classId', 400);
      }

      const { classId } = req.params;

      // Teacher can access only own class
      if (req.user!.role === 'teacher') {
        const owns = await queryOne(
          'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
          [classId, req.user!.id]
        );
        if (!owns) {
          throw new AppError('Unauthorized class access', 403);
        }
      }

      const accessPoints = await query(
        `SELECT id, ssid, bssid, location_name, rssi_threshold, is_active, created_at
         FROM wifi_access_points
         WHERE class_id = $1
         ORDER BY location_name`,
        [classId]
      );

      res.json({ accessPoints });
    } catch (e) {
      next(e);
    }
  }
);

/* ============================================================
   ADD WIFI ACCESS POINT (SSID STRICT)
   ============================================================ */
wifiRouter.post(
  '/',
  authenticate,
  requireRole('teacher', 'admin'),
  body('classId').isUUID(),
  body('ssid').custom((value: string) => {
    if (!ALLOWED_SSIDS.includes(value as AllowedSSID)) {
      throw new Error(`SSID must be one of: ${ALLOWED_SSIDS.join(', ')}`);
    }
    return true;
  }),
  body('bssid')
    .trim()
    .matches(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/),
  body('rssiThreshold').optional().isInt({ min: -100, max: 0 }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const {
        classId,
        ssid,
        bssid,
        rssiThreshold = -70
      } = req.body;

      // Verify class ownership
      if (req.user!.role === 'teacher') {
        const owns = await queryOne(
          'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
          [classId, req.user!.id]
        );
        if (!owns) {
          throw new AppError('Unauthorized class access', 403);
        }
      }

      // Prevent duplicate BSSID
      const existing = await queryOne(
        'SELECT id FROM wifi_access_points WHERE bssid = $1',
        [bssid.toUpperCase()]
      );
      if (existing) {
        throw new AppError('BSSID already registered', 409);
      }

      const apId = uuidv4();

      await execute(
        `INSERT INTO wifi_access_points
         (id, ssid, bssid, location_name, class_id, rssi_threshold, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [
          apId,
          ssid,
          bssid.toUpperCase(),
          ssid,          // location_name = SSID
          classId,
          rssiThreshold
        ]
      );

      res.status(201).json({
        message: 'WiFi access point added',
        accessPointId: apId
      });
    } catch (e) {
      next(e);
    }
  }
);

/* ============================================================
   UPDATE WIFI ACCESS POINT
   ============================================================ */
wifiRouter.put(
  '/:apId',
  authenticate,
  requireRole('teacher', 'admin'),
  param('apId').isUUID(),
  body('rssiThreshold').optional().isInt({ min: -100, max: 0 }),
  body('isActive').optional().isBoolean(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid update payload', 400);
      }

      const { apId } = req.params;
      const { rssiThreshold, isActive } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (rssiThreshold !== undefined) {
        updates.push(`rssi_threshold = $${i++}`);
        values.push(rssiThreshold);
      }
      if (isActive !== undefined) {
        updates.push(`is_active = $${i++}`);
        values.push(isActive);
      }

      if (!updates.length) {
        throw new AppError('No updates provided', 400);
      }

      values.push(apId);

      const result = await execute(
        `UPDATE wifi_access_points
         SET ${updates.join(', ')}
         WHERE id = $${i}`,
        values
      );

      if (result === 0) {
        throw new AppError('Access point not found', 404);
      }

      res.json({ message: 'Access point updated' });
    } catch (e) {
      next(e);
    }
  }
);

/* ============================================================
   DELETE WIFI ACCESS POINT
   ============================================================ */
wifiRouter.delete(
  '/:apId',
  authenticate,
  requireRole('teacher', 'admin'),
  param('apId').isUUID(),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid AP ID', 400);
      }

      const result = await execute(
        'DELETE FROM wifi_access_points WHERE id = $1',
        [req.params.apId]
      );

      if (result === 0) {
        throw new AppError('Access point not found', 404);
      }

      res.json({ message: 'Access point deleted' });
    } catch (e) {
      next(e);
    }
  }
);

/* ============================================================
   VALIDATE WIFI DATA (TEST / DEBUG)
   ============================================================ */
wifiRouter.post(
  '/validate',
  authenticate,
  body('classId').isUUID(),
  body('wifiData').isArray({ min: 1 }),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid validation payload', 400);
      }

      const { classId, wifiData } = req.body;

      const aps = await query<any>(
        `SELECT bssid, rssi_threshold, location_name
         FROM wifi_access_points
         WHERE class_id = $1 AND is_active = true`,
        [classId]
      );

      let validCount = 0;
      const results = aps.map(ap => {
        const scanned = wifiData.find(
          (w: any) => w.bssid.toUpperCase() === ap.bssid.toUpperCase()
        );
        const ok = scanned && scanned.rssi >= ap.rssi_threshold;
        if (ok) validCount++;

        return {
          ssid: ap.location_name,
          bssid: ap.bssid,
          threshold: ap.rssi_threshold,
          scannedRssi: scanned?.rssi ?? null,
          isValid: ok
        };
      });

      const MIN_APS = Number(process.env.WIFI_MIN_APS_REQUIRED || 2);

      res.json({
        accessPoints: results,
        validCount,
        required: MIN_APS,
        isPresent: validCount >= MIN_APS
      });
    } catch (e) {
      next(e);
    }
  }
);
