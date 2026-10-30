import { z } from 'zod';

/** ISO datetime string on the wire, `Date` in code. */
export const stringToDate = z.codec(z.iso.datetime(), z.date(), {
  decode: (value) => new Date(value),
  encode: (date) => date.toISOString(),
});

/** WGS 84 coordinates. */
export const geoPoint = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});
export type GeoPoint = z.infer<typeof geoPoint>;
