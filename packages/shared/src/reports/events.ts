import type { z } from 'zod';
import { reportFeedItemSchema } from './report.js';

/** Socket.IO events the triage feed listens to. */
export const REPORT_EVENTS = {
  created: 'report:created',
  updated: 'report:updated',
} as const;

/** Both events carry the whole feed item, so clients can patch caches. */
export const reportCreatedEventSchema = reportFeedItemSchema;
export const reportUpdatedEventSchema = reportFeedItemSchema;

/** Wire shape: dates as ISO strings. Decode with the schema. */
export type ReportEventPayload = z.input<typeof reportFeedItemSchema>;
