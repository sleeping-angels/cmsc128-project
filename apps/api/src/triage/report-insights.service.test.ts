import type { ReportFeedItem } from '@repo/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  attentionReasons,
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
