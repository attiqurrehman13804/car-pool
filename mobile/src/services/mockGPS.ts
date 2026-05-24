export interface GPSCoords {
  lat: number;
  lng: number;
  heading: number;
}

type GPSCallback = (coords: GPSCoords) => void;

const MOCK_ROUTE: Array<{ lat: number; lng: number }> = [
  { lat: 37.7749, lng: -122.4194 },
  { lat: 37.7755, lng: -122.4188 },
  { lat: 37.7762, lng: -122.4179 },
  { lat: 37.7771, lng: -122.4168 },
  { lat: 37.7780, lng: -122.4155 },
  { lat: 37.7790, lng: -122.4142 },
  { lat: 37.7800, lng: -122.4128 },
  { lat: 37.7812, lng: -122.4115 },
  { lat: 37.7825, lng: -122.4100 },
  { lat: 37.7838, lng: -122.4085 },
  { lat: 37.7850, lng: -122.4070 },
  { lat: 37.7858, lng: -122.4064 },
];

/**
 * Stub for testing driver movement without a physical GPS device.
 * Simulates movement along a predefined route.
 */
export function startMockGPS(onUpdate: GPSCallback, intervalMs = 2000): () => void {
  let index = 0;

  const intervalId = setInterval(() => {
    const point = MOCK_ROUTE[index % MOCK_ROUTE.length];
    const nextPoint = MOCK_ROUTE[(index + 1) % MOCK_ROUTE.length];
    const heading = calculateHeading(point, nextPoint);
    onUpdate({ lat: point.lat, lng: point.lng, heading });
    index += 1;
  }, intervalMs);

  return () => clearInterval(intervalId);
}

function calculateHeading(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
