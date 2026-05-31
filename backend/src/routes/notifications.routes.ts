import { Router } from 'express';
import { AuthRequest, requireFullAuth } from '../middleware/auth';
import { pool } from '../db/pool';

const router = Router();

router.get('/', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT id, type, title, body, payload, read_at, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user!.userId],
    );
    res.json({ notifications: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/:id/read', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.userId],
    );
    res.json({ message: 'Marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.patch('/read-all', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
      [req.user!.userId],
    );
    res.json({ message: 'All marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

export default router;
