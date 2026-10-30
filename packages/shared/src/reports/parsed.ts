import { z } from 'zod';
import { severityLevelSchema } from '../enums.js';
import { victimInputSchema } from './victim.js';

/** A classifier field: its value, or null when absent, with a 0–1 confidence. */
const parsed = <T extends z.ZodType>(value: T) =>
  z.object({
    value: value.nullable(),
    confidence: z.number().min(0).max(1),
  });

/** What the classifier extracts from a resident's message. */
export const parsedReportSchema = z.object({
  /** `incident_type.code` */
  incidentType: parsed(z.string()),
  severity: parsed(severityLevelSchema),
  /** Barangay name as written; resolve it through the geo module. */
  barangay: parsed(z.string()),
  locationText: parsed(z.string()),
  incidentAt: parsed(z.iso.datetime()),
  isProxy: parsed(z.boolean()),
  /** Null when the message doesn't say; `[]` when it says no one is hurt. */
  victims: parsed(z.array(victimInputSchema)),
});
export type ParsedReport = z.infer<typeof parsedReportSchema>;

export const parsedFieldSchema = parsedReportSchema.keyof();
export type ParsedField = z.infer<typeof parsedFieldSchema>;

/** `report.parse_confidence`: confidence per parsed field. */
export const parseConfidenceSchema = z.partialRecord(
  parsedFieldSchema,
  z.number().min(0).max(1),
);
export type ParseConfidence = z.infer<typeof parseConfidenceSchema>;

export function confidenceOf(report: ParsedReport): ParseConfidence {
  return Object.fromEntries(
    Object.entries(report).map(([field, { confidence }]) => [
      field,
      confidence,
    ]),
  );
}
