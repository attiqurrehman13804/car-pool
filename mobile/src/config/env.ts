import {
  API_BASE_URL,
  SOCKET_URL,
  ALLOWED_EMAIL_DOMAINS,
  GOOGLE_MAPS_API_KEY,
} from '@env';

export const env = {
  apiBaseUrl: API_BASE_URL || 'http://192.168.100.71:3000/',
  socketUrl: SOCKET_URL || 'http://192.168.100.71:3000/',
  allowedEmailDomains: (ALLOWED_EMAIL_DOMAINS || 'gmail.com')
    .split(',')
    .map(d => d.trim().toLowerCase()),
  googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
};
