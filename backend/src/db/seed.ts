import bcrypt from 'bcryptjs';
import { pool } from './pool';

async function seed() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Password123!', 12);
  const pinHash = await bcrypt.hash('123456', 12);

  const users = [
    { email: 'driver@university.edu', role: 'driver', name: 'Mark Driver' },
    { email: 'passenger@university.edu', role: 'rider', name: 'Sarah Rider' },
    { email: 'admin@university.edu', role: 'both', name: 'Admin User', isAdmin: true },
  ];

  const ids: Record<string, string> = {};

  for (const u of users) {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, pin_hash, is_email_verified, security_setup_complete, full_name, default_role, is_admin)
       VALUES ($1, $2, $3, TRUE, TRUE, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash, pin_hash = EXCLUDED.pin_hash,
         full_name = EXCLUDED.full_name, is_admin = EXCLUDED.is_admin
       RETURNING id`,
      [u.email, passwordHash, pinHash, u.name, u.role, u.isAdmin ?? false],
    );
    ids[u.email] = result.rows[0].id;
  }

  const driverId = ids['driver@university.edu'];
  const passengerId = ids['passenger@university.edu'];

  const vehicleResult = await pool.query(
    `INSERT INTO vehicles (user_id, make, model, color, license_plate, seat_capacity)
     VALUES ($1, 'Toyota', 'Corolla', 'Silver', 'ABC-1234', 4)
     ON CONFLICT DO NOTHING RETURNING id`,
    [driverId],
  );
  const vehicleId = vehicleResult.rows[0]?.id;

  await pool.query(
    `INSERT INTO commute_schedules (user_id, role, start_point, end_point, start_label, end_label, days_of_week, departure_time, vehicle_id)
     VALUES ($1, 'driver',
       ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography,
       ST_SetSRID(ST_MakePoint(-122.4064, 37.7858), 4326)::geography,
       'Campus Gate', 'Downtown Hub', '{1,2,3,4,5}', '08:00:00', $2)
     ON CONFLICT DO NOTHING`,
    [driverId, vehicleId],
  );

  await pool.query(
    `INSERT INTO commute_schedules (user_id, role, start_point, end_point, start_label, end_label, days_of_week, departure_time)
     VALUES ($1, 'rider',
       ST_SetSRID(ST_MakePoint(-122.4180, 37.7755), 4326)::geography,
       ST_SetSRID(ST_MakePoint(-122.4064, 37.7858), 4326)::geography,
       'Near Campus', 'Downtown Hub', '{1,2,3,4,5}', '08:05:00')
     ON CONFLICT DO NOTHING`,
    [passengerId],
  );

  const rideResult = await pool.query(
    `INSERT INTO rides (driver_id, origin, destination, origin_label, destination_label, scheduled_at, status, capacity, seats_available)
     VALUES ($1,
       ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography,
       ST_SetSRID(ST_MakePoint(-122.4064, 37.7858), 4326)::geography,
       'Campus Gate', 'Downtown Hub', NOW() + INTERVAL '2 hours', 'scheduled', 4, 3)
     RETURNING id`,
    [driverId],
  );
  const rideId = rideResult.rows[0].id;

  const podResult = await pool.query(
    `INSERT INTO pods (ride_id, name, driver_id, status, max_capacity, matched_at)
     VALUES ($1, 'Morning Commute Pod', $2, 'scheduled', 4, NOW()) RETURNING id`,
    [rideId, driverId],
  );
  const podId = podResult.rows[0].id;

  await pool.query(
    `INSERT INTO pod_members (pod_id, user_id, role, pickup_point, pickup_label)
     VALUES ($1, $2, 'driver', NULL, NULL),
            ($1, $3, 'passenger',
             ST_SetSRID(ST_MakePoint(-122.4180, 37.7755), 4326)::geography, 'Near Campus')
     ON CONFLICT DO NOTHING`,
    [podId, driverId, passengerId],
  );

  await pool.query(
    `INSERT INTO geofences (name, boundary, is_active)
     SELECT 'Campus Perimeter', ST_SetSRID(ST_GeomFromText('POLYGON((
         -122.425 37.770, -122.415 37.770, -122.415 37.780, -122.425 37.780, -122.425 37.770
       ))'), 4326)::geography, TRUE
     WHERE NOT EXISTS (SELECT 1 FROM geofences WHERE name = 'Campus Perimeter')`,
  );

  console.log('Seed complete:');
  console.log('  driver@university.edu / Password123! / PIN 123456');
  console.log('  passenger@university.edu / Password123! / PIN 123456');
  console.log('  admin@university.edu / Password123! / PIN 123456 (admin)');
  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
