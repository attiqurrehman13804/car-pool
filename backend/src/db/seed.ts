import bcrypt from 'bcryptjs';
import { pool } from './pool';

async function seed() {
  console.log('Seeding database...');

  const driverEmail = 'driver@university.edu';
  const passengerEmail = 'passenger@university.edu';
  const passwordHash = await bcrypt.hash('Password123', 12);
  const pinHash = await bcrypt.hash('123456', 12);

  const driverResult = await pool.query(
    `INSERT INTO users (email, password_hash, pin_hash, is_email_verified, security_setup_complete)
     VALUES ($1, $2, $3, TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       pin_hash = EXCLUDED.pin_hash,
       is_email_verified = TRUE,
       security_setup_complete = TRUE
     RETURNING id`,
    [driverEmail, passwordHash, pinHash],
  );
  const driverId = driverResult.rows[0].id;

  const passengerResult = await pool.query(
    `INSERT INTO users (email, password_hash, pin_hash, is_email_verified, security_setup_complete)
     VALUES ($1, $2, $3, TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       pin_hash = EXCLUDED.pin_hash,
       is_email_verified = TRUE,
       security_setup_complete = TRUE
     RETURNING id`,
    [passengerEmail, passwordHash, pinHash],
  );
  const passengerId = passengerResult.rows[0].id;

  const rideResult = await pool.query(
    `INSERT INTO rides (driver_id, origin, destination, origin_label, destination_label, scheduled_at, status)
     VALUES (
       $1,
       ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography,
       ST_SetSRID(ST_MakePoint(-122.4064, 37.7858), 4326)::geography,
       'Campus Gate',
       'Downtown Hub',
       NOW() + INTERVAL '2 hours',
       'scheduled'
     )
     RETURNING id`,
    [driverId],
  );
  const rideId = rideResult.rows[0].id;

  const podResult = await pool.query(
    `INSERT INTO pods (ride_id, name, driver_id, status)
     VALUES ($1, 'Morning Commute Pod', $2, 'scheduled')
     RETURNING id`,
    [rideId, driverId],
  );
  const podId = podResult.rows[0].id;

  await pool.query(
    `INSERT INTO pod_members (pod_id, user_id, role)
     VALUES ($1, $2, 'driver'), ($1, $3, 'passenger')
     ON CONFLICT DO NOTHING`,
    [podId, driverId, passengerId],
  );

  await pool.query(
    `INSERT INTO geofences (name, boundary, is_active)
     SELECT 'Campus Perimeter', ST_SetSRID(ST_GeomFromText('POLYGON((
         -122.425 37.770,
         -122.415 37.770,
         -122.415 37.780,
         -122.425 37.780,
         -122.425 37.770
       ))'), 4326)::geography, TRUE
     WHERE NOT EXISTS (SELECT 1 FROM geofences WHERE name = 'Campus Perimeter')`,
  );

  console.log('Seed data created:');
  console.log(`  Driver: ${driverEmail} / Password123 / PIN 123456`);
  console.log(`  Passenger: ${passengerEmail} / Password123 / PIN 123456`);
  console.log(`  Pod ID: ${podId}`);

  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
