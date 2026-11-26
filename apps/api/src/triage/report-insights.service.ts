import { Injectable } from '@nestjs/common';
import {
  type AttentionQueue,
  type AttentionReason,
  type AttentionReport,
  openReportStatusSchema,
  type ReportFeedItem,
  type ReportSummary,
  type ReportTrends,
  type ResponseTimes,
  type SeverityLevel,
  type TrendRange,
} from '@repo/shared';
import { TriageRepository } from './triage.repository.js';

const MINUTE_MS = 60 * 1000;

/** The Philippines is UTC+8 all year, with no daylight saving. */
const PHILIPPINE_OFFSET_MS = 8 * 60 * MINUTE_MS;

/** A pending report waiting longer than this needs review. */
export const REVIEW_WINDOW_MS = 30 * MINUTE_MS;

/** Below this parse confidence, a pending report's details need checking. */
export const UNSURE_CONFIDENCE = 0.5;

/** How many reports the attention queue returns. */
export const ATTENTION_LIMIT = 3;

/** The period response times cover, in days. */
export const RESPONSE_TIME_DAYS = 7;

/** How many barangays the trends list. */
export const TOP_BARANGAYS = 8;

const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Each range as a count of periods of a size: 24 hours, or N days. */
const TREND_PERIODS: Record<TrendRange, { size: number; count: number }> = {
  '24h': { size: HOUR_MS, count: 24 },
  '7d': { size: DAY_MS, count: 7 },
  '30d': { size: DAY_MS, count: 30 },
  '90d': { size: DAY_MS, count: 90 },
};

type SeverityCounts = Record<SeverityLevel | 'unrated', number>;

function emptySeverityCounts(): SeverityCounts {
  return { low: 0, moderate: 0, high: 0, critical: 0, unrated: 0 };
}

/** Counts per key, most first; ties keep alphabetical order. */
function rank(keys: (string | null)[]) {
  const counts = new Map<string | null, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts]
    .map(([key, count]) => ({ key, count }))
    .sort(
      (a, b) => b.count - a.count || (a.key ?? '').localeCompare(b.key ?? ''),
    );
}

/** Most urgent first; a report without a severity sits with moderate. */
const SEVERITY_RANK: Record<SeverityLevel | 'unrated', number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  unrated: 2,
  low: 3,
};

/** Midnight in the Philippines on the day `now` falls in there. */
export function startOfPhilippineDay(now: Date): Date {
  const local = new Date(now.getTime() + PHILIPPINE_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - PHILIPPINE_OFFSET_MS);
}

/** Why an open report needs a responder now; empty when it doesn't. */
export function attentionReasons(
  report: ReportFeedItem,
  now: Date,
): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  const pending = report.status === 'pending';

  if (
    (report.severity === 'critical' || report.severity === 'high') &&
    report.status !== 'dispatched'
  ) {
    reasons.push('urgent');
  }
  if (
    pending &&
    now.getTime() - report.createdAt.getTime() > REVIEW_WINDOW_MS
  ) {
    reasons.push('waiting');
  }
  if (!report.incidentType || !report.severity) {
    reasons.push('incomplete');
  }
  const confidences = Object.values(report.parseConfidence ?? {});
  if (pending && confidences.some((c) => c < UNSURE_CONFIDENCE)) {
    reasons.push('unsure');
  }
  return reasons;
}

/** The middle value, or the mean of the middle two; null when empty. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Report counts and queues for the dashboard home. */
@Injectable()
export class ReportInsightsService {
  constructor(private readonly repository: TriageRepository) {}

  /** Open report counts by status and severity, plus how many came in today. */
  async summarize(now = new Date()): Promise<ReportSummary> {
    const open = openReportStatusSchema.options;
    const [rows, newToday] = await Promise.all([
      this.repository.countByStatusAndSeverity(open),
      this.repository.countCreatedSince(startOfPhilippineDay(now)),
    ]);

    const summary: ReportSummary = {
      openByStatus: { pending: 0, validated: 0, dispatched: 0 },
      openBySeverity: { low: 0, moderate: 0, high: 0, critical: 0, unrated: 0 },
      newToday,
    };
    for (const row of rows) {
      const status = openReportStatusSchema.safeParse(row.status);
      if (!status.success) continue;
      summary.openByStatus[status.data] += row.count;
      summary.openBySeverity[row.severity ?? 'unrated'] += row.count;
    }
    return summary;
  }

  /** Open reports that need a responder: most severe first, then longest waiting. */
  async attention(now = new Date()): Promise<AttentionQueue> {
    const open = await this.repository.findFeedByStatus(
      openReportStatusSchema.options,
    );
    const flagged: AttentionReport[] = open
      .map((report) => ({ ...report, reasons: attentionReasons(report, now) }))
      .filter((report) => report.reasons.length > 0)
      .sort(
        (a, b) =>
          SEVERITY_RANK[a.severity ?? 'unrated'] -
            SEVERITY_RANK[b.severity ?? 'unrated'] ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      );
    return {
      total: flagged.length,
      reports: flagged.slice(0, ATTENTION_LIMIT),
    };
  }

  /**
   * Median minutes from report to validated, validated to dispatched, and
   * report to dispatched, for steps finished in the last week and the week
   * before. A step counts in the period it finished in.
   */
  async responseTimes(now = new Date()): Promise<ResponseTimes> {
    const period = RESPONSE_TIME_DAYS * 24 * 60 * MINUTE_MS;
    const changes = await this.repository.findStatusChanges(
      new Date(now.getTime() - 2 * period),
    );

    // When each report came in and first reached each status.
    const reports = new Map<
      string,
      { createdAt: Date; validated?: Date; dispatched?: Date }
    >();
    for (const change of changes) {
      const entry = reports.get(change.reportId) ?? {
        createdAt: change.reportCreatedAt,
      };
      if (change.status === 'validated') entry.validated ??= change.changedAt;
      if (change.status === 'dispatched') entry.dispatched ??= change.changedAt;
      reports.set(change.reportId, entry);
    }

    const steps = {
      toValidate: { current: [] as number[], previous: [] as number[] },
      toDispatch: { current: [] as number[], previous: [] as number[] },
      toHelp: { current: [] as number[], previous: [] as number[] },
    };
    const add = (step: keyof typeof steps, from?: Date, to?: Date) => {
      if (!from || !to) return;
      const age = now.getTime() - to.getTime();
      if (age < 0 || age >= 2 * period) return;
      const minutes = (to.getTime() - from.getTime()) / MINUTE_MS;
      steps[step][age < period ? 'current' : 'previous'].push(
        Math.max(0, minutes),
      );
    };
    for (const r of reports.values()) {
      add('toValidate', r.createdAt, r.validated);
      add('toDispatch', r.validated, r.dispatched);
      add('toHelp', r.createdAt, r.dispatched);
    }

    const summarize = (step: keyof typeof steps) => ({
      minutes: median(steps[step].current),
      previousMinutes: median(steps[step].previous),
    });
    return {
      days: RESPONSE_TIME_DAYS,
      toValidate: summarize('toValidate'),
      toDispatch: summarize('toDispatch'),
      toHelp: summarize('toHelp'),
    };
  }

  /**
   * Reports created in the range, except invalid ones: per hour (24h) or
   * Philippine day, and by severity, incident type and barangay.
   */
  async trends(range: TrendRange, now = new Date()): Promise<ReportTrends> {
    const { size, count } = TREND_PERIODS[range];
    // The current hour or day is the last period.
    const current =
      size === HOUR_MS
        ? Math.floor(now.getTime() / HOUR_MS) * HOUR_MS
        : startOfPhilippineDay(now).getTime();
    const since = current - (count - 1) * size;

    const rows = await this.repository.findForTrends(new Date(since));

    const overTime = Array.from({ length: count }, (_, i) => ({
      start: new Date(since + i * size),
      counts: emptySeverityCounts(),
    }));
    const bySeverity = emptySeverityCounts();
    for (const row of rows) {
      const severity = row.severity ?? 'unrated';
      bySeverity[severity] += 1;
      const period =
        overTime[Math.floor((row.createdAt.getTime() - since) / size)];
      if (period) period.counts[severity] += 1;
    }

    return {
      range,
      total: rows.length,
      overTime,
      bySeverity,
      byType: rank(rows.map((row) => row.incidentType?.code ?? null)).map(
        ({ key, count }) => ({
          incidentType:
            rows.find((row) => row.incidentType?.code === key)?.incidentType ??
            null,
          count,
        }),
      ),
      byBarangay: rank(
        rows.flatMap((row) => (row.barangay ? [row.barangay] : [])),
      )
        .slice(0, TOP_BARANGAYS)
        .map(({ key, count }) => ({ name: key!, count })),
    };
  }
}
