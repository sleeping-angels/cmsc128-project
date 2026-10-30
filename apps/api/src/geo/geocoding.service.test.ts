import type { Barangay } from '@repo/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BarangayService } from './barangay.service.js';
import { GeocodingService } from './geocoding.service.js';

vi.mock('../config/env.js', () => ({
  env: {
    WEB_URL: 'http://localhost:5173',
    NOMINATIM_URL: 'https://nominatim.test',
  },
}));

const TACAS = { id: 'tacas', name: 'Tacas' } as Barangay;

const hit = (lat: string, lon: string) =>
  new Response(JSON.stringify([{ lat, lon, display_name: 'x' }]));

describe('GeocodingService', () => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  const findContaining = vi.fn();
  let service: GeocodingService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetch);
    fetch.mockReset();
    findContaining.mockReset().mockResolvedValue(TACAS);
    service = new GeocodingService({
      findContaining,
    } as unknown as BarangayService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns the point and the barangay containing it', async () => {
    fetch.mockResolvedValue(hit('10.6415', '122.2353'));

    await expect(service.geocode('Miagao Church')).resolves.toEqual({
      point: { lng: 122.2353, lat: 10.6415 },
      barangay: TACAS,
    });
    expect(findContaining).toHaveBeenCalledWith({
      lng: 122.2353,
      lat: 10.6415,
    });
  });

  it('searches only within Miagao and identifies the app', async () => {
    fetch.mockResolvedValue(hit('10.64', '122.23'));

    await service.geocode('Miagao Church');

    const [url, init] = fetch.mock.calls[0]!;
    const params = (url as URL).searchParams;
    expect((url as URL).origin).toBe('https://nominatim.test');
    expect(params.get('q')).toBe('miagao church');
    expect(params.get('bounded')).toBe('1');
    expect(params.get('viewbox')).toBe('122.09,10.76,122.28,10.60');
    expect(new Headers(init!.headers).get('User-Agent')).toMatch(/^MIGO /);
  });

  it('returns null when nothing matches', async () => {
    fetch.mockResolvedValue(new Response('[]'));

    await expect(service.geocode('nowhere')).resolves.toBeNull();
    expect(findContaining).not.toHaveBeenCalled();
  });

  it('caches by normalized text, including misses', async () => {
    fetch.mockResolvedValue(new Response('[]'));

    await service.geocode('Miagao  Church');
    await service.geocode(' miagao church');

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns null on failure without caching it', async () => {
    fetch.mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(service.geocode('Miagao Church')).resolves.toBeNull();

    fetch.mockResolvedValueOnce(hit('10.64', '122.23'));
    const retry = service.geocode('Miagao Church');
    await vi.advanceTimersByTimeAsync(1000);

    await expect(retry).resolves.not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('spaces requests at least a second apart', async () => {
    const sentAt: number[] = [];
    fetch.mockImplementation(() => {
      sentAt.push(Date.now());
      return Promise.resolve(hit('10.64', '122.23'));
    });

    const done = Promise.all(['a', 'b', 'c'].map((q) => service.geocode(q)));
    await vi.advanceTimersByTimeAsync(5000);
    await done;

    expect(sentAt).toHaveLength(3);
    expect(sentAt[1]! - sentAt[0]!).toBeGreaterThanOrEqual(1000);
    expect(sentAt[2]! - sentAt[1]!).toBeGreaterThanOrEqual(1000);
  });
});
