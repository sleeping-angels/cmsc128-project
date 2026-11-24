import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, respondWith } from '@/testing/render';
import { RecentBroadcasts } from './recent-broadcasts';

const id = '0b9a3f4e-8c1d-4e2a-9f6b-1c2d3e4f5a6b';

const advisory = {
  id,
  kind: 'advisory',
  messageBody: 'Prepare for possible evacuation.',
  sentAt: '2026-10-29T08:30:00.000Z',
  createdBy: { id: 'responder-1', name: 'Maria Santos' },
  deliveries: { queued: 0, sent: 12, failed: 2, outside_window: 3 },
};

describe('RecentBroadcasts', () => {
  it('shows nonzero delivery counts and links each advisory to its page', async () => {
    respondWith(200, [advisory]);
    renderWithProviders(<RecentBroadcasts />);
    expect(
      await screen.findByText('12 sent · 2 failed · 3 outside window'),
    ).toBeDefined();
    expect(
      screen
        .getByRole('link', { name: /Prepare for possible evacuation/ })
        .getAttribute('href'),
    ).toBe(`/dashboard/broadcasts/${id}`);
  });

  it('says when an advisory reached no one', async () => {
    respondWith(200, [
      {
        ...advisory,
        deliveries: { queued: 0, sent: 0, failed: 0, outside_window: 0 },
      },
    ]);
    renderWithProviders(<RecentBroadcasts />);
    expect(await screen.findByText('No recipients')).toBeDefined();
  });

  it('says when no advisories were sent', async () => {
    respondWith(200, []);
    renderWithProviders(<RecentBroadcasts />);
    expect(await screen.findByText('No broadcasts yet')).toBeDefined();
  });
});
