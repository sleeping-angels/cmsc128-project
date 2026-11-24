import type { ReportFeedItem } from '@repo/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  attentionReasons,
  median,
  ReportInsightsService,
  startOfPhilippineDay,
} from './report-insights.service.js';
import type { TriageRepository } from './triage.repository.js';

vi.mock('../config/env.js', () => ({ env: {} }));

const now = new Date('2026-10-29T08:00:00.000Z');
const minutesAgo = (n: number) => new Date(now.getTime() - n * 60 * 1000);

const flood = { id: 'type-1', code: 'flood', name: 'Flood' };

function report(overrides: Partial<ReportFeedItem> = {}): ReportFeedItem {
  return {
    id: crypto.randomUUID(),
    status: 'pending',
    isProxy: false,
    incidentType: flood,
    severity: 'moderate',
    barangay: null,
    locationText: null,
    location: null,
    incidentAt: null,
    sourceChannel: 'messenger',
    parsedAutomatically: false,
    parseConfidence: null,
    resident: null,
    creator: null,
    victimCount: 0,
    firstMessage: null,
    createdAt: minutesAgo(5),
    updatedAt: minutesAgo(5),
    ...overrides,
  };
}

function service(repository: Partial<Record<keyof TriageRepository, unknown>>) {
  return new ReportInsightsService(repository as unknown as TriageRepository);
}

describe('startOfPhilippineDay', () => {
  it.each([
    // 07:59 UTC is 15:59 in Manila: same day.
    ['2026-10-29T07:59:00.000Z', '2026-10-28T16:00:00.000Z'],
    // 16:00 UTC is midnight the next day in Manila.
    ['2026-10-29T16:00:00.000Z', '2026-10-29T16:00:00.000Z'],
    // 15:59 UTC is still 23:59 the same day.
    ['2026-10-29T15:59:00.000Z', '2026-10-28T16:00:00.000Z'],
  ])('maps %s to %s', (at, start) => {
    expect(startOfPhilippineDay(new Date(at)).toISOString()).toBe(start);
  });
});

describe('ReportInsightsService.summarize', () => {
  it('totals open reports by status and severity, with unrated ones apart', async () => {
    const insights = service({
      countByStatusAndSeverity: vi.fn().mockResolvedValue([
        { status: 'pending', severity: null, count: 2 },
        { status: 'pending', severity: 'high', count: 1 },
        { status: 'dispatched', severity: 'high', count: 3 },
      ]),
      countCreatedSince: vi.fn().mockResolvedValue(4),
    });

    expect(await insights.summarize()).toEqual({
      openByStatus: { pending: 3, validated: 0, dispatched: 3 },
      openBySeverity: { low: 0, moderate: 0, high: 4, critical: 0, unrated: 2 },
      newToday: 4,
    });
  });

  it('counts only open statuses and new reports since Philippine midnight', async () => {
    const repository = {
      countByStatusAndSeverity: vi.fn().mockResolvedValue([]),
      countCreatedSince: vi.fn().mockResolvedValue(0),
    };
    await service(repository).summarize(new Date('2026-10-29T17:00:00.000Z'));

    expect(repository.countByStatusAndSeverity).toHaveBeenCalledWith([
      'pending',
      'validated',
      'dispatched',
    ]);
    expect(repository.countCreatedSince).toHaveBeenCalledWith(
      new Date('2026-10-29T16:00:00.000Z'),
    );
  });
});

describe('attentionReasons', () => {
  it.each<[string, Partial<ReportFeedItem>, string[]]>([
    ['a fresh, complete moderate report', {}, []],
    [
      'a critical report not yet dispatched',
      { severity: 'critical', status: 'validated' },
      ['urgent'],
    ],
    [
      'a high report already dispatched',
      { severity: 'high', status: 'dispatched' },
      [],
    ],
    [
      'a report pending over 30 minutes',
      { createdAt: minutesAgo(31) },
      ['waiting'],
    ],
    [
      'a validated report over 30 minutes old',
      { status: 'validated', createdAt: minutesAgo(90) },
      [],
    ],
    ['a report without a type', { incidentType: null }, ['incomplete']],
    ['a report without a severity', { severity: null }, ['incomplete']],
    [
      'a pending report the bot was unsure of',
      { parseConfidence: { severity: 0.4 } },
      ['unsure'],
    ],
    [
      'a validated report the bot was unsure of',
      { status: 'validated', parseConfidence: { severity: 0.4 } },
      [],
    ],
  ])('flags %s', (_, overrides, reasons) => {
    expect(attentionReasons(report(overrides), now)).toEqual(reasons);
  });
});

describe('ReportInsightsService.attention', () => {
  it('lists flagged reports most severe first, then oldest first', async () => {
    const oldHigh = report({ severity: 'high', createdAt: minutesAgo(20) });
    const newHigh = report({ severity: 'high', createdAt: minutesAgo(2) });
    const critical = report({
      severity: 'critical',
      createdAt: minutesAgo(40),
    });
    const fine = report();
    const insights = service({
      findFeedByStatus: vi
        .fn()
        .mockResolvedValue([newHigh, fine, oldHigh, critical]),
    });

    const queue = await insights.attention(now);

    expect(queue.total).toBe(3);
    expect(queue.reports.map((r) => r.id)).toEqual([
      critical.id,
      oldHigh.id,
      newHigh.id,
    ]);
    expect(queue.reports[0]!.reasons).toEqual(['urgent', 'waiting']);
  });

  it('returns at most three reports but counts them all', async () => {
    const insights = service({
      findFeedByStatus: vi
        .fn()
        .mockResolvedValue(
          Array.from({ length: 10 }, () => report({ severity: 'critical' })),
        ),
    });

    const queue = await insights.attention(now);

    expect(queue.total).toBe(10);
    expect(queue.reports).toHaveLength(3);
  });
});

describe('median', () => {
  it.each([
    [[], null],
    [[5], 5],
    [[9, 1, 5], 5],
    [[4, 1, 3, 2], 2.5],
  ])('of %j is %s', (values, expected) => {
    expect(median(values)).toBe(expected);
  });
});

describe('ReportInsightsService.responseTimes', () => {
  const daysAgo = (n: number) => minutesAgo(n * 24 * 60);
  const change = (
    reportId: string,
    reportCreatedAt: Date,
    status: string,
    changedAt: Date,
  ) => ({ reportId, reportCreatedAt, status, changedAt });

  it('takes medians per step, split by the week each step finished in', async () => {
    const thisWeek = daysAgo(1);
    const lastWeek = daysAgo(10);
    const plus = (at: Date, minutes: number) =>
      new Date(at.getTime() + minutes * 60 * 1000);
    const repository = {
      findStatusChanges: vi.fn().mockResolvedValue([
        // Validated in 10 min, dispatched 20 min later, both this week.
        change('a', thisWeek, 'validated', plus(thisWeek, 10)),
        change('a', thisWeek, 'dispatched', plus(thisWeek, 30)),
        // Validated in 30 min this week, not dispatched yet.
        change('b', thisWeek, 'validated', plus(thisWeek, 30)),
        // Validated in 60 min last week.
        change('c', lastWeek, 'validated', plus(lastWeek, 60)),
      ]),
    };

    const times = await service(repository).responseTimes(now);

    expect(repository.findStatusChanges).toHaveBeenCalledWith(daysAgo(14));
    expect(times).toEqual({
      days: 7,
      toValidate: { minutes: 20, previousMinutes: 60 },
      toDispatch: { minutes: 20, previousMinutes: null },
      toHelp: { minutes: 30, previousMinutes: null },
    });
  });

  it('skips a dispatch with no validation before it', async () => {
    const at = daysAgo(1);
    const times = await service({
      findStatusChanges: vi
        .fn()
        .mockResolvedValue([change('a', at, 'dispatched', minutesAgo(60))]),
    }).responseTimes(now);

    expect(times.toDispatch.minutes).toBeNull();
    expect(times.toHelp.minutes).not.toBeNull();
  });
});
