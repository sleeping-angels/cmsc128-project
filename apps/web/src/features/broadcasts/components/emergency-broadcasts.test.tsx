import { QueryClient } from '@tanstack/react-query';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/testing/render';
import { broadcastQueries } from '../queries';
import { EmergencyBroadcasts } from './emergency-broadcasts';

/* MapLibre can't draw in jsdom. */
vi.mock('@/components/map', () => ({ Map: () => null }));

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(broadcastQueries.recentAdvisories().queryKey, [
    {
      id: '0b9a3f4e-8c1d-4e2a-9f6b-1c2d3e4f5a6b',
      kind: 'advisory',
      messageBody:
        'Residents in high-risk zones are advised to prepare for possible evacuation.',
      sentAt: new Date('2026-09-03T06:09:00.000Z'),
      createdBy: { id: 'responder-1', name: 'Another Lloyd Magana' },
      deliveries: { queued: 0, sent: 0, failed: 0, outside_window: 0 },
    },
    {
      id: '1b9a3f4e-8c1d-4e2a-9f6b-1c2d3e4f5a6b',
      kind: 'advisory',
      messageBody:
        'Road monitoring in progress. Expect rerouting along main thoroughfares.',
      sentAt: new Date('2026-04-04T04:58:00.000Z'),
      createdBy: { id: 'responder-2', name: 'Response team assigned' },
      deliveries: { queued: 0, sent: 0, failed: 0, outside_window: 0 },
    },
  ]);

  return renderWithProviders(<EmergencyBroadcasts />, { queryClient });
}

describe('EmergencyBroadcasts', () => {
  it('lists recent advisories', async () => {
    renderWorkspace();

    expect(
      await screen.findByText(/Residents in high-risk zones/),
    ).toBeDefined();
    expect(screen.getByText(/Road monitoring in progress/)).toBeDefined();
  });

  it('filters recent advisories', async () => {
    renderWorkspace();
    await screen.findByText(/Residents in high-risk zones/);

    fireEvent.change(screen.getByLabelText('Filter recent advisories'), {
      target: { value: 'Road monitoring' },
    });

    expect(screen.getByText(/Road monitoring in progress/)).toBeDefined();
    expect(screen.queryByText(/Residents in high-risk zones/)).toBeNull();
  });

  it('fills the title and message from a quick template', async () => {
    renderWorkspace();
    await screen.findByText(/Residents in high-risk zones/);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Immediate Evacuation Order',
      }),
    );

    const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
    expect(titleInput.value).toBe('Immediate Evacuation Order');
    const messageInput = screen.getByLabelText(
      'Message',
    ) as HTMLTextAreaElement;
    expect(messageInput.value).toMatch(/^Evacuate now/);
  });
});
