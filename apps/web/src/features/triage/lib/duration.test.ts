import { describe, expect, it } from 'vitest';
import { formatMinutes } from './duration';

describe('formatMinutes', () => {
  it.each([
    [0.4, 'Under 1 min'],
    [5, '5 min'],
    [59.6, '1 hr'],
    [65, '1 hr 5 min'],
    [120, '2 hr'],
    [24 * 60, '1 day'],
    [2 * 24 * 60 + 3 * 60 + 20, '2 days 3 hr'],
  ])('formats %s minutes as "%s"', (minutes, text) => {
    expect(formatMinutes(minutes)).toBe(text);
  });
});
