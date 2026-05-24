export interface User {
  id: string;
  email: string;
}

export interface Pod {
  id: string;
  name: string;
  status: string;
  ride_id: string;
  origin_label: string | null;
  destination_label: string | null;
  scheduled_at: string;
  ride_status: string;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  role: 'driver' | 'passenger';
  driver_email?: string;
}

export interface DriverLocation {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: string;
}

export type RootStackParamList = {
  Onboarding: undefined;
  Otp: { email: string; devOtp?: string };
  SecuritySetup: { verifiedEmailToken: string; email: string };
  Login: undefined;
  PinLogin: { partialToken: string; email: string };
  Dashboard: undefined;
  LiveMap: { pod: Pod };
};
