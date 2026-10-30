import {
  type ReportFeedItem,
  type ReportInput,
  reportInputSchema,
} from '@repo/shared';
import { and, eq, inArray, type SQL } from 'drizzle-orm';
import type { Database } from '../database/client.js';
import { message, report, victim } from '../database/schema/index.js';

export interface CreatedReport {
  id: string;
  /** For the resident's `/status/:token` link. */
  trackingToken: string;
}

/**
 * Saves a pending report with its victims and links its source messages.
 * Throws if a message isn't the resident's.
 */
export function insertReport(
  db: Database,
  input: ReportInput,
): Promise<CreatedReport> {
  const { victims, messageIds, ...fields } = reportInputSchema.parse(input);
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(report)
      .values(fields)
      .returning({ id: report.id, trackingToken: report.trackingToken });
    const { id } = created!;

    if (victims.length) {
      await tx
        .insert(victim)
        .values(victims.map((v) => ({ ...v, reportId: id })));
    }

    if (messageIds.length) {
      const linked = await tx
        .update(message)
        .set({ reportId: id })
        .where(
          and(
            inArray(message.id, messageIds),
            eq(message.residentId, fields.residentId),
          ),
        )
        .returning({ id: message.id });
      if (linked.length !== new Set(messageIds).size) {
        throw new Error(
          `Some messages don't belong to resident ${fields.residentId}`,
        );
      }
    }

    return created!;
  });
}

/** Reports as the triage feed shows them, newest first. */
export async function findFeedItems(
  db: Database,
  where?: SQL,
): Promise<ReportFeedItem[]> {
  const rows = await db.query.report.findMany({
    where,
    orderBy: (r, { desc }) => desc(r.createdAt),
    columns: {
      trackingToken: false,
      residentId: false,
      reviewedBy: false,
      incidentTypeId: false,
      barangayId: false,
    },
    with: {
      incidentType: { columns: { id: true, code: true, name: true } },
      barangay: { columns: { id: true, name: true } },
      resident: { columns: { id: true, name: true } },
      victims: { columns: { id: true } },
    },
  });
  return rows.map(({ victims, parseConfidence, ...row }) => ({
    ...row,
    parseConfidence: parseConfidence as ReportFeedItem['parseConfidence'],
    victimCount: victims.length,
  }));
}

export async function findFeedItem(db: Database, id: string) {
  const [item] = await findFeedItems(db, eq(report.id, id));
  return item ?? null;
}
