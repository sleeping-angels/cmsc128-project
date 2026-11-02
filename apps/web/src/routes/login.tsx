import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginForm } from '@/components/login-form';
import { sessionQuery } from '@/lib/session';

/**
 * Only same-site paths, so `?redirect=` can't send users to another site.
 * Parses like the browser does, so tricks like `/\evil.site` are caught.
 */
function safePath(value: unknown) {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin
      ? url.pathname + url.search + url.hash
      : undefined;
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute('/login')({
  validateSearch: (search): { redirect?: string } => ({
    redirect: safePath(search.redirect),
  }),
  beforeLoad: async ({ context, search }) => {
    if (await context.queryClient.ensureQueryData(sessionQuery)) {
      throw redirect({ href: search.redirect ?? '/dashboard' });
    }
  },
  component: LoginForm,
});
