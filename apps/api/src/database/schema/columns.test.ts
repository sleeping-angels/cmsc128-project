import { pgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  geometryMultiPolygon,
  geometryPoint,
  type MultiPolygon,
  parseEwkbMultiPolygon,
  parseEwkbPoint,
  toEwktMultiPolygon,
  toEwktPoint,
} from './columns.js';

// Hex EWKB returned by PostGIS 3.5.
const POINT_HEX = '0101000020E61000001F85EB51B88E5E4048E17A14AE472540';
const MULTI_POLYGON_HEX =
  '0106000020E61000000200000001030000000100000004000000CDCCCCCCCC8C5E4033333333333325403333333333935E4033333333333325403333333333935E406666666666662540CDCCCCCCCC8C5E40333333333333254001030000000200000004000000000000000000F03F000000000000F03F0000000000000040000000000000F03F00000000000000400000000000000040000000000000F03F000000000000F03F04000000333333333333F33F333333333333F33F000000000000F83F333333333333F33F000000000000F83F000000000000F83F333333333333F33F333333333333F33F';

const table = pgTable('t', {
  point: geometryPoint('point'),
  area: geometryMultiPolygon('area'),
});

describe('geometryPoint', () => {
  it('writes EWKT', () => {
    expect(toEwktPoint({ lng: 122.23, lat: 10.64 })).toBe(
      'SRID=4326;POINT(122.23 10.64)',
    );
  });

  it('reads hex EWKB', () => {
    expect(parseEwkbPoint(POINT_HEX)).toEqual({ lng: 122.23, lat: 10.64 });
  });

  it('reads GeoJSON from relational queries', () => {
    expect(
      table.point.mapFromDriverValue({ coordinates: [122.23, 10.64] }),
    ).toEqual({ lng: 122.23, lat: 10.64 });
  });

  it('rejects other geometry', () => {
    expect(() => parseEwkbPoint(MULTI_POLYGON_HEX)).toThrow();
  });
});

describe('geometryMultiPolygon', () => {
  const area: MultiPolygon = {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [122.2, 10.6],
          [122.3, 10.6],
          [122.3, 10.7],
          [122.2, 10.6],
        ],
      ],
      [
        [
          [1, 1],
          [2, 1],
          [2, 2],
          [1, 1],
        ],
        [
          [1.2, 1.2],
          [1.5, 1.2],
          [1.5, 1.5],
          [1.2, 1.2],
        ],
      ],
    ],
  };

  it('reads hex EWKB', () => {
    expect(parseEwkbMultiPolygon(MULTI_POLYGON_HEX)).toEqual(area);
  });

  it('writes EWKT', () => {
    expect(toEwktMultiPolygon(area)).toBe(
      'SRID=4326;MULTIPOLYGON(((122.2 10.6,122.3 10.6,122.3 10.7,122.2 10.6)),((1 1,2 1,2 2,1 1),(1.2 1.2,1.5 1.2,1.5 1.5,1.2 1.2)))',
    );
  });

  it('reads GeoJSON from relational queries', () => {
    expect(table.area.mapFromDriverValue(area)).toEqual(area);
  });
});
