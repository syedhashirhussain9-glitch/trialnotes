/** Pure geo / formatting helpers. No React Native imports so they are unit-testable. */

export interface LatLng {
  latitude: number;
  longitude: number;
  /** epoch ms */
  timestamp: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points in metres (haversine formula). */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function totalDistance(route: LatLng[]): number {
  let sum = 0;
  for (let i = 1; i < route.length; i++) sum += haversine(route[i - 1], route[i]);
  return sum;
}

/** Walking speed above ~43 km/h is a GPS jump, not a walker. */
export const MAX_WALK_SPEED_MS = 12;
export const MAX_ACCURACY_M = 50;

/**
 * Decide whether a new GPS fix should be accepted.
 * Rejects poor-accuracy fixes and physically impossible jumps.
 */
export function isPlausibleFix(
  prev: LatLng | undefined,
  next: LatLng,
  accuracy: number | null | undefined,
): boolean {
  if (accuracy != null && accuracy > MAX_ACCURACY_M) return false;
  if (!prev) return true;
  const seconds = Math.max((next.timestamp - prev.timestamp) / 1000, 0.001);
  return haversine(prev, next) / seconds <= MAX_WALK_SPEED_MS;
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(2)} km`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Spoken-friendly duration for screen readers, e.g. "1 hour 5 minutes 3 seconds". */
export function spokenDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
  if (m) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
  if (sec || parts.length === 0) parts.push(`${sec} ${sec === 1 ? 'second' : 'seconds'}`);
  return parts.join(' ');
}

/** Pace in min/km as "m:ss", or "–" when there is not enough data. */
export function formatPace(metres: number, seconds: number): string {
  if (metres < 50 || seconds <= 0) return '–';
  const secPerKm = seconds / (metres / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

export interface SvgPoint {
  x: number;
  y: number;
}

/**
 * Project a route into an SVG viewport, preserving aspect ratio and centring it.
 * Longitude is scaled by cos(latitude) so shapes are not stretched.
 */
export function routeToSvgPoints(
  route: Pick<LatLng, 'latitude' | 'longitude'>[],
  width: number,
  height: number,
  padding = 16,
): SvgPoint[] {
  if (route.length === 0) return [];
  const lats = route.map((p) => p.latitude);
  const lons = route.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const midLat = (minLat + maxLat) / 2;
  const lonScale = Math.cos(toRad(midLat));
  const spanX = Math.max((maxLon - minLon) * lonScale, 1e-9);
  const spanY = Math.max(maxLat - minLat, 1e-9);
  const availW = Math.max(width - padding * 2, 1);
  const availH = Math.max(height - padding * 2, 1);
  const scale = Math.min(availW / spanX, availH / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;
  return route.map((p) => ({
    x: offsetX + (p.longitude - minLon) * lonScale * scale,
    y: height - (offsetY + (p.latitude - minLat) * scale),
  }));
}

export const DUNDEE = { latitude: 56.462, longitude: -2.9707 };

/**
 * Deterministic simulated walk (a loop around an origin) used for demos and emulator testing
 * when real GPS is unavailable. step=0 is the origin; each step advances ~6 m.
 */
export function simulatedFix(step: number, origin = DUNDEE, startTime = 0): LatLng {
  const angle = (step * 6) / 150; // ~150 m radius loop, ~6 m per step
  const dLat = (150 / 111_320) * (Math.sin(angle) );
  const dLon = (150 / (111_320 * Math.cos(toRad(origin.latitude)))) * (1 - Math.cos(angle));
  return {
    latitude: origin.latitude + dLat,
    longitude: origin.longitude + dLon,
    timestamp: startTime + step * 1000,
  };
}
