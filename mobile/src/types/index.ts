export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  profile_photo_url?: string | null;
  is_admin?: boolean;
  default_role?: string;
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
  driver_name?: string;
  seats_available?: number;
  capacity?: number;
  match_score?: number;
  pickup_otp?: string;
  members?: PodMember[];
  my_role?: 'driver' | 'passenger';
}

export interface PodMember {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  member_status?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_label?: string;
}

export interface Schedule {
  id: string;
  role: 'driver' | 'rider';
  start_label: string;
  end_label: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  days_of_week: number[];
  departure_time: string;
  return_time?: string;
  vehicle_id?: string;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  color?: string;
  license_plate?: string;
  seat_capacity: number;
  photo_url?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
  read_at?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  podId: string;
  senderId: string;
  senderEmail?: string;
  senderName?: string;
  content: string;
  createdAt: string;
}

export interface DriverLocation {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: string;
}

export type AuthStackParamList = {
  Onboarding: undefined;
  Otp: { email: string; devOtp?: string };
  SecuritySetup: { verifiedEmailToken: string; email: string };
  Login: undefined;
  PinLogin: { partialToken: string; email: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string; devOtp?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Activity: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  LiveMap: { pod: Pod };
  PodDetail: { podId: string };
  Schedule: { scheduleId?: string } | undefined;
  Vehicles: undefined;
  Settings: undefined;
  ChangePassword: undefined;
  EmergencyContacts: undefined;
  Admin: undefined;
  Chat: { podId: string; podName: string };
  Notifications: undefined;
};

export type RootStackParamList = AuthStackParamList & MainStackParamList;
