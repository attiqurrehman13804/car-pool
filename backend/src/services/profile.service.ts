import { pool } from '../db/pool';

export async function getProfile(userId: string) {
  const result = await pool.query(
    `SELECT id, email, full_name, phone, profile_photo_url, default_role, is_admin,
            is_email_verified, security_setup_complete, created_at
     FROM users WHERE id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function updateProfile(
  userId: string,
  data: { fullName?: string; phone?: string; profilePhotoUrl?: string; defaultRole?: string },
) {
  await pool.query(
    `UPDATE users SET
       full_name = COALESCE($2, full_name),
       phone = COALESCE($3, phone),
       profile_photo_url = COALESCE($4, profile_photo_url),
       default_role = COALESCE($5, default_role),
       updated_at = NOW()
     WHERE id = $1`,
    [userId, data.fullName ?? null, data.phone ?? null, data.profilePhotoUrl ?? null, data.defaultRole ?? null],
  );
  return getProfile(userId);
}

export async function listEmergencyContacts(userId: string) {
  const result = await pool.query(
    `SELECT id, name, phone, relationship, is_primary FROM emergency_contacts
     WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC`,
    [userId],
  );
  return result.rows;
}

export async function addEmergencyContact(
  userId: string,
  data: { name: string; phone: string; relationship?: string; isPrimary?: boolean },
) {
  if (data.isPrimary) {
    await pool.query(`UPDATE emergency_contacts SET is_primary = FALSE WHERE user_id = $1`, [userId]);
  }
  const result = await pool.query(
    `INSERT INTO emergency_contacts (user_id, name, phone, relationship, is_primary)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, data.name, data.phone, data.relationship ?? null, data.isPrimary ?? false],
  );
  return result.rows[0];
}

export async function deleteEmergencyContact(userId: string, contactId: string) {
  await pool.query(`DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2`, [contactId, userId]);
}

export async function uploadAvatar(userId: string, base64Data: string, mimeType: string) {
  const dataUrl = `data:${mimeType};base64,${base64Data}`;
  await pool.query(
    `UPDATE users SET profile_photo_url = $2, updated_at = NOW() WHERE id = $1`,
    [userId, dataUrl],
  );
  return { profilePhotoUrl: dataUrl };
}
