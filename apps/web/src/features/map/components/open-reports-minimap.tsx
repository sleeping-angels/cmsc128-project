import { openReportStatusSchema, type ReportStatus } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { LngLatBounds } from 'maplibre-gl';
import { ArrowRight } from 'lucide-react';
import { cn } from 'cn';
import { useEffect } from 'react';
import { Map as AppMap } from '@/components/map';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MapControls, useMap } from '@/components/ui/map';
import { reportQueries } from '@/features/triage';
import { ReportPins } from './report-pins';
import { SeverityLegend } from './severity-legend';

const OPEN: readonly ReportStatus[] = openReportStatusSchema.options;

/** A small map of open reports for the dashboard home, linking to the full map. */
export function OpenReportsMinimap({ className }: { className?: string }) {
  const { data, isError, refetch } = useQuery(reportQueries.feed());
  const open = (data ?? []).filter((report) => OPEN.includes(report.status));
  const unplaced = open.filter((report) => !report.location).length;

  return (
    <Card className={cn('gap-3 pb-0', className)}>
      <CardHeader>
        <CardTitle>Where reports are</CardTitle>
        <CardDescription>
          {data
            ? `${open.length - unplaced} open ${open.length - unplaced === 1 ? 'report' : 'reports'} on the map` +
              (unplaced ? `, ${unplaced} without a location` : '')
            : 'Open reports'}
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to="/dashboard/map" />}
          >
            Full map
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="relative h-64 overflow-hidden px-0 xl:h-auto xl:min-h-64 xl:flex-1">
        {/* Scroll zoom stays off so scrolling the page never gets stuck on the map. */}
        <AppMap
          className="size-full"
          scrollZoom={false}
          // Credits sit under the map instead, so they never cover the pins or legend.
          attributionControl={false}
        >
          <ReportPins reports={open} />
          <FitToPins
            points={open.flatMap((r) => (r.location ? [r.location] : []))}
          />
          <MapControls />
        </AppMap>
        <SeverityLegend inline className="absolute bottom-2 left-2" />
        {isError && (
          <div
            role="alert"
            className="absolute inset-x-2 top-2 flex items-center justify-between gap-2 rounded-md border bg-background py-1 pr-1 pl-3 text-sm shadow-sm"
          >
            Couldn't load reports.
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}
      </CardContent>
      <p className="-mt-1 px-4 pb-2 text-[10px] text-muted-foreground">
        Map © OpenFreeMap, OpenMapTiles, OpenStreetMap contributors
      </p>
    </Card>
  );
}

/** Frames every pin once the map is ready, and again when the pins change. */
function FitToPins({ points }: { points: { lng: number; lat: number }[] }) {
  const { map, isLoaded } = useMap();
  // A string key, so a refetch with the same pins doesn't move the map.
  const key = points.map((p) => `${p.lng},${p.lat}`).join(';');
  useEffect(() => {
    if (!map || !isLoaded || !points.length) return;
    const bounds = new LngLatBounds();
    for (const point of points) bounds.extend([point.lng, point.lat]);
    map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `points`.
  }, [map, isLoaded, key]);
  return null;
}
