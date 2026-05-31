import { pool } from '../db/pool';

export async function listVehicles(userId: string) {
  const result = await pool.query(
    `SELECT id, make, model, color, license_plate, seat_capacity, photo_url, is_active, created_at
     FROM vehicles WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function createVehicle(
  userId: string,
  data: { make: string; model: string; color?: string; licensePlate?: string; seatCapacity: number; photoUrl?: string },
) {
  const result = await pool.query(
    `INSERT INTO vehicles (user_id, make, model, color, license_plate, seat_capacity, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, data.make, data.model, data.color ?? null, data.licensePlate ?? null, data.seatCapacity, data.photoUrl ?? null],
  );
  return result.rows[0];
}

export async function updateVehicle(
  userId: string,
  vehicleId: string,
  data: Partial<{ make: string; model: string; color: string; licensePlate: string; seatCapacity: number; photoUrl: string }>,
) {
  const result = await pool.query(
    `UPDATE vehicles SET
       make = COALESCE($3, make), model = COALESCE($4, model),
       color = COALESCE($5, color), license_plate = COALESCE($6, license_plate),
       seat_capacity = COALESCE($7, seat_capacity), photo_url = COALESCE($8, photo_url),
       updated_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    [vehicleId, userId, data.make ?? null, data.model ?? null, data.color ?? null,
      data.licensePlate ?? null, data.seatCapacity ?? null, data.photoUrl ?? null],
  );
  if (!result.rows.length) throw new Error('Vehicle not found');
  return result.rows[0];
}

export async function deleteVehicle(userId: string, vehicleId: string) {
  await pool.query(
    `UPDATE vehicles SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
    [vehicleId, userId],
  );
}
