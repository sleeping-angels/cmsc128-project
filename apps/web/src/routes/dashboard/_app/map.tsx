import { createFileRoute } from '@tanstack/react-router';
import { IncidentsMap } from '@/components/incidents-map';

/* The sitemap's /map, under the dashboard's sign-in guard. */
export const Route = createFileRoute('/dashboard/_app/map')({
  component: IncidentsMap,
});
