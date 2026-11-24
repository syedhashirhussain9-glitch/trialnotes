import { buildWeatherUrl, clearWeatherCache, describeWeatherCode, fetchWeather, parseWeather, roundCoord } from '../src/lib/weather';

const good = { current: { temperature_2m: 11.26, wind_speed_10m: 18.4, weather_code: 61 } };
const okResponse = (body: unknown) => ({ ok: true, json: async () => body }) as unknown as Response;

beforeEach(() => clearWeatherCache());

describe('parseWeather', () => {
  it('parses a valid payload', () => {
    expect(parseWeather(good, 123)).toEqual({ temperatureC: 11.3, windKmh: 18, code: 61, description: 'Rain', fetchedAt: 123 });
  });
  it.each([null, undefined, {}, { current: null }, { current: { temperature_2m: 'x', wind_speed_10m: 1, weather_code: 1 } },
    { current: { temperature_2m: NaN, wind_speed_10m: 1, weather_code: 1 } }])('returns null for bad data %j', (j) =>
    expect(parseWeather(j)).toBeNull());
});
describe('helpers', () => {
  it('describes codes', () => {
    expect(describeWeatherCode(0)).toBe('Clear sky');
    expect(describeWeatherCode(73)).toBe('Snow');
    expect(describeWeatherCode(96)).toBe('Thunderstorm');
    expect(describeWeatherCode(999)).toBe('Thunderstorm');
    expect(describeWeatherCode(30)).toBe('Unknown');
  });
  it('rounds coordinates for privacy and builds the URL', () => {
    expect(roundCoord(56.46207)).toBe(56.46);
    const url = buildWeatherUrl(56.46207, -2.97071);
    expect(url).toContain('latitude=56.46');
    expect(url).toContain('longitude=-2.97');
    expect(url).not.toContain('56.46207');
  });
});
describe('fetchWeather', () => {
  it('returns parsed weather', async () => {
    const f = jest.fn().mockResolvedValue(okResponse(good));
    expect((await fetchWeather(56.46, -2.97, f))?.description).toBe('Rain');
  });
  it('caches repeat requests for nearby coordinates', async () => {
    const f = jest.fn().mockResolvedValue(okResponse(good));
    await fetchWeather(56.4601, -2.9701, f);
    await fetchWeather(56.4602, -2.9702, f);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('returns null (never throws) when offline', async () => {
    const f = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(fetchWeather(1, 1, f)).resolves.toBeNull();
  });
  it('returns null on HTTP error and malformed JSON', async () => {
    expect(await fetchWeather(2, 2, jest.fn().mockResolvedValue({ ok: false }) as any)).toBeNull();
    expect(await fetchWeather(3, 3, jest.fn().mockResolvedValue(okResponse({ nope: 1 })))).toBeNull();
  });
  it('aborts on timeout', async () => {
    const f = jest.fn((_u: string, init: RequestInit) => new Promise<Response>((_res, rej) => {
      init.signal!.addEventListener('abort', () => rej(new Error('aborted')));
    }));
    expect(await fetchWeather(4, 4, f as any, 20)).toBeNull();
  });
});
