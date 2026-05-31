-- Pool Bus full schema extension

CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE NOT NULL,
  campus_center GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_failed_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_role VARCHAR(20) DEFAULT 'rider';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);

CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  color VARCHAR(50),
  license_plate VARCHAR(20),
  seat_capacity INT NOT NULL DEFAULT 4,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  relationship VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commute_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'rider',
  start_point GEOGRAPHY(POINT, 4326) NOT NULL,
  end_point GEOGRAPHY(POINT, 4326) NOT NULL,
  start_label VARCHAR(255),
  end_label VARCHAR(255),
  days_of_week INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  departure_time TIME NOT NULL,
  return_time TIME,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rides ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES commute_schedules(id) ON DELETE SET NULL;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS route_path GEOGRAPHY(LINESTRING, 4326);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 4;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS seats_available INT DEFAULT 4;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'to_campus';
ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_otp VARCHAR(6);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE pods ADD COLUMN IF NOT EXISTS max_capacity INT DEFAULT 4;
ALTER TABLE pods ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

ALTER TABLE pod_members ADD COLUMN IF NOT EXISTS pickup_point GEOGRAPHY(POINT, 4326);
ALTER TABLE pod_members ADD COLUMN IF NOT EXISTS pickup_label VARCHAR(255);
ALTER TABLE pod_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE pod_members ADD COLUMN IF NOT EXISTS member_status VARCHAR(20) DEFAULT 'confirmed';

ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS ride_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON commute_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON commute_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_user ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_pod ON messages(pod_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_events_ride ON ride_events(ride_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_ride ON sos_alerts(ride_id);

CREATE INDEX IF NOT EXISTS idx_schedules_start_gist ON commute_schedules USING GIST (start_point);
CREATE INDEX IF NOT EXISTS idx_schedules_end_gist ON commute_schedules USING GIST (end_point);
CREATE INDEX IF NOT EXISTS idx_rides_origin_gist ON rides USING GIST (origin);
CREATE INDEX IF NOT EXISTS idx_rides_destination_gist ON rides USING GIST (destination);

INSERT INTO institutions (name, domain, campus_center)
SELECT 'University Campus', 'university.edu',
  ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography
WHERE NOT EXISTS (SELECT 1 FROM institutions WHERE domain = 'university.edu');
