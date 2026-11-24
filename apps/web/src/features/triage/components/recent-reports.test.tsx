import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, respondWith } from '@/testing/render';
import { RecentReports } from './recent-reports';

const at = '2026-10-29T08:30:00.000Z';

function item(n: number) {
  const id = `0b9a3f4e-8c1d-4e2a-9f6b-1c2d3e4f5a6${n}`;
  return {
    id,
    status: 'pending',
    isProxy: false,
    incidentType: { id, code: 'flood', name: `Flood ${n}` },
    severity: 'high',
    barangay: { id, name: 'Tacas' },
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
    createdAt: at,
    updatedAt: at,
  };
}

describe('RecentReports', () => {
  it('lists the five newest reports, each opening its quick view', async () => {
    respondWith(200, [1, 2, 3, 4, 5, 6].map(item));
    renderWithProviders(<RecentReports />);
    const first = await screen.findByRole('link', { name: /Flood 1/ });
    expect(first.getAttribute('href')).toBe(
      `/dashboard/incidents?report=${item(1).id}`,
    );
    expect(screen.getByRole('link', { name: /Flood 5/ })).toBeDefined();
    expect(screen.queryByRole('link', { name: /Flood 6/ })).toBeNull();
  });

  it('says when there are no reports', async () => {
    respondWith(200, []);
    renderWithProviders(<RecentReports />);
    expect(await screen.findByText('No reports yet')).toBeDefined();
  });
});
