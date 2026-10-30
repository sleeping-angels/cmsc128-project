import { Inject, Injectable } from '@nestjs/common';
import type { SourceChannel } from '@repo/shared';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import type { Database } from '../database/client.js';
import { DB } from '../database/database.module.js';
import {
  message,
  resident,
  residentChannel,
} from '../database/schema/index.js';

export interface RecordedMessage {
  messageId: string;
  residentId: string;
}

export interface InboundRecord {
  channel: SourceChannel;
  /** Messenger PSID or web session ID. */
  senderExternalId: string;
  externalId: string;
  body: string | null;
  attachments: unknown[] | null;
}

export interface OutboundRecord {
  residentId: string;
  channel: SourceChannel;
  body: string;
  externalId: string | null;
  reportId?: string;
  /** The responder who wrote it; omit for the bot. */
  senderId?: string;
}

/** Keeps every message sent or received as a permanent Message row. */
@Injectable()
export class MessageLogService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Saves an inbound message, creating the resident on first contact.
   * Null when the platform already delivered this message.
   */
  recordInbound(inbound: InboundRecord): Promise<RecordedMessage | null> {
    return this.db.transaction(async (tx) => {
      // Serializes first contact so concurrent messages create one resident.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${inbound.channel}:${inbound.senderExternalId}`}))`,
      );

      let [identity] = await tx
        .update(residentChannel)
        .set({
          lastInboundAt: new Date(),
        })
        .where(
          and(
            eq(residentChannel.channel, inbound.channel),
            eq(residentChannel.externalId, inbound.senderExternalId),
          ),
        )
        .returning({ residentId: residentChannel.residentId });

      if (!identity) {
        const [created] = await tx
          .insert(resident)
          .values({})
          .returning({ id: resident.id });
        [identity] = await tx
          .insert(residentChannel)
          .values({
            residentId: created!.id,
            channel: inbound.channel,
            externalId: inbound.senderExternalId,
            lastInboundAt: new Date(),
          })
          .returning({ residentId: residentChannel.residentId });
      }

      const [row] = await tx
        .insert(message)
        .values({
          residentId: identity!.residentId,
          channel: inbound.channel,
          direction: 'inbound',
          body: inbound.body,
          attachments: inbound.attachments,
          externalId: inbound.externalId,
        })
        .onConflictDoNothing({
          target: [message.channel, message.externalId],
          where: isNotNull(message.externalId),
        })
        .returning({ id: message.id });

      return row
        ? { messageId: row.id, residentId: identity!.residentId }
        : null;
    });
  }

  async recordOutbound(record: OutboundRecord): Promise<string> {
    const [row] = await this.db
      .insert(message)
      .values({ ...record, direction: 'outbound' })
      .returning({ id: message.id });
    return row!.id;
  }

  /** The resident's ID on a channel, or null if they never used it. */
  async findExternalId(residentId: string, channel: SourceChannel) {
    const [row] = await this.db
      .select({ externalId: residentChannel.externalId })
      .from(residentChannel)
      .where(
        and(
          eq(residentChannel.residentId, residentId),
          eq(residentChannel.channel, channel),
        ),
      )
      .limit(1);
    return row?.externalId ?? null;
  }
}
