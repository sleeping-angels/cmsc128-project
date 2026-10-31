import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginForm } from '@/components/login-form';
import { sessionQuery } from '@/lib/session';

/** Only same-site paths, so `?redirect=` can't send users to another site. */
function safePath(value: unknown) {
  return typeof value === 'string' && /^\/(?!\/)/.test(value)
    ? value
    : undefined;
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
