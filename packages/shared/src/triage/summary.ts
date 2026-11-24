import { z } from 'zod';
import { reportStatusSchema, severityLevelSchema } from '../enums.js';

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
