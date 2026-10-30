import { createFileRoute } from '@tanstack/react-router';
import { DashboardHome } from '@/components/dashboard-home';

export const Route = createFileRoute('/dashboard/_app/')({
  component: DashboardHome,
});
