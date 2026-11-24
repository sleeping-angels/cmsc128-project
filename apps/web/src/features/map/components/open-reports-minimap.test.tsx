import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, respondWith } from '@/testing/render';
import { OpenReportsMinimap } from './open-reports-minimap';

/* A fake map: each marker renders as a pin. */
vi.mock('@/components/map', () => ({
  Map: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/map', () => ({
  MapMarker: () => <span data-testid="pin" />,
  MarkerContent: () => null,
  MarkerPopup: () => null,
  MapControls: () => null,
  useMap: () => ({ map: null, isLoaded: false }),
}));

let nextId = 0;
const at = '2026-10-29T08:30:00.000Z';

function item(status: string, located = true) {
  const id = `0b9a3f4e-8c1d-4e2a-9f6b-${String(nextId++).padStart(12, '0')}`;
  return {
    id,
    status,
    isProxy: false,
    incidentType: null,
    severity: 'high',
    barangay: null,
    locationText: null,
    location: located ? { lng: 122.2, lat: 10.6 } : null,
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

describe('OpenReportsMinimap', () => {
  it('pins located open reports and counts the ones without a location', async () => {
    respondWith(200, [
      item('pending'),
      item('dispatched'),
      item('validated', false),
      item('resolved'),
    ]);
    renderWithProviders(<OpenReportsMinimap />);
    expect(
      await screen.findByText(
        '2 open reports on the map, 1 without a location',
      ),
    ).toBeDefined();
    expect(screen.getAllByTestId('pin')).toHaveLength(2);
  });

  it('offers a retry when reports fail to load', async () => {
    respondWith(500, {});
    renderWithProviders(<OpenReportsMinimap />);
    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeDefined();
  });
});
