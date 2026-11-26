import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import { ReportQueue } from './report-queue';

let nextId = 0;

function item(name: string, overrides: Record<string, unknown> = {}) {
  const id = `0b9a3f4e-8c1d-4e2a-9f6b-${String(nextId++).padStart(12, '0')}`;
  const at = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  return {
    id,
    status: 'pending',
    isProxy: false,
    incidentType: { id, code: 'flood', name },
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
    ...overrides,
  };
}

/** Answers the attention queue and the feed by path. */
function respond(attention: unknown, feed: unknown[] = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(url.includes('/attention') ? attention : feed),
          { status: 200 },
        ),
      ),
    ),
  );
}

describe('ReportQueue', () => {
  it('lists reports needing attention with their reasons, each opening its quick view', async () => {
    const urgent = item('Fire', { reasons: ['urgent', 'waiting'] });
    respond({ total: 1, reports: [urgent] });
    renderWithProviders(<ReportQueue />);

    expect(await screen.findByText('Serious, help not sent yet')).toBeDefined();
    expect(screen.getByText('Waiting over 30 min for review')).toBeDefined();
    expect(
      screen.getByRole('link', { name: /Fire/ }).getAttribute('href'),
    ).toBe(`/dashboard/incidents?report=${urgent.id}`);
  });

  it('says how many more need attention than it shows', async () => {
    respond({
      total: 12,
      reports: [item('Fire', { reasons: ['urgent'] })],
    });
    renderWithProviders(<ReportQueue />);
    expect(
      await screen.findByText('Showing the 1 most urgent of 12.'),
    ).toBeDefined();
  });

  it('says all is caught up when nothing needs attention', async () => {
    respond({ total: 0, reports: [] });
    renderWithProviders(<ReportQueue />);
    expect(await screen.findByText('All caught up')).toBeDefined();
  });

  it('lists the latest reports on the Latest tab, marking new ones', async () => {
    respond({ total: 0, reports: [] }, [
      item('Landslide', { createdAt: new Date().toISOString() }),
      item('Flood'),
    ]);
    renderWithProviders(<ReportQueue />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Latest' }));

    expect(
      await screen.findByRole('link', { name: /Landslide/ }),
    ).toBeDefined();
    expect(screen.getByRole('link', { name: /Flood/ })).toBeDefined();
    expect(screen.getAllByText('New')).toHaveLength(1);
  });

  it('offers a retry when the queue fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 500 })),
    );
    renderWithProviders(<ReportQueue />);
    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeDefined();
  });
});
