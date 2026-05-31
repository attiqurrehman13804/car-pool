import axios from 'axios';
import { env } from '../config/env';

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.error ?? error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

// Auth
export async function requestOtp(email: string) {
  const { data } = await api.post('/auth/request-otp', { email });
  return data as { message: string; devOtp?: string };
}

export async function verifyOtp(email: string, code: string) {
  const { data } = await api.post('/auth/verify-otp', { email, code });
  return data as { verifiedEmailToken: string };
}

export async function setupSecurity(token: string, password: string, pin: string) {
  const { data } = await api.post('/auth/setup-security', { password, pin }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  return data as { partialToken: string };
}

export async function verifyPin(partialToken: string, pin: string) {
  const { data } = await api.post('/auth/verify-pin', { pin }, {
    headers: { 'X-Partial-Token': partialToken },
  });
  return data as { accessToken: string; user: { id: string; email: string; isAdmin: boolean } };
}

export async function forgotPassword(email: string) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data as { message: string; devOtp?: string };
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
  const { data } = await api.post('/auth/reset-password', { email, otp, newPassword });
  return data;
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const { data } = await api.put('/auth/change-password', { oldPassword, newPassword });
  return data;
}

export async function changePin(otp: string, newPin: string) {
  const { data } = await api.put('/auth/change-pin', { otp, newPin });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

// Profile
export async function fetchProfile() {
  const { data } = await api.get('/profile');
  return data.profile;
}

export async function updateProfile(body: Record<string, string>) {
  const { data } = await api.put('/profile', body);
  return data.profile;
}

export async function uploadAvatar(base64: string, mimeType: string) {
  const { data } = await api.post('/profile/avatar', { base64, mimeType });
  return data;
}

export async function fetchEmergencyContacts() {
  const { data } = await api.get('/profile/emergency-contacts');
  return data.contacts;
}

export async function addEmergencyContact(body: { name: string; phone: string; relationship?: string; isPrimary?: boolean }) {
  const { data } = await api.post('/profile/emergency-contacts', body);
  return data.contact;
}

export async function deleteEmergencyContact(id: string) {
  await api.delete(`/profile/emergency-contacts/${id}`);
}

// Vehicles
export async function fetchVehicles() {
  const { data } = await api.get('/vehicles');
  return data.vehicles;
}

export async function createVehicle(body: Record<string, unknown>) {
  const { data } = await api.post('/vehicles', body);
  return data.vehicle;
}

export async function updateVehicle(id: string, body: Record<string, unknown>) {
  const { data } = await api.put(`/vehicles/${id}`, body);
  return data.vehicle;
}

export async function deleteVehicle(id: string) {
  await api.delete(`/vehicles/${id}`);
}

// Schedules
export async function fetchSchedules() {
  const { data } = await api.get('/schedules');
  return data.schedules;
}

export async function createSchedule(body: Record<string, unknown>) {
  const { data } = await api.post('/schedules', body);
  return data.schedule;
}

export async function updateSchedule(id: string, body: Record<string, unknown>) {
  const { data } = await api.put(`/schedules/${id}`, body);
  return data.schedules;
}

export async function deleteSchedule(id: string) {
  await api.delete(`/schedules/${id}`);
}

export async function searchMatches() {
  const { data } = await api.get('/schedules/matches');
  return data.matches;
}

// Pods
export async function fetchUpcomingPods() {
  const { data } = await api.get('/pods/upcoming');
  return data.pods;
}

export async function searchPods() {
  const { data } = await api.get('/pods/search');
  return data.matches;
}

export async function fetchPodDetail(podId: string) {
  const { data } = await api.get(`/pods/${podId}`);
  return data.pod;
}

export async function joinPod(podId: string, pickup?: { lat: number; lng: number; label?: string }) {
  const { data } = await api.post(`/pods/${podId}/join`, {
    pickupLat: pickup?.lat,
    pickupLng: pickup?.lng,
    pickupLabel: pickup?.label,
  });
  return data.pod;
}

export async function leavePod(podId: string) {
  await api.post(`/pods/${podId}/leave`);
}

export async function activatePod(podId: string) {
  const { data } = await api.patch(`/pods/${podId}/activate`);
  return data;
}

// Rides
export async function sendSos(rideId: string, lat?: number, lng?: number) {
  const { data } = await api.post(`/rides/${rideId}/sos`, { lat, lng });
  return data;
}

export async function confirmPickup(rideId: string, otp: string) {
  const { data } = await api.post(`/rides/${rideId}/confirm-pickup`, { otp });
  return data;
}

export async function completeRide(rideId: string) {
  const { data } = await api.patch(`/rides/${rideId}/complete`);
  return data;
}

export async function fetchRideHistory() {
  const { data } = await api.get('/rides/history');
  return data.rides;
}

// Geocode
export async function searchAddress(query: string) {
  const { data } = await api.get('/geocode/search', { params: { q: query } });
  return data.results as Array<{ lat: number; lng: number; label: string }>;
}

export async function reverseGeocode(lat: number, lng: number) {
  const { data } = await api.get('/geocode/reverse', { params: { lat, lng } });
  return data as { lat: number; lng: number; label: string };
}

// Notifications
export async function fetchNotifications() {
  const { data } = await api.get('/notifications');
  return data.notifications;
}

export async function markNotificationRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

// Messages
export async function fetchMessages(podId: string) {
  const { data } = await api.get(`/messages/${podId}`);
  return data.messages;
}

// Admin
export async function fetchAdminSummary() {
  const { data } = await api.get('/admin/analytics/summary');
  return data;
}

export async function fetchAdminSos() {
  const { data } = await api.get('/admin/sos');
  return data.alerts;
}

export async function fetchAdminHeatmap() {
  const { data } = await api.get('/admin/analytics/heatmap');
  return data.points;
}

export async function fetchAdminUsers() {
  const { data } = await api.get('/admin/users');
  return data.users;
}

export async function resolveSos(id: string) {
  await api.patch(`/admin/sos/${id}/resolve`);
}

export async function fetchGeofences() {
  const { data } = await api.get('/geofences');
  return data.geofences;
}
