import type { UserRole } from '@repo/shared';
import { relations, sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';

export const invite = pgTable(
  'invite',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    role: text('role').$type<UserRole>().notNull(),
    /** Hash of the emailed token; the token itself is never stored. */
    tokenHash: text('token_hash').notNull().unique(),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    revokedAt: timestamp('revoked_at'),
    acceptedUserId: text('accepted_user_id').references(() => user.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Expired invites still count until revoked.
    uniqueIndex('invite_pending_email_key')
      .on(table.email)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
    index('invite_invited_by_idx').on(table.invitedBy),
  ],
);

export const inviteRelations = relations(invite, ({ one }) => ({
  inviter: one(user, {
    fields: [invite.invitedBy],
    references: [user.id],
    relationName: 'invite_inviter',
  }),
  acceptedUser: one(user, {
    fields: [invite.acceptedUserId],
    references: [user.id],
    relationName: 'invite_accepted_user',
  }),
}));
