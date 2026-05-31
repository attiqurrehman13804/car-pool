import { Router } from 'express';
import { pool } from '../db/pool';
import { AuthRequest, requireFullAuth } from '../middleware/auth';
import {
  getPodDetail,
  joinPod,
  leavePod,
  activatePod,
  searchMatches,
} from '../services/matching.service';
import { paramId } from '../utils/params';

const router = Router();

router.get('/upcoming', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const result = await pool.query(
      `SELECT p.id, p.name, p.status, p.created_at, p.max_capacity,
         r.id AS ride_id, r.origin_label, r.destination_label, r.scheduled_at,
         r.status AS ride_status, r.seats_available, r.capacity,
         ST_Y(r.origin::geometry) AS origin_lat, ST_X(r.origin::geometry) AS origin_lng,
         ST_Y(r.destination::geometry) AS dest_lat, ST_X(r.destination::geometry) AS dest_lng,
         pm.role, u.email AS driver_email, u.full_name AS driver_name
       FROM pods p
       JOIN rides r ON r.id = p.ride_id
       JOIN pod_members pm ON pm.pod_id = p.id AND pm.user_id = $1
       LEFT JOIN users u ON u.id = p.driver_id
       WHERE p.status IN ('scheduled', 'active', 'picked_up')
         AND r.scheduled_at >= NOW() - INTERVAL '24 hours'
       ORDER BY r.scheduled_at ASC`,
      [userId],
    );
    res.json({ pods: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch upcoming pods' });
  }
});

router.get('/search', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    res.json({ matches: await searchMatches(req.user!.userId) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search pods' });
  }
});

router.get('/:id', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const pod = await getPodDetail(req.user!.userId, paramId(req.params.id));
    res.json({ pod });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Pod not found' });
  }
});

router.post('/:id/join', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const { pickupLat, pickupLng, pickupLabel } = req.body;
    const pod = await joinPod(req.user!.userId, paramId(req.params.id), pickupLat, pickupLng, pickupLabel);
    res.json({ pod });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Join failed' });
  }
});

router.post('/:id/leave', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    await leavePod(req.user!.userId, paramId(req.params.id));
    res.json({ message: 'Left pod successfully' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Leave failed' });
  }
});

router.patch('/:id/activate', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const result = await activatePod(req.user!.userId, paramId(req.params.id));
    res.json({ message: 'Pod activated', ...result });
  } catch (error) {
    res.status(403).json({ error: error instanceof Error ? error.message : 'Activation failed' });
  }
});

export default router;
