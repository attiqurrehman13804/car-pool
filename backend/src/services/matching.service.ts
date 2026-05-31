import { pool } from '../db/pool';
import { config } from '../config';
import { generatePickupOtp } from '../utils/validation';
import { createNotification, notifyPodMembers } from './notification.service';

export interface ScheduleInput {
  role: 'driver' | 'rider';
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startLabel?: string;
  endLabel?: string;
  daysOfWeek: number[];
  departureTime: string;
  returnTime?: string;
  vehicleId?: string;
}

export async function createSchedule(userId: string, input: ScheduleInput) {
  const result = await pool.query(
    `INSERT INTO commute_schedules
       (user_id, role, start_point, end_point, start_label, end_label,
        days_of_week, departure_time, return_time, vehicle_id)
     VALUES ($1, $2,
       ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
       ST_SetSRID(ST_MakePoint($6, $5), 4326)::geography,
       $7, $8, $9, $10, $11, $12)
     RETURNING id, role, start_label, end_label, days_of_week, departure_time, return_time,
       ST_Y(start_point::geometry) AS start_lat, ST_X(start_point::geometry) AS start_lng,
       ST_Y(end_point::geometry) AS end_lat, ST_X(end_point::geometry) AS end_lng,
       vehicle_id, is_active, created_at`,
    [
      userId, input.role, input.startLat, input.startLng, input.endLat, input.endLng,
      input.startLabel ?? null, input.endLabel ?? null, input.daysOfWeek,
      input.departureTime, input.returnTime ?? null, input.vehicleId ?? null,
    ],
  );
  const schedule = result.rows[0];
  if (input.role === 'driver') {
    await autoCreateRideFromSchedule(userId, schedule.id, input);
  }
  await runMatchingForUser(userId);
  return schedule;
}

async function autoCreateRideFromSchedule(userId: string, scheduleId: string, input: ScheduleInput) {
  const vehicle = input.vehicleId
    ? await pool.query<{ seat_capacity: number }>(`SELECT seat_capacity FROM vehicles WHERE id = $1`, [input.vehicleId])
    : { rows: [{ seat_capacity: 4 }] };
  const capacity = vehicle.rows[0]?.seat_capacity ?? 4;
  const scheduledAt = nextOccurrence(input.daysOfWeek, input.departureTime);

  await pool.query(
    `INSERT INTO rides (driver_id, schedule_id, origin, destination, origin_label, destination_label,
       scheduled_at, status, capacity, seats_available, route_path)
     SELECT $1, $2,
       cs.start_point, cs.end_point, cs.start_label, cs.end_label,
       $3, 'scheduled', $4, $4,
       ST_MakeLine(cs.start_point::geometry, cs.end_point::geometry)::geography
     FROM commute_schedules cs WHERE cs.id = $2`,
    [userId, scheduleId, scheduledAt, capacity - 1],
  );
}

function nextOccurrence(daysOfWeek: number[], departureTime: string): Date {
  const now = new Date();
  const [hours, minutes] = departureTime.split(':').map(Number);
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dow = d.getDay() === 0 ? 7 : d.getDay();
    if (daysOfWeek.includes(dow)) {
      d.setHours(hours, minutes ?? 0, 0, 0);
      if (d > now) return d;
    }
  }
  const fallback = new Date(now);
  fallback.setHours(hours, minutes ?? 0, 0, 0);
  fallback.setDate(fallback.getDate() + 1);
  return fallback;
}

export async function listSchedules(userId: string) {
  const result = await pool.query(
    `SELECT id, role, start_label, end_label, days_of_week, departure_time, return_time,
       ST_Y(start_point::geometry) AS start_lat, ST_X(start_point::geometry) AS start_lng,
       ST_Y(end_point::geometry) AS end_lat, ST_X(end_point::geometry) AS end_lng,
       vehicle_id, is_active, created_at
     FROM commute_schedules WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function updateSchedule(userId: string, scheduleId: string, input: Partial<ScheduleInput>) {
  const existing = await pool.query(`SELECT id FROM commute_schedules WHERE id = $1 AND user_id = $2`, [scheduleId, userId]);
  if (!existing.rows.length) throw new Error('Schedule not found');

  await pool.query(
    `UPDATE commute_schedules SET
       role = COALESCE($3, role),
       start_point = CASE WHEN $4::float IS NOT NULL THEN ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography ELSE start_point END,
       end_point = CASE WHEN $6::float IS NOT NULL THEN ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography ELSE end_point END,
       start_label = COALESCE($8, start_label),
       end_label = COALESCE($9, end_label),
       days_of_week = COALESCE($10, days_of_week),
       departure_time = COALESCE($11, departure_time),
       return_time = COALESCE($12, return_time),
       vehicle_id = COALESCE($13, vehicle_id),
       updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [
      scheduleId, userId, input.role ?? null,
      input.startLat ?? null, input.startLng ?? null,
      input.endLat ?? null, input.endLng ?? null,
      input.startLabel ?? null, input.endLabel ?? null,
      input.daysOfWeek ?? null, input.departureTime ?? null,
      input.returnTime ?? null, input.vehicleId ?? null,
    ],
  );
  await runMatchingForUser(userId);
  return listSchedules(userId);
}

export async function deleteSchedule(userId: string, scheduleId: string) {
  await pool.query(
    `UPDATE commute_schedules SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
    [scheduleId, userId],
  );
}

export async function runMatchingForUser(userId: string) {
  const riderSchedules = await pool.query(
    `SELECT * FROM commute_schedules WHERE user_id = $1 AND role = 'rider' AND is_active = TRUE`,
    [userId],
  );
  for (const rs of riderSchedules.rows) {
    await findAndJoinMatches(userId, rs);
  }
}

async function findAndJoinMatches(riderId: string, riderSchedule: Record<string, unknown>) {
  const timeWindow = config.matchingTimeWindowMinutes;
  const distance = config.matchingDistanceMeters;
  const departureTime = riderSchedule.departure_time as string;

  const matches = await pool.query(
    `SELECT r.id AS ride_id, r.driver_id, r.seats_available, r.scheduled_at,
       cs.departure_time,
       ST_Distance(r.origin, ST_SetSRID(ST_MakePoint(
         ST_X($2::geometry), ST_Y($2::geometry)), 4326)::geography) AS start_dist,
       ST_Distance(r.destination, ST_SetSRID(ST_MakePoint(
         ST_X($3::geometry), ST_Y($3::geometry)), 4326)::geography) AS end_dist,
       ABS(EXTRACT(EPOCH FROM (r.scheduled_at::time - $4::time))) / 60 AS time_diff_min
     FROM rides r
     JOIN commute_schedules cs ON cs.id = r.schedule_id
     WHERE r.status = 'scheduled'
       AND r.seats_available > 0
       AND r.driver_id != $1
       AND ST_DWithin(r.origin, $2, $5)
       AND ST_DWithin(r.destination, $3, $5)
       AND ABS(EXTRACT(EPOCH FROM (cs.departure_time - $4::time))) / 60 <= $6
     ORDER BY start_dist + end_dist ASC
     LIMIT 5`,
    [
      riderId,
      riderSchedule.start_point,
      riderSchedule.end_point,
      departureTime,
      distance,
      timeWindow,
    ],
  );

  for (const match of matches.rows) {
    const existing = await pool.query(
      `SELECT 1 FROM pod_members pm
       JOIN pods p ON p.id = pm.pod_id
       WHERE p.ride_id = $1 AND pm.user_id = $2`,
      [match.ride_id, riderId],
    );
    if (existing.rows.length) continue;

    let podId: string;
    const podCheck = await pool.query(`SELECT id FROM pods WHERE ride_id = $1 LIMIT 1`, [match.ride_id]);
    if (podCheck.rows.length) {
      podId = podCheck.rows[0].id;
    } else {
      const podResult = await pool.query(
        `INSERT INTO pods (ride_id, name, driver_id, status, max_capacity, matched_at)
         VALUES ($1, 'Commute Pod', $2, 'scheduled', $3, NOW()) RETURNING id`,
        [match.ride_id, match.driver_id, match.seats_available + 1],
      );
      podId = podResult.rows[0].id;
      await pool.query(
        `INSERT INTO pod_members (pod_id, user_id, role) VALUES ($1, $2, 'driver')
         ON CONFLICT DO NOTHING`,
        [podId, match.driver_id],
      );
    }

    await pool.query(
      `INSERT INTO pod_members (pod_id, user_id, role, pickup_point, pickup_label, member_status)
       VALUES ($1, $2, 'passenger', $3, $4, 'confirmed')
       ON CONFLICT DO NOTHING`,
      [podId, riderId, riderSchedule.start_point, riderSchedule.start_label],
    );
    await pool.query(
      `UPDATE rides SET seats_available = seats_available - 1 WHERE id = $1 AND seats_available > 0`,
      [match.ride_id],
    );
    await createNotification(
      riderId,
      'match',
      'New Pod Match!',
      'You have been matched to a commute pod.',
      { podId, rideId: match.ride_id },
    );
    await createNotification(
      match.driver_id,
      'match',
      'New Rider Joined',
      'A rider was matched to your commute pod.',
      { podId },
    );
    break;
  }
}

export async function searchMatches(userId: string) {
  const riderSchedule = await pool.query(
    `SELECT * FROM commute_schedules WHERE user_id = $1 AND role = 'rider' AND is_active = TRUE LIMIT 1`,
    [userId],
  );
  if (!riderSchedule.rows.length) return [];

  const rs = riderSchedule.rows[0];
  const result = await pool.query(
    `SELECT r.id AS ride_id, p.id AS pod_id, p.name, r.origin_label, r.destination_label,
       r.scheduled_at, r.seats_available, r.capacity,
       ST_Y(r.origin::geometry) AS origin_lat, ST_X(r.origin::geometry) AS origin_lng,
       ST_Y(r.destination::geometry) AS dest_lat, ST_X(r.destination::geometry) AS dest_lng,
       u.email AS driver_email, u.full_name AS driver_name,
       ROUND((500 - LEAST(ST_Distance(r.origin, $2), 500)) / 5) AS match_score
     FROM rides r
     JOIN commute_schedules cs ON cs.id = r.schedule_id
     LEFT JOIN pods p ON p.ride_id = r.id
     JOIN users u ON u.id = r.driver_id
     WHERE r.status = 'scheduled' AND r.seats_available > 0 AND r.driver_id != $1
       AND ST_DWithin(r.origin, $2, $5)
       AND ST_DWithin(r.destination, $3, $5)
       AND ABS(EXTRACT(EPOCH FROM (cs.departure_time - $4::time))) / 60 <= $6
     ORDER BY match_score DESC`,
    [userId, rs.start_point, rs.end_point, rs.departure_time, config.matchingDistanceMeters, config.matchingTimeWindowMinutes],
  );
  return result.rows;
}

export async function joinPod(userId: string, podId: string, pickupLat?: number, pickupLng?: number, pickupLabel?: string) {
  const pod = await pool.query(
    `SELECT p.*, r.seats_available, r.id AS ride_id, r.status AS ride_status
     FROM pods p JOIN rides r ON r.id = p.ride_id WHERE p.id = $1`,
    [podId],
  );
  if (!pod.rows.length) throw new Error('Pod not found');
  if (pod.rows[0].seats_available <= 0) throw new Error('Pod is full');
  if (pod.rows[0].ride_status !== 'scheduled') throw new Error('Pod is not joinable');

  if (pickupLat != null && pickupLng != null) {
    await pool.query(
      `INSERT INTO pod_members (pod_id, user_id, role, pickup_point, pickup_label)
       VALUES ($1, $2, 'passenger', ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5)
       ON CONFLICT (pod_id, user_id) DO NOTHING`,
      [podId, userId, pickupLat, pickupLng, pickupLabel ?? null],
    );
  } else {
    await pool.query(
      `INSERT INTO pod_members (pod_id, user_id, role, pickup_point, pickup_label)
       SELECT $1, $2, 'passenger', cs.start_point, COALESCE($3, cs.start_label)
       FROM commute_schedules cs WHERE cs.user_id = $2 AND cs.is_active = TRUE LIMIT 1
       ON CONFLICT (pod_id, user_id) DO NOTHING`,
      [podId, userId, pickupLabel ?? null],
    );
  }
  await pool.query(`UPDATE rides SET seats_available = seats_available - 1 WHERE id = $1 AND seats_available > 0`, [pod.rows[0].ride_id]);
  await notifyPodMembers(podId, userId, 'member_joined', 'New Member', 'A rider joined your pod.');
  return getPodDetail(userId, podId);
}

export async function leavePod(userId: string, podId: string) {
  const member = await pool.query(
    `SELECT pm.role, p.ride_id FROM pod_members pm
     JOIN pods p ON p.id = pm.pod_id WHERE pm.pod_id = $1 AND pm.user_id = $2`,
    [podId, userId],
  );
  if (!member.rows.length) throw new Error('Not a member');
  if (member.rows[0].role === 'driver') throw new Error('Driver cannot leave. Cancel the ride instead.');

  await pool.query(`DELETE FROM pod_members WHERE pod_id = $1 AND user_id = $2`, [podId, userId]);
  await pool.query(`UPDATE rides SET seats_available = seats_available + 1 WHERE id = $1`, [member.rows[0].ride_id]);
}

export async function getPodDetail(userId: string, podId: string) {
  const pod = await pool.query(
    `SELECT p.*, r.id AS ride_id, r.origin_label, r.destination_label, r.scheduled_at,
       r.status AS ride_status, r.seats_available, r.capacity, r.pickup_otp,
       ST_Y(r.origin::geometry) AS origin_lat, ST_X(r.origin::geometry) AS origin_lng,
       ST_Y(r.destination::geometry) AS dest_lat, ST_X(r.destination::geometry) AS dest_lng,
       pm.role AS my_role
     FROM pods p
     JOIN rides r ON r.id = p.ride_id
     JOIN pod_members pm ON pm.pod_id = p.id AND pm.user_id = $2
     WHERE p.id = $1`,
    [podId, userId],
  );
  if (!pod.rows.length) throw new Error('Pod not found');

  const members = await pool.query(
    `SELECT pm.role, pm.member_status,
       ST_Y(pm.pickup_point::geometry) AS pickup_lat, ST_X(pm.pickup_point::geometry) AS pickup_lng,
       pm.pickup_label, u.id, u.email, u.full_name
     FROM pod_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.pod_id = $1`,
    [podId],
  );
  return { ...pod.rows[0], members: members.rows };
}

export async function activatePod(userId: string, podId: string) {
  const member = await pool.query(
    `SELECT pm.role, p.ride_id FROM pod_members pm
     JOIN pods p ON p.id = pm.pod_id WHERE pm.pod_id = $1 AND pm.user_id = $2 AND pm.role = 'driver'`,
    [podId, userId],
  );
  if (!member.rows.length) throw new Error('Only driver can activate');

  const pickupOtp = generatePickupOtp();
  await pool.query(`UPDATE pods SET status = 'active' WHERE id = $1`, [podId]);
  await pool.query(
    `UPDATE rides SET status = 'active', pickup_otp = $2, updated_at = NOW() WHERE id = $1`,
    [member.rows[0].ride_id, pickupOtp],
  );
  await pool.query(
    `INSERT INTO ride_events (ride_id, user_id, event_type) VALUES ($1, $2, 'activated')`,
    [member.rows[0].ride_id, userId],
  );
  await notifyPodMembers(podId, null, 'ride_active', 'Ride Started', 'Your driver has started the commute.');
  return { podId, pickupOtp };
}

export async function confirmPickup(userId: string, rideId: string, otp: string) {
  const ride = await pool.query(
    `SELECT pickup_otp, status FROM rides WHERE id = $1`,
    [rideId],
  );
  if (!ride.rows.length) throw new Error('Ride not found');
  if (ride.rows[0].pickup_otp !== otp) throw new Error('Invalid pickup OTP');

  await pool.query(
    `UPDATE pod_members SET member_status = 'picked_up'
     WHERE pod_id IN (SELECT id FROM pods WHERE ride_id = $1) AND user_id = $2`,
    [rideId, userId],
  );
  await pool.query(
    `UPDATE rides SET status = 'picked_up', updated_at = NOW()
     WHERE id = $1 AND status = 'active'`,
    [rideId],
  );
  await pool.query(
    `INSERT INTO ride_events (ride_id, user_id, event_type) VALUES ($1, $2, 'picked_up')`,
    [rideId, userId],
  );
  const pod = await pool.query(`SELECT id FROM pods WHERE ride_id = $1 LIMIT 1`, [rideId]);
  if (pod.rows[0]) {
    await notifyPodMembers(pod.rows[0].id, userId, 'picked_up', 'Rider Picked Up', 'A rider confirmed pickup.');
  }
  return { message: 'Pickup confirmed' };
}

export async function completeRide(userId: string, rideId: string) {
  const driver = await pool.query(
    `SELECT r.driver_id FROM rides r WHERE r.id = $1 AND r.driver_id = $2`,
    [rideId, userId],
  );
  if (!driver.rows.length) throw new Error('Only driver can complete ride');

  await pool.query(
    `UPDATE rides SET status = 'completed', updated_at = NOW() WHERE id = $1`,
    [rideId],
  );
  await pool.query(
    `UPDATE pods SET status = 'completed' WHERE ride_id = $1`,
    [rideId],
  );
  await pool.query(
    `INSERT INTO ride_events (ride_id, user_id, event_type) VALUES ($1, $2, 'completed')`,
    [rideId, userId],
  );
  const pod = await pool.query(`SELECT id FROM pods WHERE ride_id = $1 LIMIT 1`, [rideId]);
  if (pod.rows[0]) {
    await notifyPodMembers(pod.rows[0].id, null, 'completed', 'Ride Completed', 'Your commute has been completed.');
  }
  return { message: 'Ride completed' };
}

export async function getRideHistory(userId: string) {
  const result = await pool.query(
    `SELECT r.id, r.origin_label, r.destination_label, r.scheduled_at, r.status,
       p.id AS pod_id, p.name AS pod_name, pm.role
     FROM rides r
     JOIN pods p ON p.ride_id = r.id
     JOIN pod_members pm ON pm.pod_id = p.id AND pm.user_id = $1
     WHERE r.status IN ('completed', 'picked_up', 'active')
     ORDER BY r.scheduled_at DESC LIMIT 50`,
    [userId],
  );
  return result.rows;
}

export { config as matchingConfig };
