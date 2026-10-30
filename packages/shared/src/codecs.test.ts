import { describe, expect, it } from 'vitest';
import { geoPoint, stringToDate } from './codecs.js';

describe('stringToDate', () => {
  it('round-trips an ISO string', () => {
    const iso = '2026-10-29T08:30:00.000Z';
    const date = stringToDate.decode(iso);
    expect(date).toEqual(new Date(iso));
    expect(stringToDate.encode(date)).toBe(iso);
  });

  it('rejects a non-ISO string', () => {
    expect(stringToDate.safeDecode('yesterday').success).toBe(false);
  });
});

describe('geoPoint', () => {
  it('accepts Miagao coordinates', () => {
    expect(geoPoint.safeParse({ lng: 122.23, lat: 10.64 }).success).toBe(true);
  });

  it('rejects out-of-range coordinates', () => {
    expect(geoPoint.safeParse({ lng: 181, lat: 0 }).success).toBe(false);
    expect(geoPoint.safeParse({ lng: 0, lat: -91 }).success).toBe(false);
  });
});
