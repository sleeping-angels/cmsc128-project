import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, respondWith } from '@/testing/render';
import { ReportTrends } from './report-trends';

const zero = { low: 0, moderate: 0, high: 0, critical: 0, unrated: 0 };

function trends(total: number) {
  return {
    range: '7d',
    total,
    overTime: [{ start: '2026-10-29T16:00:00.000Z', counts: zero }],
    bySeverity: zero,
    byType: [],
    byBarangay: [],
  };
}

describe('ReportTrends', () => {
  it('says how many reports the range holds', async () => {
    respondWith(200, trends(12));
    renderWithProviders(<ReportTrends range="7d" onRangeChange={() => {}} />);
    expect(
      await screen.findByText(/12 reports in the last 7 days/),
    ).toBeDefined();
  });

  it('says when the range has no reports', async () => {
    respondWith(200, trends(0));
    renderWithProviders(<ReportTrends range="7d" onRangeChange={() => {}} />);
    expect(
      await screen.findAllByText('No reports in this period'),
    ).toHaveLength(4);
  });

  it('asks for another range when one is picked', async () => {
    respondWith(200, trends(0));
    const onRangeChange = vi.fn();
    renderWithProviders(
      <ReportTrends range="7d" onRangeChange={onRangeChange} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: '30 days' }));
    expect(onRangeChange).toHaveBeenCalledWith('30d');
  });

  it('offers a retry when trends fail', async () => {
    respondWith(500, {});
    renderWithProviders(<ReportTrends range="7d" onRangeChange={() => {}} />);
    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeDefined();
  });
});
