import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, respondWith } from '@/testing/render';
import { ReportStats } from './report-stats';

const summary = {
  openByStatus: { pending: 4, validated: 2, dispatched: 1 },
  openBySeverity: { low: 1, moderate: 2, high: 1, critical: 2, unrated: 1 },
  newToday: 3,
};

describe('ReportStats', () => {
  it('totals open reports and shows the day, pending and critical counts', async () => {
    respondWith(200, summary);
    renderWithProviders(<ReportStats />);
    expect(await screen.findByText('7')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('offers a retry when the counts fail', async () => {
    respondWith(500, {});
    renderWithProviders(<ReportStats />);
    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeDefined();
  });
});
