import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, respondWith } from '@/testing/render';
import { OpenReportCharts } from './open-report-charts';

describe('OpenReportCharts', () => {
  it('says there are no open reports instead of drawing empty charts', async () => {
    respondWith(200, {
      openByStatus: { pending: 0, validated: 0, dispatched: 0 },
      openBySeverity: { low: 0, moderate: 0, high: 0, critical: 0, unrated: 0 },
      newToday: 2,
    });
    renderWithProviders(<OpenReportCharts />);
    expect(await screen.findAllByText('No open reports')).toHaveLength(2);
  });
});
