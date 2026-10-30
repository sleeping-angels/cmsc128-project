import { Injectable, Logger } from '@nestjs/common';
import { APP_NAME, type Barangay, type GeoPoint } from '@repo/shared';
import { z } from 'zod';
import { env } from '../config/env.js';
import { BarangayService } from './barangay.service.js';

/** Miagao's extent with a small margin, as left,top,right,bottom. */
const MIAGAO_VIEWBOX = '122.09,10.76,122.28,10.60';

// Nominatim's usage policy: at most 1 request per second, identify the app,
// and cache results.
const MIN_INTERVAL_MS = 1000;
const TIMEOUT_MS = 5000;
const CACHE_SIZE = 1000;
const USER_AGENT = `${APP_NAME} (MDRRMO Miagao incident intake; ${env.WEB_URL})`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const searchResponse = z.array(
  z.object({ lat: z.coerce.number(), lon: z.coerce.number() }),
);

export interface GeocodeResult {
  point: GeoPoint;
  barangay: Barangay | null;
}

/** Geocodes free-text locations within Miagao through Nominatim. */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly cache = new Map<string, Promise<GeoPoint | null>>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly barangays: BarangayService) {}

  /** Null when Nominatim finds nothing in Miagao or fails. */
  async geocode(text: string): Promise<GeocodeResult | null> {
    const point = await this.search(text);
    if (!point) return null;
    return { point, barangay: await this.barangays.findContaining(point) };
  }

  private search(text: string) {
    const query = text.trim().toLowerCase().replace(/\s+/g, ' ');
    const cached = this.cache.get(query);
    if (cached) {
      // Re-insert so eviction drops the least recently used query.
      this.cache.delete(query);
      this.cache.set(query, cached);
      return cached;
    }

    const result = this.throttle(() => this.request(query)).catch(
      (error: unknown) => {
        // Failures aren't cached, so the next ask retries.
        this.cache.delete(query);
        this.logger.warn(`Nominatim search failed: ${String(error)}`);
        return null;
      },
    );
    this.cache.set(query, result);
    if (this.cache.size > CACHE_SIZE) {
      this.cache.delete(this.cache.keys().next().value!);
    }
    return result;
  }

  /** Runs requests one at a time, at least MIN_INTERVAL_MS apart. */
  private throttle<T>(fn: () => Promise<T>) {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => {}).then(() => sleep(MIN_INTERVAL_MS));
    return run;
  }

  private async request(query: string): Promise<GeoPoint | null> {
    const url = new URL('/search', env.NOMINATIM_URL);
    url.search = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'ph',
      viewbox: MIAGAO_VIEWBOX,
      bounded: '1',
    }).toString();
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const [hit] = searchResponse.parse(await res.json());
    return hit ? { lng: hit.lon, lat: hit.lat } : null;
  }
}
