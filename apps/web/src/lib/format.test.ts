import { describe, expect, it } from 'vitest';
import { formatLocation, greeting, toTelHref } from './format';

describe('formatLocation', () => {
  it.each([
    ['Santillan Street', 'Mat-y', 'Santillan Street, Mat-y'],
    ['Baybay Sur', 'Baybay Sur', 'Baybay Sur'],
    ['Near the Tacas chapel', 'Tacas', 'Near the Tacas chapel'],
    [null, 'Tacas', 'Tacas'],
    ['Santillan Street', null, 'Santillan Street'],
    [null, undefined, null],
  ])('formats %s in %s as %s', (text, barangay, expected) => {
    expect(formatLocation(text, barangay)).toBe(expected);
  });
});

describe('toTelHref', () => {
  it.each([
    ['(033) 000-0101', 'tel:0330000101'],
    ['911', 'tel:911'],
    ['+63 917 123 4567', 'tel:+639171234567'],
    [' 0917-123-4567 ', 'tel:09171234567'],
  ])('dials %s as %s', (number, expected) => {
    expect(toTelHref(number)).toBe(expected);
  });
});

describe('greeting', () => {
  it.each([
    // Philippine time is UTC+8.
    ['2026-10-28T21:00:00.000Z', 'Good morning'], // 5 AM
    ['2026-10-29T03:59:00.000Z', 'Good morning'], // 11:59 AM
    ['2026-10-29T04:00:00.000Z', 'Good afternoon'], // noon
    ['2026-10-29T10:00:00.000Z', 'Good evening'], // 6 PM
    ['2026-10-28T20:59:00.000Z', 'Good evening'], // 4:59 AM
  ])('greets at %s with "%s"', (at, text) => {
    expect(greeting(new Date(at))).toBe(text);
  });
});
