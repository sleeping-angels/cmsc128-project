import { Inject, Injectable } from '@nestjs/common';
import {
  messageAttachmentsSchema,
  parseConfidenceSchema,
  type ReportDetail,
  type ReportFeedItem,
  type ReportStatus,
  type SeverityLevel,
} from '@repo/shared';
import { count, eq, gte, inArray, type SQL } from 'drizzle-orm';
import type { Database } from '../database/client.js';
import { DB } from '../database/database.module.js';
import { report } from '../database/schema/index.js';

/**
 * Report columns the feed and the detail both hide: internal links and the
 * tracking token. Relations below replace the IDs.
 */
const reportColumns = {
  trackingToken: false,
  residentId: false,
  createdBy: false,
  reviewedBy: false,
  duplicateOfId: false,
  incidentTypeId: false,
  barangayId: false,
} as const;

/** Relations the feed and the detail both show. */
const reportRelations = {
  incidentType: { columns: { id: true, code: true, name: true } },
  barangay: { columns: { id: true, name: true } },
  creator: { columns: { id: true, name: true } },
} as const;

/** jsonb is unchecked; a value of the wrong shape becomes null instead of a 500. */
function checkConfidence(value: unknown) {
  return parseConfidenceSchema.safeParse(value).data ?? null;
}

function checkAttachments(value: unknown) {
  return messageAttachmentsSchema.safeParse(value).data ?? null;
}

@Injectable()
export class TriageRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Every report as the feed shows it, newest first. */
  findFeed(): Promise<ReportFeedItem[]> {
    return this.findFeedItems();
  }

  /** One report as the feed shows it, or null. */
  async findFeedItem(id: string): Promise<ReportFeedItem | null> {
    const [item] = await this.findFeedItems(eq(report.id, id));
    return item ?? null;
  }

  /** One report with everything a responder reviews, or null if none. */
  async findDetail(id: string): Promise<ReportDetail | null> {
    const row = await this.db.query.report.findFirst({
      where: (r, { eq }) => eq(r.id, id),
      // Same projection as the feed, plus the contact number, victims and messages.
      columns: reportColumns,
      with: {
        ...reportRelations,
        resident: { columns: { id: true, name: true, contactNumber: true } },
        // Ordered by ID so the list doesn't reshuffle between loads.
        victims: {
          columns: {
            id: true,
            sex: true,
            ageMin: true,
            ageMax: true,
            medicalCondition: true,
          },
          orderBy: (v, { asc }) => asc(v.id),
        },
        // senderId tells a responder's reply from the bot's; attachments flag location shares.
        messages: {
          columns: {
            id: true,
            direction: true,
            senderId: true,
            body: true,
            attachments: true,
            createdAt: true,
          },
          orderBy: (m, { asc }) => asc(m.createdAt),
        },
      },
    });
    if (!row) return null;

    return {
      ...row,
      parseConfidence: checkConfidence(row.parseConfidence),
      messages: row.messages.map((m) => ({
        ...m,
        attachments: checkAttachments(m.attachments),
      })),
    };
  }

  /** Report counts per status and severity, for reports in the given statuses. */
  countByStatusAndSeverity(statuses: ReportStatus[]): Promise<
    {
      status: ReportStatus;
      severity: SeverityLevel | null;
      count: number;
    }[]
  > {
    return this.db
      .select({
        status: report.status,
        severity: report.severity,
        count: count(),
      })
      .from(report)
      .where(inArray(report.status, statuses))
      .groupBy(report.status, report.severity);
  }

  /** How many reports were created at or after `since`. */
  async countCreatedSince(since: Date): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(report)
      .where(gte(report.createdAt, since));
    return row?.count ?? 0;
  }

  private async findFeedItems(where?: SQL): Promise<ReportFeedItem[]> {
    const rows = await this.db.query.report.findMany({
      where,
      orderBy: (r, { desc }) => desc(r.createdAt),
      columns: reportColumns,
      with: {
        ...reportRelations,
        resident: { columns: { id: true, name: true } },
        victims: { columns: { id: true } },
        // The card shows the message the report came from.
        messages: {
          columns: { body: true },
          orderBy: (m, { asc }) => asc(m.createdAt),
          limit: 1,
        },
      },
    });
    return rows.map(({ victims, messages, parseConfidence, ...row }) => ({
      ...row,
      parseConfidence: checkConfidence(parseConfidence),
      victimCount: victims.length,
      firstMessage: messages[0]?.body ?? null,
    }));
  }
}
