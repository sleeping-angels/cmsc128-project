import { randomBytes } from 'node:crypto';
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { barangay } from './barangay.js';
import { geometryPoint, timestamps } from './columns.js';
import { reportStatus, severityLevel, sex, sourceChannel } from './enums.js';
import { message } from './message.js';
import { resident } from './resident.js';

export const incidentType = pgTable('incident_type', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const report = pgTable(
  'report',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackingToken: text('tracking_token')
      .notNull()
      .unique()
      .$defaultFn(() => randomBytes(16).toString('base64url')),
    residentId: uuid('resident_id')
      .notNull()
      .references(() => resident.id, { onDelete: 'restrict' }),
    isProxy: boolean('is_proxy').default(false).notNull(),
    reviewedBy: text('reviewed_by').references(() => user.id, {
      onDelete: 'restrict',
    }),
    status: reportStatus('status').default('pending').notNull(),
    incidentTypeId: uuid('incident_type_id').references(() => incidentType.id, {
      onDelete: 'restrict',
    }),
    severity: severityLevel('severity'),
    barangayId: uuid('barangay_id').references(() => barangay.id, {
      onDelete: 'restrict',
    }),
    locationText: text('location_text'),
    location: geometryPoint('location'),
    incidentAt: timestamp('incident_at'),
    sourceChannel: sourceChannel('source_channel').notNull(),
    parsedAutomatically: boolean('parsed_automatically')
      .default(false)
      .notNull(),
    parseConfidence: jsonb('parse_confidence'),
    ...timestamps,
  },
  (table) => [
    index('report_resident_id_idx').on(table.residentId),
    index('report_status_created_at_idx').on(table.status, table.createdAt),
    index('report_incident_type_id_idx').on(table.incidentTypeId),
    index('report_barangay_id_idx').on(table.barangayId),
    index('report_location_idx').using('gist', table.location),
  ],
);

export const victim = pgTable(
  'victim',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => report.id, { onDelete: 'restrict' }),
    sex: sex('sex'),
    age: integer('age'),
    medicalCondition: text('medical_condition'),
  },
  (table) => [
    check('victim_age_check', sql`${table.age} >= 0`),
    index('victim_report_id_idx').on(table.reportId),
  ],
);

export const incidentTypeRelations = relations(incidentType, ({ many }) => ({
  reports: many(report),
}));

export const reportRelations = relations(report, ({ one, many }) => ({
  resident: one(resident, {
    fields: [report.residentId],
    references: [resident.id],
  }),
  reviewer: one(user, {
    fields: [report.reviewedBy],
    references: [user.id],
  }),
  incidentType: one(incidentType, {
    fields: [report.incidentTypeId],
    references: [incidentType.id],
  }),
  barangay: one(barangay, {
    fields: [report.barangayId],
    references: [barangay.id],
  }),
  victims: many(victim),
  messages: many(message),
}));

export const victimRelations = relations(victim, ({ one }) => ({
  report: one(report, {
    fields: [victim.reportId],
    references: [report.id],
  }),
}));
