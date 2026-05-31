import { Router } from 'express';
import { AuthRequest, requireFullAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/account';
import { pool } from '../db/pool';

const router = Router();

router.use(requireFullAuth);
router.use(requireAdmin);

router.get('/users', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, phone, status, is_admin, default_role, created_at
       FROM users ORDER BY created_at DESC LIMIT 100`,
    );
    res.json({ users: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query(`UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1`, [req.params.id, status]);
    res.json({ message: 'User status updated' });
  } catch {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.get('/sos', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT sa.*, u.email, r.origin_label, r.destination_label
       FROM sos_alerts sa
       JOIN users u ON u.id = sa.user_id
       JOIN rides r ON r.id = sa.ride_id
       ORDER BY sa.created_at DESC LIMIT 100`,
    );
    res.json({ alerts: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch SOS alerts' });
  }
});

router.patch('/sos/:id/resolve', async (req: AuthRequest, res) => {
  try {
    await pool.query(
      `UPDATE sos_alerts SET resolved_at = NOW(), resolved_by = $2 WHERE id = $1`,
      [req.params.id, req.user!.userId],
    );
    res.json({ message: 'SOS resolved' });
  } catch {
    res.status(500).json({ error: 'Failed to resolve SOS' });
  }
});

router.get('/analytics/heatmap', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ST_Y(start_point::geometry) AS lat, ST_X(start_point::geometry) AS lng,
              COUNT(*)::int AS count
       FROM commute_schedules WHERE is_active = TRUE
       GROUP BY start_point
       ORDER BY count DESC LIMIT 200`,
    );
    res.json({ points: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
});

router.get('/analytics/summary', async (_req, res) => {
  try {
    const users = await pool.query(`SELECT COUNT(*)::int AS count FROM users`);
    const rides = await pool.query(`SELECT COUNT(*)::int AS count FROM rides`);
    const pods = await pool.query(`SELECT COUNT(*)::int AS count FROM pods`);
    const sos = await pool.query(`SELECT COUNT(*)::int AS count FROM sos_alerts WHERE resolved_at IS NULL`);
    res.json({
      users: users.rows[0].count,
      rides: rides.rows[0].count,
      pods: pods.rows[0].count,
      openSos: sos.rows[0].count,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
