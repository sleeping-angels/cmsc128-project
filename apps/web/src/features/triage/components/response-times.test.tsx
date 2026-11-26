import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, respondWith } from '@/testing/render';
import { ResponseTimes } from './response-times';

describe('ResponseTimes', () => {
  it('shows each step with its change from last week', async () => {
    respondWith(200, {
      days: 7,
      toValidate: { minutes: 5, previousMinutes: 8 },
      toDispatch: { minutes: 30, previousMinutes: 20 },
      toHelp: { minutes: 35, previousMinutes: null },
    });
    renderWithProviders(<ResponseTimes />);
    expect(await screen.findByText('5 min')).toBeDefined();
    expect(screen.getByText(/3 min faster than last week/)).toBeDefined();
    expect(screen.getByText(/10 min slower than last week/)).toBeDefined();
    expect(screen.getByText('35 min')).toBeDefined();
  });

  it('explains when there are no times yet', async () => {
    const none = { minutes: null, previousMinutes: null };
    respondWith(200, {
      days: 7,
      toValidate: none,
      toDispatch: none,
      toHelp: none,
    });
    renderWithProviders(<ResponseTimes />);
    expect(await screen.findByText('No responses yet')).toBeDefined();
  });
});
