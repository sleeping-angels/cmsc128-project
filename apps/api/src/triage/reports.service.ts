import { Injectable } from '@nestjs/common';
import type { ReportDetail, ReportFeedItem } from '@repo/shared';
import { TriageRepository } from './triage.repository.js';

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

  /** One report with everything a responder reviews, or null if none. */
  findDetail(id: string): Promise<ReportDetail | null> {
    return this.repository.findDetail(id);
  }
}
