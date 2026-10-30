import { createFileRoute } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/dashboard-layout';

export const Route = createFileRoute('/dashboard/_app')({
  component: DashboardLayout,
});
