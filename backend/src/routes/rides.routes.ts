import { Router } from 'express';
import { pool } from '../db/pool';
import { AuthRequest, requireFullAuth } from '../middleware/auth';

const router = Router();

router.post('/:id/sos', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id: rideId } = req.params;

    const membership = await pool.query(
      `SELECT pm.pod_id FROM pod_members pm
       JOIN pods p ON p.id = pm.pod_id
       WHERE p.ride_id = $1 AND pm.user_id = $2`,
      [rideId, userId],
    );

    if (membership.rows.length === 0) {
      res.status(403).json({ error: 'You are not a member of this ride' });
      return;
    }

    const alert = await pool.query(
      `INSERT INTO sos_alerts (ride_id, user_id) VALUES ($1, $2) RETURNING id, created_at`,
      [rideId, userId],
    );

    const io = req.app.get('io');
    if (io) {
      const podId = membership.rows[0].pod_id;
      io.to(`pod:${podId}`).emit('sos:alert', {
        rideId,
        userId,
        alertId: alert.rows[0].id,
        timestamp: alert.rows[0].created_at,
      });
    }

    res.json({
      message: 'SOS alert sent',
      alertId: alert.rows[0].id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send SOS alert' });
  }
});

router.get('/:id/sos', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const { id: rideId } = req.params;
    const result = await pool.query(
      `SELECT id, user_id, created_at FROM sos_alerts
       WHERE ride_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [rideId],
    );
    res.json({ alerts: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch SOS alerts' });
  }
});

export default router;
