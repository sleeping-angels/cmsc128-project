import { SRID, type GeoPoint } from '@repo/shared';
import { customType, timestamp } from 'drizzle-orm/pg-core';

type Position = [number, number];

export interface MultiPolygon {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

const WKB_POINT = 1;
const WKB_POLYGON = 3;
const WKB_MULTI_POLYGON = 6;
const EWKB_SRID_FLAG = 0x20000000;

/** Minimal EWKB reader for the geometry types we store. */
function readEwkb(hex: string) {
  const buf = Buffer.from(hex, 'hex');
  let at = 0;
  let le = true;
  const u32 = () => {
    const v = le ? buf.readUInt32LE(at) : buf.readUInt32BE(at);
    at += 4;
    return v;
  };
  const f64 = () => {
    const v = le ? buf.readDoubleLE(at) : buf.readDoubleBE(at);
    at += 8;
    return v;
  };
  const header = () => {
    le = buf.readUInt8(at++) === 1;
    const type = u32();
    if (type & EWKB_SRID_FLAG) at += 4;
    return type & 0xff;
  };
  const position = (): Position => [f64(), f64()];
  const polygon = () =>
    Array.from({ length: u32() }, () =>
      Array.from({ length: u32() }, position),
    );
  return { header, position, polygon, u32 };
}

export function parseEwkbPoint(hex: string): GeoPoint {
  const r = readEwkb(hex);
  const type = r.header();
  if (type !== WKB_POINT) throw new Error(`Expected a point, got ${type}`);
  const [lng, lat] = r.position();
  return { lng, lat };
}

export function parseEwkbMultiPolygon(hex: string): MultiPolygon {
  const r = readEwkb(hex);
  const type = r.header();
  if (type !== WKB_MULTI_POLYGON) {
    throw new Error(`Expected a multipolygon, got ${type}`);
  }
  const coordinates = Array.from({ length: r.u32() }, () => {
    if (r.header() !== WKB_POLYGON) throw new Error('Expected a polygon');
    return r.polygon();
  });
  return { type: 'MultiPolygon', coordinates };
}

export function toEwktPoint({ lng, lat }: GeoPoint): string {
  return `SRID=${SRID};POINT(${lng} ${lat})`;
}

export function toEwktMultiPolygon({ coordinates }: MultiPolygon): string {
  const ring = (r: Position[]) => `(${r.map((p) => p.join(' ')).join(',')})`;
  const polygon = (p: Position[][]) => `(${p.map(ring).join(',')})`;
  return `SRID=${SRID};MULTIPOLYGON(${coordinates.map(polygon).join(',')})`;
}

// Selects return hex EWKB; relational queries nest rows as JSON, where
// PostGIS returns GeoJSON instead.
type DriverValue<T> = string | T;

// Drizzle's built-in `geometry` ignores `srid`, so points would be stored with SRID 0.
export const geometryPoint = customType<{
  data: GeoPoint;
  driverData: DriverValue<{ coordinates: Position }>;
}>({
  dataType: () => `geometry(Point, ${SRID})`,
  toDriver: toEwktPoint,
  fromDriver: (value) => {
    if (typeof value === 'string') return parseEwkbPoint(value);
    const [lng, lat] = value.coordinates;
    return { lng, lat };
  },
});

export const geometryMultiPolygon = customType<{
  data: MultiPolygon;
  driverData: DriverValue<MultiPolygon>;
}>({
  dataType: () => `geometry(MultiPolygon, ${SRID})`,
  toDriver: toEwktMultiPolygon,
  fromDriver: (value) =>
    typeof value === 'string'
      ? parseEwkbMultiPolygon(value)
      : { type: 'MultiPolygon', coordinates: value.coordinates },
});

export const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
};
