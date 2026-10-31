import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { requireRole } from './session';

function sessionWithRole(role: string) {
  return { user: { role } } as Parameters<typeof requireRole>[0];
}

describe('requireRole', () => {
  it('redirects users without the role', () => {
    let thrown: unknown;
    try {
      requireRole(sessionWithRole('responder'), ['admin']);
    } catch (error) {
      thrown = error;
    }
    expect(isRedirect(thrown)).toBe(true);
  });

  it('lets users with the role through', () => {
    expect(() =>
      requireRole(sessionWithRole('admin'), ['admin']),
    ).not.toThrow();
  });
});
