import { Router } from 'express';
import { pool } from '../db/pool';
import { AuthRequest, requireFullAuth } from '../middleware/auth';
import { confirmPickup, completeRide, getRideHistory } from '../services/matching.service';
import { sendSosAlertEmail } from '../services/email.service';
import { createNotification } from '../services/notification.service';
import { config } from '../config';
import { paramId } from '../utils/params';

const router = Router();

router.get('/history', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    res.json({ rides: await getRideHistory(req.user!.userId) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch ride history' });
  }
});

router.post('/:id/sos', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id: rideId } = req.params;
    const { lat, lng } = req.body;

    const membership = await pool.query(
      `SELECT pm.pod_id FROM pod_members pm
       JOIN pods p ON p.id = pm.pod_id WHERE p.ride_id = $1 AND pm.user_id = $2`,
      [rideId, userId],
    );
    if (membership.rows.length === 0) {
      res.status(403).json({ error: 'You are not a member of this ride' });
      return;
    }

    const user = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
    const alert = await pool.query(
      `INSERT INTO sos_alerts (ride_id, user_id, lat, lng) VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [rideId, userId, lat ?? null, lng ?? null],
    );

    const contacts = await pool.query(
      `SELECT ec.phone, u.email FROM emergency_contacts ec
       JOIN users u ON u.id = ec.user_id WHERE ec.user_id = $1`,
      [userId],
    );
    const adminResult = await pool.query(`SELECT email FROM users WHERE is_admin = TRUE`);
    const emails = [
      ...adminResult.rows.map(r => r.email),
      config.adminEmail,
    ].filter(Boolean);

    if (lat && lng) {
      await sendSosAlertEmail(emails, user.rows[0]?.email ?? 'unknown', lat, lng);
    }

    const io = req.app.get('io');
    const podId = membership.rows[0].pod_id;
    if (io) {
      io.to(`pod:${podId}`).emit('sos:alert', {
        rideId, userId, alertId: alert.rows[0].id,
        lat, lng, timestamp: alert.rows[0].created_at,
      });
    }

    const podMembers = await pool.query(
      `SELECT user_id FROM pod_members WHERE pod_id = $1 AND user_id != $2`,
      [podId, userId],
    );
    for (const m of podMembers.rows) {
      await createNotification(m.user_id, 'sos', 'SOS ALERT', 'Emergency alert in your pod!', { rideId, lat, lng });
    }

    res.json({ message: 'SOS alert sent', alertId: alert.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send SOS alert' });
  }
});

router.get('/:id/sos', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT sa.id, sa.user_id, sa.lat, sa.lng, sa.created_at, sa.resolved_at, u.email
       FROM sos_alerts sa JOIN users u ON u.id = sa.user_id
       WHERE sa.ride_id = $1 ORDER BY sa.created_at DESC LIMIT 20`,
      [paramId(req.params.id)],
    );
    res.json({ alerts: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch SOS alerts' });
  }
});

router.post('/:id/confirm-pickup', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const { otp } = req.body;
    if (!otp) { res.status(400).json({ error: 'OTP required' }); return; }
    res.json(await confirmPickup(req.user!.userId, paramId(req.params.id), otp));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Confirmation failed' });
  }
});

router.patch('/:id/complete', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    res.json(await completeRide(req.user!.userId, paramId(req.params.id)));
  } catch (error) {
    res.status(403).json({ error: error instanceof Error ? error.message : 'Complete failed' });
  }
});

export default router;
