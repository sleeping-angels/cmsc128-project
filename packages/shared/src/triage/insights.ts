import { z } from 'zod';
import { reportStatusSchema, severityLevelSchema } from '../enums.js';
import { reportFeedItemSchema } from './report.js';

/** Statuses of a report still being handled; the rest are done or retired. */
export const openReportStatusSchema = reportStatusSchema.extract([
  'pending',
  'validated',
  'dispatched',
]);
export type OpenReportStatus = z.infer<typeof openReportStatusSchema>;

const count = z.int().min(0);

/** Report counts for the dashboard home. */
export const reportSummarySchema = z.object({
  /** Open reports per status. */
  openByStatus: z.record(openReportStatusSchema, count),
  /** Open reports per severity; `unrated` counts those without one yet. */
  openBySeverity: z.record(
    z.enum([...severityLevelSchema.options, 'unrated']),
    count,
  ),
  /** Reports created since midnight in the Philippines, of any status. */
  newToday: count,
});
export type ReportSummary = z.output<typeof reportSummarySchema>;

/** Why an open report needs a responder now. */
export const attentionReasonSchema = z.enum([
  /** Critical or high, and help isn't on the way yet. */
  'urgent',
  /** Still pending after the review window. */
  'waiting',
  /** No incident type or no severity yet. */
  'incomplete',
  /** Pending, and the bot was unsure of what it read. */
  'unsure',
]);
export type AttentionReason = z.infer<typeof attentionReasonSchema>;

/** An open report that needs a responder, with every reason that applies. */
export const attentionReportSchema = reportFeedItemSchema.extend({
  reasons: z.array(attentionReasonSchema).min(1),
});
export type AttentionReport = z.output<typeof attentionReportSchema>;

/** The most urgent open reports first, and how many need attention in all. */
export const attentionQueueSchema = z.object({
  total: count,
  reports: z.array(attentionReportSchema),
});
export type AttentionQueue = z.output<typeof attentionQueueSchema>;
