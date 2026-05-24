export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  pin_hash: string | null;
  is_email_verified: boolean;
  security_setup_complete: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Ride {
  id: string;
  driver_id: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  origin_label: string | null;
  destination_label: string | null;
  scheduled_at: Date;
  status: string;
  created_at: Date;
}

export interface Pod {
  id: string;
  ride_id: string;
  name: string;
  driver_id: string;
  status: string;
  created_at: Date;
}

export interface Geofence {
  id: string;
  name: string;
  is_active: boolean;
  created_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'full' | 'partial' | 'verified_email';
}

export interface GpsUpdate {
  podId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp?: string;
}
