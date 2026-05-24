import { Router } from 'express';
import { pool } from '../db/pool';
import { AuthRequest, requireFullAuth } from '../middleware/auth';

const router = Router();

router.get('/upcoming', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.status,
         p.created_at,
         r.id AS ride_id,
         r.origin_label,
         r.destination_label,
         r.scheduled_at,
         r.status AS ride_status,
         ST_Y(r.origin::geometry) AS origin_lat,
         ST_X(r.origin::geometry) AS origin_lng,
         ST_Y(r.destination::geometry) AS dest_lat,
         ST_X(r.destination::geometry) AS dest_lng,
         pm.role,
         u.email AS driver_email
       FROM pods p
       JOIN rides r ON r.id = p.ride_id
       JOIN pod_members pm ON pm.pod_id = p.id AND pm.user_id = $1
       LEFT JOIN users u ON u.id = p.driver_id
       WHERE p.status IN ('scheduled', 'active')
         AND r.scheduled_at >= NOW() - INTERVAL '1 hour'
       ORDER BY r.scheduled_at ASC`,
      [userId],
    );

    res.json({ pods: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch upcoming pods' });
  }
});

router.get('/:id', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.status,
         r.id AS ride_id,
         r.origin_label,
         r.destination_label,
         r.scheduled_at,
         ST_Y(r.origin::geometry) AS origin_lat,
         ST_X(r.origin::geometry) AS origin_lng,
         ST_Y(r.destination::geometry) AS dest_lat,
         ST_X(r.destination::geometry) AS dest_lng,
         pm.role
       FROM pods p
       JOIN rides r ON r.id = p.ride_id
       JOIN pod_members pm ON pm.pod_id = p.id AND pm.user_id = $1
       WHERE p.id = $2`,
      [userId, id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Pod not found' });
      return;
    }

    res.json({ pod: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pod' });
  }
});

router.patch('/:id/activate', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const memberCheck = await pool.query(
      `SELECT pm.role FROM pod_members pm
       WHERE pm.pod_id = $1 AND pm.user_id = $2 AND pm.role = 'driver'`,
      [id, userId],
    );

    if (memberCheck.rows.length === 0) {
      res.status(403).json({ error: 'Only the driver can activate a pod' });
      return;
    }

    await pool.query(
      `UPDATE pods SET status = 'active' WHERE id = $1`,
      [id],
    );
    await pool.query(
      `UPDATE rides SET status = 'active'
       FROM pods p WHERE p.ride_id = rides.id AND p.id = $1`,
      [id],
    );

    res.json({ message: 'Pod activated', podId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to activate pod' });
  }
});

export default router;
