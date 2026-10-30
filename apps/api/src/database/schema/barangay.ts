import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { geometryMultiPolygon, geometryPoint } from './columns.js';
import { hazardType } from './enums.js';
import { report } from './report.js';
import { resident } from './resident.js';

export const barangay = pgTable(
  'barangay',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    centroid: geometryPoint('centroid').notNull(),
    boundary: geometryMultiPolygon('boundary'),
    isCoastal: boolean('is_coastal').default(false).notNull(),
    isUpland: boolean('is_upland').default(false).notNull(),
    hazards: hazardType('hazards').array().default([]).notNull(),
  },
  (table) => [
    index('barangay_centroid_idx').using('gist', table.centroid),
    index('barangay_boundary_idx').using('gist', table.boundary),
  ],
);

export const barangayRelations = relations(barangay, ({ many }) => ({
  residents: many(resident),
  reports: many(report),
}));
