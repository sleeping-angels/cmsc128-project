import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { language } from './enums.js';

export const knowledgeEntry = pgTable(
  'knowledge_entry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    /** The only source for chatbot answers (FR17). */
    body: text('body').notNull(),
    language: language('language').default('tgl').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    updatedBy: text('updated_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('knowledge_entry_updated_by_idx').on(table.updatedBy)],
);

export const knowledgeEntryRelations = relations(knowledgeEntry, ({ one }) => ({
  editor: one(user, {
    fields: [knowledgeEntry.updatedBy],
    references: [user.id],
  }),
}));
