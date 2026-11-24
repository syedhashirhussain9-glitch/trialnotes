import {
  DUNDEE, LatLng, formatDistance, formatDuration, formatPace, haversine, isPlausibleFix,
  routeToSvgPoints, simulatedFix, spokenDuration, totalDistance,
} from '../src/lib/geo';

const p = (latitude: number, longitude: number, timestamp = 0): LatLng => ({ latitude, longitude, timestamp });

describe('haversine / totalDistance', () => {
  it('is 0 for identical points', () => expect(haversine(p(56.46, -2.97), p(56.46, -2.97))).toBe(0));
  it('matches a known distance (Dundee -> Edinburgh ≈ 70 km)', () => {
    const d = haversine(p(56.462, -2.9707), p(55.9533, -3.1883));
    expect(d).toBeGreaterThan(55_000);
    expect(d).toBeLessThan(65_000);
  });
  it('1 degree of latitude ≈ 111 km', () => {
    expect(haversine(p(0, 0), p(1, 0))).toBeCloseTo(111_195, -2);
  });
  it('sums segments and handles empty / single point routes', () => {
    expect(totalDistance([])).toBe(0);
    expect(totalDistance([p(1, 1)])).toBe(0);
    const a = p(56, -3), b = p(56.001, -3), c = p(56.002, -3);
    expect(totalDistance([a, b, c])).toBeCloseTo(haversine(a, b) + haversine(b, c), 6);
  });
});

describe('isPlausibleFix (GPS noise filter)', () => {
  it('accepts the first fix', () => expect(isPlausibleFix(undefined, p(1, 1), 10)).toBe(true));
  it('rejects poor accuracy', () => expect(isPlausibleFix(undefined, p(1, 1), 80)).toBe(false));
  it('accepts normal walking speed', () => {
    expect(isPlausibleFix(p(56, -3, 0), p(56.00005, -3, 5000), 10)).toBe(true); // ~5.5 m in 5 s
  });
  it('rejects a teleport jump', () => {
    expect(isPlausibleFix(p(56, -3, 0), p(56.01, -3, 1000), 10)).toBe(false); // ~1.1 km in 1 s
  });
  it('does not divide by zero with identical timestamps', () => {
    expect(() => isPlausibleFix(p(56, -3, 1000), p(56, -3, 1000), 5)).not.toThrow();
  });
});

describe('formatting', () => {
  it('formatDistance', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(842.4)).toBe('842 m');
    expect(formatDistance(1000)).toBe('1.00 km');
    expect(formatDistance(5432)).toBe('5.43 km');
  });
  it('formatDuration', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(-5)).toBe('00:00');
  });
  it('spokenDuration is screen-reader friendly', () => {
    expect(spokenDuration(0)).toBe('0 seconds');
    expect(spokenDuration(3723)).toBe('1 hour 2 minutes 3 seconds');
    expect(spokenDuration(61)).toBe('1 minute 1 second');
  });
  it('formatPace', () => {
    expect(formatPace(1000, 360)).toBe('6:00');
    expect(formatPace(10, 100)).toBe('–'); // too short to be meaningful
    expect(formatPace(5000, 0)).toBe('–');
    expect(formatPace(1000, 359.7)).toBe('6:00'); // rounds 59.7 s up without printing 5:60
  });
});

describe('routeToSvgPoints', () => {
  it('returns [] for no route', () => expect(routeToSvgPoints([], 300, 200)).toEqual([]));
  it('keeps every point inside the viewport', () => {
    const route = Array.from({ length: 50 }, (_, i) => simulatedFix(i));
    const pts = routeToSvgPoints(route, 300, 200, 16);
    for (const q of pts) {
      expect(q.x).toBeGreaterThanOrEqual(0);
      expect(q.x).toBeLessThanOrEqual(300);
      expect(q.y).toBeGreaterThanOrEqual(0);
      expect(q.y).toBeLessThanOrEqual(200);
    }
  });
  it('north is up (higher latitude => smaller y)', () => {
    const [south, north] = routeToSvgPoints([p(56, -3), p(56.01, -3)], 300, 300);
    expect(north.y).toBeLessThan(south.y);
  });
  it('handles a single point without NaN', () => {
    const [pt] = routeToSvgPoints([p(56, -3)], 300, 200);
    expect(Number.isFinite(pt.x) && Number.isFinite(pt.y)).toBe(true);
  });
});

describe('simulatedFix', () => {
  it('starts at the origin and moves ~6 m per step at walking speed', () => {
    const a = simulatedFix(0), b = simulatedFix(1);
    expect(a.latitude).toBeCloseTo(DUNDEE.latitude, 6);
    const d = haversine(a, b);
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(9);
    expect(isPlausibleFix(a, b, 5)).toBe(true); // passes our own noise filter
  });
});
