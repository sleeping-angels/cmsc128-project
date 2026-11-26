import { z } from 'zod';
import { stringToDate } from '../codecs.js';
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

/** A severity, or `unrated` for a report without one yet. */
const severityKeySchema = z.enum([...severityLevelSchema.options, 'unrated']);

/** Report counts for the dashboard home. */
export const reportSummarySchema = z.object({
  /** Open reports per status. */
  openByStatus: z.record(openReportStatusSchema, count),
  /** Open reports per severity; `unrated` counts those without one yet. */
  openBySeverity: z.record(severityKeySchema, count),
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

/** The median of one step, now and in the period before, in minutes; null without data. */
const responseTimeSchema = z.object({
  minutes: z.number().min(0).nullable(),
  previousMinutes: z.number().min(0).nullable(),
});

/** How long reports took to move along, over the last `days` days. */
export const responseTimesSchema = z.object({
  days: z.int().positive(),
  /** From the report coming in to a responder confirming it. */
  toValidate: responseTimeSchema,
  /** From confirming it to sending help. */
  toDispatch: responseTimeSchema,
  /** From the report coming in to sending help. */
  toHelp: responseTimeSchema,
});
export type ResponseTimes = z.output<typeof responseTimesSchema>;

/** The periods the trend charts cover. */
export const trendRangeSchema = z.enum(['24h', '7d', '30d', '90d']);
export type TrendRange = z.infer<typeof trendRangeSchema>;

export const reportTrendsQuerySchema = z.object({
  range: trendRangeSchema.default('7d'),
});

const typeCountSchema = z.object({
  /** Null for reports without an incident type. */
  incidentType: z.object({ code: z.string(), name: z.string() }).nullable(),
  count,
});

const barangayCountSchema = z.object({ name: z.string(), count });

/** Reports created in a range, excluding invalid ones, for the trend charts. */
export const reportTrendsSchema = z.object({
  range: trendRangeSchema,
  total: count,
  /** Per hour for 24h, per Philippine day otherwise; oldest first, empty periods included. */
  overTime: z.array(
    z.object({
      start: stringToDate,
      counts: z.record(severityKeySchema, count),
    }),
  ),
  bySeverity: z.record(severityKeySchema, count),
  /** Most reports first. */
  byType: z.array(typeCountSchema),
  /** The barangays with the most reports, most first; reports without one are left out. */
  byBarangay: z.array(barangayCountSchema),
});
export type ReportTrends = z.output<typeof reportTrendsSchema>;
