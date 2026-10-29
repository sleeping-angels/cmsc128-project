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
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { barangay } from './barangay.js';
import { geometryPoint, timestamps } from './columns.js';
import { language, sex, sourceChannel } from './enums.js';
import { message } from './message.js';
import { report } from './report.js';

export const resident = pgTable(
  'resident',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    contactNumber: text('contact_number'),
    age: integer('age'),
    sex: sex('sex'),
    barangayId: uuid('barangay_id').references(() => barangay.id, {
      onDelete: 'restrict',
    }),
    locationText: text('location_text'),
    location: geometryPoint('location'),
    languagePreference: language('language_preference')
      .default('tgl')
      .notNull(),
    broadcastsOptIn: boolean('broadcasts_opt_in').default(true).notNull(),
    privacyNoticeAt: timestamp('privacy_notice_at'),
    ...timestamps,
  },
  (table) => [
    check('resident_age_check', sql`${table.age} >= 0`),
    index('resident_location_idx').using('gist', table.location),
  ],
);

export const residentChannel = pgTable(
  'resident_channel',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    residentId: uuid('resident_id')
      .notNull()
      .references(() => resident.id, { onDelete: 'restrict' }),
    channel: sourceChannel('channel').notNull(),
    externalId: text('external_id').notNull(),
    lastInboundAt: timestamp('last_inbound_at'),
    pushSubscription: jsonb('push_subscription'),
  },
  (table) => [
    unique('resident_channel_channel_external_id_key').on(
      table.channel,
      table.externalId,
    ),
    index('resident_channel_resident_id_idx').on(table.residentId),
  ],
);

export const residentRelations = relations(resident, ({ one, many }) => ({
  barangay: one(barangay, {
    fields: [resident.barangayId],
    references: [barangay.id],
  }),
  channels: many(residentChannel),
  reports: many(report),
  messages: many(message),
}));

export const residentChannelRelations = relations(
  residentChannel,
  ({ one }) => ({
    resident: one(resident, {
      fields: [residentChannel.residentId],
      references: [resident.id],
    }),
  }),
);
