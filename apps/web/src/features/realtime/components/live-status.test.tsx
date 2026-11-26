import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveStatus } from './live-status';

const { connected } = vi.hoisted(() => ({ connected: { value: true } }));
vi.mock('../hooks/use-realtime', () => ({
  useRealtimeConnected: () => connected.value,
}));

describe('LiveStatus', () => {
  it('says the page is live while connected', () => {
    connected.value = true;
    render(<LiveStatus />);
    expect(screen.getByRole('status').textContent).toBe('Live');
  });

  it('warns while reconnecting', () => {
    connected.value = false;
    render(<LiveStatus />);
    expect(screen.getByRole('status').textContent).toBe(
      'Offline, reconnecting…',
    );
  });
});
