import type { Language } from '@repo/shared';
import { formatDistanceToNowStrict } from 'date-fns';

/** MDRRMO Miagao's time zone; show times of day and dates in it, whatever the browser's is. */
export const TIME_ZONE = 'Asia/Manila';

/** Language names; ISO codes don't title-case into them. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  hil: 'Hiligaynon',
  krj: 'Kinaray-a',
  tgl: 'Tagalog',
  eng: 'English',
};

/** "storm_surge" → "Storm surge" */
export function label(value: string) {
  const text = value.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Santillan Street, Mat-y": the place, then its barangay; null when neither is known. */
export function formatLocation(
  locationText: string | null,
  barangay: string | null | undefined,
) {
  // Skip the barangay when the text already names it ("Baybay Sur" in Baybay Sur).
  const named =
    barangay && locationText?.toLowerCase().includes(barangay.toLowerCase());
  return [locationText, !named && barangay].filter(Boolean).join(', ') || null;
}

/**
 * A `tel:` href for a number as displayed: "(033) 000-0101" dials as
 * `tel:0330000101`, and a leading "+" is kept for international numbers.
 */
export function toTelHref(number: string) {
  const trimmed = number.trim();
  const prefix = trimmed.startsWith('+') ? '+' : '';
  return `tel:${prefix}${trimmed.replace(/\D/g, '')}`;
}

/** "5 minutes ago", "3 days ago". */
export function formatTimeAgo(date: Date) {
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/** "Oct 29, 2026, 4:30 PM" in Philippine format. */
export function formatTime(date: Date) {
  return date.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** "Good morning", "Good afternoon" or "Good evening" for the hour in the Philippines. */
export function greeting(now: Date) {
  const hour = Number(
    now.toLocaleString('en-PH', {
      timeZone: TIME_ZONE,
      hour: 'numeric',
      hourCycle: 'h23',
    }),
  );
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}
