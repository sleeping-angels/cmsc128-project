import type { UserRole } from '@repo/shared';
import { queryOptions } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { authClient } from './auth-client';

/**
 * The signed-in session, or null. Route guards read it from the cache with
 * `revalidateIfStale`, so a revoked session or role change is picked up once
 * the cached copy is older than `staleTime`.
 */
export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: async () => {
    const { data, error } = await authClient.getSession();
    // Throw so a server error isn't mistaken for "signed out".
    if (error) throw error;
    return data;
  },
  staleTime: 60_000,
  // Guards fetch through ensureQueryData, which doesn't retry unless told to.
  retry: 2,
});

type Session = NonNullable<
  Awaited<ReturnType<typeof authClient.getSession>>['data']
>;

/**
 * Sends users without one of `roles` back to the dashboard home. Only hides
 * pages; the API's `@Roles` is what actually enforces access.
 */
export function requireRole(session: Session, roles: UserRole[]) {
  if (!roles.some((role) => role === session.user.role)) {
    throw redirect({ to: '/dashboard' });
  }
}
