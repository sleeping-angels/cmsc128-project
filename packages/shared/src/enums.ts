import { z } from 'zod';

export const hazardTypeSchema = z.enum([
  'flood',
  'landslide',
  'storm_surge',
  'earthquake',
  'fire',
]);
export type HazardType = z.infer<typeof hazardTypeSchema>;

export const sexSchema = z.enum(['male', 'female']);
export type Sex = z.infer<typeof sexSchema>;

/** ISO 639-3 codes: Hiligaynon, Kinaray-a, Tagalog, English. */
export const languageSchema = z.enum(['hil', 'krj', 'tgl', 'eng']);
export type Language = z.infer<typeof languageSchema>;

export const sourceChannelSchema = z.enum(['messenger', 'web', 'dashboard']);
export type SourceChannel = z.infer<typeof sourceChannelSchema>;

export const reportStatusSchema = z.enum([
  'pending',
  'validated',
  'dispatched',
  'resolved',
  'closed',
  'invalid',
]);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const severityLevelSchema = z.enum([
  'low',
  'moderate',
  'high',
  'critical',
]);
export type SeverityLevel = z.infer<typeof severityLevelSchema>;

export const directionSchema = z.enum(['inbound', 'outbound']);
export type Direction = z.infer<typeof directionSchema>;

export const broadcastKindSchema = z.enum(['advisory', 'survey']);
export type BroadcastKind = z.infer<typeof broadcastKindSchema>;

export const deliveryStatusSchema = z.enum([
  'queued',
  'sent',
  'failed',
  'outside_window',
]);
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

export const userRoleSchema = z.enum(['admin', 'responder']);
export type UserRole = z.infer<typeof userRoleSchema>;
