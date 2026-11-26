import { Inject, Injectable } from '@nestjs/common';
import type { BroadcastSummary, DeliveryStatus } from '@repo/shared';
import { and, count, eq, inArray, isNotNull } from 'drizzle-orm';
import type { Database } from '../database/client.js';
import { DB } from '../database/database.module.js';
import { broadcast, broadcastDelivery } from '../database/schema/index.js';

function emptyDeliveries(): Record<DeliveryStatus, number> {
  return { queued: 0, sent: 0, failed: 0, outside_window: 0 };
}

@Injectable()
export class BroadcastsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** The five most recently sent advisories, newest first, with their creator and delivery counts. */
  async findRecentAdvisories(): Promise<BroadcastSummary[]> {
    const rows = await this.db.query.broadcast.findMany({
      where: and(eq(broadcast.kind, 'advisory'), isNotNull(broadcast.sentAt)),
      orderBy: (row, { desc }) => desc(row.sentAt),
      limit: 5,
      columns: {
        id: true,
        kind: true,
        messageBody: true,
        sentAt: true,
      },
      with: {
        creator: {
          columns: { id: true, name: true },
        },
      },
    });

    const deliveries = await this.countDeliveries(rows.map((row) => row.id));

    return rows
      .filter((row) => row.sentAt !== null)
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        messageBody: row.messageBody,
        sentAt: row.sentAt!,
        createdBy: row.creator,
        deliveries: deliveries.get(row.id) ?? emptyDeliveries(),
      }));
  }

  /** Delivery counts per status for each of the given broadcasts. */
  private async countDeliveries(
    broadcastIds: string[],
  ): Promise<Map<string, Record<DeliveryStatus, number>>> {
    const counts = new Map<string, Record<DeliveryStatus, number>>();
    if (broadcastIds.length === 0) return counts;

    const rows = await this.db
      .select({
        broadcastId: broadcastDelivery.broadcastId,
        status: broadcastDelivery.status,
        count: count(),
      })
      .from(broadcastDelivery)
      .where(inArray(broadcastDelivery.broadcastId, broadcastIds))
      .groupBy(broadcastDelivery.broadcastId, broadcastDelivery.status);

    for (const row of rows) {
      const entry = counts.get(row.broadcastId) ?? emptyDeliveries();
      entry[row.status] = row.count;
      counts.set(row.broadcastId, entry);
    }
    return counts;
  }
}
