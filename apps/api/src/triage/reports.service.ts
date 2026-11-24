import { Injectable } from '@nestjs/common';
import {
  openReportStatusSchema,
  type ReportDetail,
  type ReportFeedItem,
  type ReportSummary,
} from '@repo/shared';
import { TriageRepository } from './triage.repository.js';

/** The Philippines is UTC+8 all year, with no daylight saving. */
const PHILIPPINE_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Midnight in the Philippines on the day `now` falls in there. */
export function startOfPhilippineDay(now: Date): Date {
  const local = new Date(now.getTime() + PHILIPPINE_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - PHILIPPINE_OFFSET_MS);
}

@Injectable()
export class ReportsService {
  constructor(private readonly repository: TriageRepository) {}

  /** Every report for the feed list, newest first. */
  // TODO(#38): sort, filters and live updates.
  findFeed(): Promise<ReportFeedItem[]> {
    return this.repository.findFeed();
  }

  /** One report as the feed shows it, e.g. to push a new report live. */
  findFeedItem(id: string): Promise<ReportFeedItem | null> {
    return this.repository.findFeedItem(id);
  }

  /** Open report counts by status and severity, plus how many came in today. */
  async summarize(now = new Date()): Promise<ReportSummary> {
    const open = openReportStatusSchema.options;
    const [rows, newToday] = await Promise.all([
      this.repository.countByStatusAndSeverity(open),
      this.repository.countCreatedSince(startOfPhilippineDay(now)),
    ]);

    const summary: ReportSummary = {
      openByStatus: { pending: 0, validated: 0, dispatched: 0 },
      openBySeverity: { low: 0, moderate: 0, high: 0, critical: 0, unrated: 0 },
      newToday,
    };
    for (const row of rows) {
      const status = openReportStatusSchema.safeParse(row.status);
      if (!status.success) continue;
      summary.openByStatus[status.data] += row.count;
      summary.openBySeverity[row.severity ?? 'unrated'] += row.count;
    }
    return summary;
  }

  /** One report with everything a responder reviews, or null if none. */
  findDetail(id: string): Promise<ReportDetail | null> {
    return this.repository.findDetail(id);
  }
}
