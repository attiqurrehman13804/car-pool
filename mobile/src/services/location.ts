import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';

export interface Position {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

export function watchPosition(
  onUpdate: (pos: Position) => void,
  onError?: (err: unknown) => void,
): () => void {
  const watchId = Geolocation.watchPosition(
    position => {
      onUpdate({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: position.coords.heading ?? undefined,
        speed: position.coords.speed ?? undefined,
      });
    },
    err => onError?.(err),
    { enableHighAccuracy: true, distanceFilter: 5, interval: 5000, fastestInterval: 3000 },
  );
  return () => Geolocation.clearWatch(watchId);
}

export function getCurrentPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: position.coords.heading ?? undefined,
        speed: position.coords.speed ?? undefined,
      }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
}
