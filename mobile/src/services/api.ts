import axios from 'axios';
import { env } from '../config/env';

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export async function requestOtp(email: string) {
  console.log('requestOtp', email);
  const { data } = await api.post('/auth/request-otp', { email });
  console.log('requestOtp', data);
  return data as { message: string; devOtp?: string };
}

export async function verifyOtp(email: string, code: string) {
  const { data } = await api.post('/auth/verify-otp', { email, code });
  return data as { verifiedEmailToken: string };
}

export async function setupSecurity(
  verifiedEmailToken: string,
  password: string,
  pin: string,
) {
  const { data } = await api.post(
    '/auth/setup-security',
    { password, pin },
    { headers: { Authorization: `Bearer ${verifiedEmailToken}` } },
  );
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  return data as { partialToken: string };
}

export async function verifyPin(partialToken: string, pin: string) {
  const { data } = await api.post(
    '/auth/verify-pin',
    { pin },
    { headers: { 'X-Partial-Token': partialToken } },
  );
  return data as { accessToken: string; user: { id: string; email: string } };
}

export async function fetchUpcomingPods() {
  const { data } = await api.get('/pods/upcoming');
  return data.pods;
}

export async function activatePod(podId: string) {
  const { data } = await api.patch(`/pods/${podId}/activate`);
  return data;
}

export async function sendSos(rideId: string) {
  const { data } = await api.post(`/rides/${rideId}/sos`);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data.user as { id: string; email: string };
}

export async function fetchGeofences() {
  const { data } = await api.get('/geofences');
  return data.geofences;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong';
}
