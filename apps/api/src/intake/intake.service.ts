import { Inject, Injectable } from '@nestjs/common';
import {
  REPORT_EVENTS,
  type ReportInput,
  reportCreatedEventSchema,
} from '@repo/shared';
import type { Database } from '../database/client.js';
import { DB } from '../database/database.module.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { findFeedItem, insertReport } from './reports.js';

@Injectable()
export class IntakeService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * The only way reports are created: Messenger, web chat, the classifier
   * and the guided form all call this. Pushes the report to the feed.
   */
  async createReport(input: ReportInput) {
    const created = await insertReport(this.db, input);
    const item = await findFeedItem(this.db, created.id);
    this.realtime.toDashboard(
      REPORT_EVENTS.created,
      reportCreatedEventSchema.encode(item!),
    );
    return created;
  }
}
