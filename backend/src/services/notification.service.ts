import { pool } from '../db/pool';

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, body, payload ? JSON.stringify(payload) : null],
  );
}

export async function notifyPodMembers(
  podId: string,
  excludeUserId: string | null,
  type: string,
  title: string,
  body: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const members = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM pod_members WHERE pod_id = $1`,
    [podId],
  );
  for (const m of members.rows) {
    if (m.user_id !== excludeUserId) {
      await createNotification(m.user_id, type, title, body, payload);
    }
  }
}
