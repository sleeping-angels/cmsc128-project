import { z } from 'zod';
import { geoPoint, stringToDate } from '../codecs.js';
import {
  reportStatusSchema,
  severityLevelSchema,
  sourceChannelSchema,
} from '../enums.js';
import { parseConfidenceSchema } from './parsed.js';
import { victimInputSchema } from './victim.js';

/**
 * A new report from any intake path: Messenger, web chat, the classifier or
 * the guided form. Unknown fields stay null for triage to fill in.
 */
export const reportInputSchema = z.object({
  /** Always the sender, even for proxy reports. */
  residentId: z.uuid(),
  sourceChannel: sourceChannelSchema,
  isProxy: z.boolean().default(false),
  incidentTypeId: z.uuid().nullish(),
  severity: severityLevelSchema.nullish(),
  barangayId: z.uuid().nullish(),
  locationText: z.string().trim().min(1).nullish(),
  location: geoPoint.nullish(),
  /** A `Date`, or an ISO string over the wire. */
  incidentAt: z.coerce.date<Date | string>().nullish(),
  victims: z.array(victimInputSchema).default([]),
  /** The resident's messages the report came from; linked to it. */
  messageIds: z.array(z.uuid()).default([]),
  /** False for form reports and classifier fallbacks. */
  parsedAutomatically: z.boolean().default(false),
  parseConfidence: parseConfidenceSchema.nullish(),
});
export type ReportInput = z.input<typeof reportInputSchema>;

/** A report as the triage feed lists it. */
export const reportFeedItemSchema = z.object({
  id: z.uuid(),
  status: reportStatusSchema,
  isProxy: z.boolean(),
  incidentType: z
    .object({ id: z.uuid(), code: z.string(), name: z.string() })
    .nullable(),
  severity: severityLevelSchema.nullable(),
  barangay: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  locationText: z.string().nullable(),
  location: geoPoint.nullable(),
  incidentAt: stringToDate.nullable(),
  sourceChannel: sourceChannelSchema,
  parsedAutomatically: z.boolean(),
  parseConfidence: parseConfidenceSchema.nullable(),
  resident: z.object({ id: z.uuid(), name: z.string().nullable() }),
  victimCount: z.int().min(0),
  createdAt: stringToDate,
  updatedAt: stringToDate,
});
export type ReportFeedItem = z.output<typeof reportFeedItemSchema>;
