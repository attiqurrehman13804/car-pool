import { Router } from 'express';
import { AuthRequest, requireFullAuth } from '../middleware/auth';
import { pool } from '../db/pool';

const router = Router();

router.get('/:podId', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const member = await pool.query(
      `SELECT 1 FROM pod_members WHERE pod_id = $1 AND user_id = $2`,
      [req.params.podId, req.user!.userId],
    );
    if (!member.rows.length) {
      res.status(403).json({ error: 'Not a pod member' });
      return;
    }
    const result = await pool.query(
      `SELECT m.id, m.content, m.created_at, m.sender_id,
              u.email AS sender_email, u.full_name AS sender_name
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.pod_id = $1 ORDER BY m.created_at ASC LIMIT 100`,
      [req.params.podId],
    );
    res.json({ messages: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
