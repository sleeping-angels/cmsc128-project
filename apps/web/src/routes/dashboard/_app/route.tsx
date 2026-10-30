import { createFileRoute, redirect } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/dashboard-layout';
import { sessionQuery } from '@/lib/session';

export const Route = createFileRoute('/dashboard/_app')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    return { session };
  },
  component: DashboardLayout,
});
