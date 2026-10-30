import { createFileRoute } from '@tanstack/react-router';
import { ResidentLayout } from '@/components/resident-layout';

export const Route = createFileRoute('/_resident')({
  component: ResidentLayout,
});
