import { z } from 'zod';
import { broadcastKindSchema, deliveryStatusSchema } from '../enums.js';
import { stringToDate } from '../codecs.js';

/** A sent broadcast of any kind, as responder lists show it. */
export const broadcastSummarySchema = z.object({
  id: z.uuid(),
  kind: broadcastKindSchema,
  messageBody: z.string(),
  sentAt: stringToDate,
  createdBy: z.object({
    id: z.string(),
    name: z.string(),
  }),
  /** Deliveries per status; their total is how many sends were attempted. */
  deliveries: z.record(deliveryStatusSchema, z.int().min(0)),
});
export type BroadcastSummary = z.output<typeof broadcastSummarySchema>;
