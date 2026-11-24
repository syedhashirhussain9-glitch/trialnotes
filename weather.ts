export interface Weather {
  temperatureC: number;
  windKmh: number;
  code: number;
  description: string;
  fetchedAt: number;
}

/** WMO weather interpretation codes used by Open-Meteo. */
export function describeWeatherCode(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1 || code === 2) return 'Mostly clear';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
}

/** Defensive parser: the network is untrusted, so every field is checked. */
export function parseWeather(json: unknown, now = Date.now()): Weather | null {
  const cur = (json as { current?: Record<string, unknown> } | null)?.current;
  if (!cur || typeof cur !== 'object') return null;
  const t = cur.temperature_2m;
  const w = cur.wind_speed_10m;
  const c = cur.weather_code;
  if (typeof t !== 'number' || typeof w !== 'number' || typeof c !== 'number') return null;
  if (!Number.isFinite(t) || !Number.isFinite(w)) return null;
  return {
    temperatureC: Math.round(t * 10) / 10,
    windKmh: Math.round(w),
    code: c,
    description: describeWeatherCode(c),
    fetchedAt: now,
  };
}

/** Data minimisation: round to 2 d.p. (~1 km) before sending coordinates to a third party. */
export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildWeatherUrl(lat: number, lon: number): string {
  const q = new URLSearchParams({
    latitude: String(roundCoord(lat)),
    longitude: String(roundCoord(lon)),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    wind_speed_unit: 'kmh',
  });
  return `https://api.open-meteo.com/v1/forecast?${q.toString()}`;
}

const cache = new Map<string, Weather>();
const CACHE_MS = 10 * 60 * 1000;

/** Fetch current weather. Returns null (never throws) on timeout, offline or bad data. */
export async function fetchWeather(
  lat: number,
  lon: number,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 8000,
): Promise<Weather | null> {
  const key = `${roundCoord(lat)},${roundCoord(lon)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_MS) return hit;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(buildWeatherUrl(lat, lon), { signal: controller.signal });
    if (!res.ok) return null;
    const weather = parseWeather(await res.json());
    if (weather) cache.set(key, weather);
    return weather;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function clearWeatherCache() {
  cache.clear();
}
