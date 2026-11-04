import { randomBytes } from 'node:crypto';
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  type AnyPgColumn,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { agencyReferral } from './agency.js';
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
    /** Null only for responder-created reports from an unknown caller. */
    residentId: uuid('resident_id').references(() => resident.id, {
      onDelete: 'restrict',
    }),
    isProxy: boolean('is_proxy').default(false).notNull(),
    /** The responder who entered it; null for resident reports. */
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'restrict',
    }),
    reviewedBy: text('reviewed_by').references(() => user.id, {
      onDelete: 'restrict',
    }),
    /** The report this one repeats. */
    duplicateOfId: uuid('duplicate_of_id').references(
      (): AnyPgColumn => report.id,
      { onDelete: 'restrict' },
    ),
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
    index('report_duplicate_of_id_idx').on(table.duplicateOfId),
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

export const reportEdit = pgTable(
  'report_edit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => report.id, { onDelete: 'restrict' }),
    responderId: text('responder_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    field: text('field').notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    editedAt: timestamp('edited_at').defaultNow().notNull(),
  },
  (table) => [
    index('report_edit_report_id_edited_at_idx').on(
      table.reportId,
      table.editedAt,
    ),
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
  creator: one(user, {
    fields: [report.createdBy],
    references: [user.id],
    relationName: 'report_creator',
  }),
  reviewer: one(user, {
    fields: [report.reviewedBy],
    references: [user.id],
    relationName: 'report_reviewer',
  }),
  duplicateOf: one(report, {
    fields: [report.duplicateOfId],
    references: [report.id],
    relationName: 'report_duplicate',
  }),
  duplicates: many(report, { relationName: 'report_duplicate' }),
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
  edits: many(reportEdit),
  referrals: many(agencyReferral),
}));

export const victimRelations = relations(victim, ({ one }) => ({
  report: one(report, {
    fields: [victim.reportId],
    references: [report.id],
  }),
}));

export const reportEditRelations = relations(reportEdit, ({ one }) => ({
  report: one(report, {
    fields: [reportEdit.reportId],
    references: [report.id],
  }),
  responder: one(user, {
    fields: [reportEdit.responderId],
    references: [user.id],
  }),
}));
