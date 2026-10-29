import {
  directionSchema,
  hazardTypeSchema,
  languageSchema,
  reportStatusSchema,
  severityLevelSchema,
  sexSchema,
  sourceChannelSchema,
} from '@repo/shared';
import { pgEnum } from 'drizzle-orm/pg-core';

/** Zod 4 types `options` as an array; pgEnum needs a non-empty tuple. */
const values = <T extends string>(schema: { options: T[] }) =>
  schema.options as [T, ...T[]];

export const hazardType = pgEnum('hazard_type', values(hazardTypeSchema));
export const sex = pgEnum('sex', values(sexSchema));
export const language = pgEnum('language', values(languageSchema));
export const sourceChannel = pgEnum(
  'source_channel',
  values(sourceChannelSchema),
);
export const reportStatus = pgEnum('report_status', values(reportStatusSchema));
export const severityLevel = pgEnum(
  'severity_level',
  values(severityLevelSchema),
);
export const direction = pgEnum('direction', values(directionSchema));
