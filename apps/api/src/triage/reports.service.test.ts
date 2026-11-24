import { describe, expect, it, vi } from 'vitest';
import { ReportsService, startOfPhilippineDay } from './reports.service.js';
import type { TriageRepository } from './triage.repository.js';

vi.mock('../config/env.js', () => ({ env: {} }));

function service(
  rows: Awaited<ReturnType<TriageRepository['countByStatusAndSeverity']>>,
  newToday = 0,
) {
  const repository = {
    countByStatusAndSeverity: vi.fn().mockResolvedValue(rows),
    countCreatedSince: vi.fn().mockResolvedValue(newToday),
  };
  return {
    reports: new ReportsService(repository as unknown as TriageRepository),
    repository,
  };
}

describe('startOfPhilippineDay', () => {
  it.each([
    // 07:59 UTC is 15:59 in Manila: same day.
    ['2026-10-29T07:59:00.000Z', '2026-10-28T16:00:00.000Z'],
    // 16:00 UTC is midnight the next day in Manila.
    ['2026-10-29T16:00:00.000Z', '2026-10-29T16:00:00.000Z'],
    // 15:59 UTC is still 23:59 the same day.
    ['2026-10-29T15:59:00.000Z', '2026-10-28T16:00:00.000Z'],
  ])('maps %s to %s', (now, start) => {
    expect(startOfPhilippineDay(new Date(now)).toISOString()).toBe(start);
  });
});

describe('ReportsService.summarize', () => {
  it('totals open reports by status and severity, with unrated ones apart', async () => {
    const { reports } = service(
      [
        { status: 'pending', severity: null, count: 2 },
        { status: 'pending', severity: 'high', count: 1 },
        { status: 'dispatched', severity: 'high', count: 3 },
      ],
      4,
    );

    expect(await reports.summarize()).toEqual({
      openByStatus: { pending: 3, validated: 0, dispatched: 3 },
      openBySeverity: { low: 0, moderate: 0, high: 4, critical: 0, unrated: 2 },
      newToday: 4,
    });
  });

  it('counts only open statuses and new reports since Philippine midnight', async () => {
    const { reports, repository } = service([]);
    await reports.summarize(new Date('2026-10-29T17:00:00.000Z'));

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
