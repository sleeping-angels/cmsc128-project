import {
  type ReportFeedItem,
  type ReportStatus,
  reportStatusSchema,
  type SeverityLevel,
} from '@repo/shared';
import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { reportFeedQuery } from '@/lib/reports';

/* Ship MapLibre's worker with Vite; without it the map is blank. */
maplibregl.setWorkerUrl(workerUrl);

/* OpenFreeMap base map, centered on Miagao. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const MIAGAO_CENTER: [number, number] = [122.24, 10.7]; // [lng, lat]
const START_ZOOM = 11;

/* Pin color per severity. */
const SEVERITIES: { value: SeverityLevel; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-destructive' },
  { value: 'high', label: 'High', color: 'bg-highlight' },
  { value: 'moderate', label: 'Moderate', color: 'bg-warning' },
  { value: 'low', label: 'Low', color: 'bg-info' },
];
/* Pin color for reports with no severity yet. */
const UNCLASSIFIED_COLOR = 'bg-muted-foreground';

/* Statuses counted as open. */
const OPEN_STATUSES: ReportStatus[] = ['pending', 'validated', 'dispatched'];

/* Date filter choices; null days means all time. */
const DATE_RANGES = [
  { value: '1', label: 'Last 24 hours', days: 1 },
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: 'all', label: 'All time', days: null },
];

type Filters = { type: string; severity: string; status: string; date: string };
/* Default filters. */
const DEFAULT_FILTERS: Filters = {
  type: 'all',
  severity: 'all',
  status: 'open',
  date: '7',
};

/* Keeps the reports that pass every filter. */
function applyFilters(reports: ReportFeedItem[], filters: Filters) {
  const days = DATE_RANGES.find((range) => range.value === filters.date)?.days;
  const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
  return reports.filter(
    (report) =>
      (filters.type === 'all' || report.incidentType?.id === filters.type) &&
      (filters.severity === 'all' || report.severity === filters.severity) &&
      (filters.status === 'all' ||
        (filters.status === 'open'
          ? OPEN_STATUSES.includes(report.status)
          : report.status === filters.status)) &&
      (since === null || report.createdAt.getTime() >= since),
  );
}

/* Incident types in the loaded reports. */
function typesIn(reports: ReportFeedItem[]) {
  const types = new Map<string, string>();
  for (const report of reports) {
    if (report.incidentType) {
      types.set(report.incidentType.id, report.incidentType.name);
    }
  }
  return [...types].sort((a, b) => a[1].localeCompare(b[1]));
}

/* Pin element colored by severity. */
function pinElement(severity: SeverityLevel | null) {
  const pin = document.createElement('div');
  const color =
    SEVERITIES.find((s) => s.value === severity)?.color ?? UNCLASSIFIED_COLOR;
  pin.className = cn(
    'size-[18px] rounded-full border-[3px] border-white',
    color,
  );
  return pin;
}

/* /dashboard/map: filters and a pin per located report. */
// TODO(#66): place reports without a point at their barangay's centroid.
export function IncidentsMap() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { data, isError, refetch } = useQuery(reportFeedQuery);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  /* Updates one filter from its select. */
  const setFilter = (key: keyof Filters) => (value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  /* Create the map on mount; remove it on unmount. */
  useEffect(() => {
    if (!container.current) return;
    map.current = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: MIAGAO_CENTER,
      zoom: START_ZOOM,
    });
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  /* Redraw pins when the reports or filters change. */
  // TODO(#38): pins follow live updates once the feed query refetches on report events.
  useEffect(() => {
    if (!map.current || !data) return;
    const markers = applyFilters(data, filters)
      .filter((report) => report.location)
      .map((report) =>
        // TODO(#66): show the report's popup on click.
        new maplibregl.Marker({ element: pinElement(report.severity) })
          .setLngLat([report.location!.lng, report.location!.lat])
          .addTo(map.current!),
      );
    return () => markers.forEach((marker) => marker.remove());
  }, [data, filters]);

  /* -m-4 cancels the layout's padding. */
  return (
    <div className="-m-4 flex h-[calc(100svh-4.5rem)] flex-col gap-4 bg-muted p-6">
      <h1 className="text-lg font-semibold">Map</h1>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <FilterSelect
          label="Type"
          value={filters.type}
          onChange={setFilter('type')}
          options={[
            { value: 'all', label: 'Type: All' },
            ...typesIn(data ?? []).map(([id, name]) => ({
              value: id,
              label: `Type: ${name}`,
            })),
          ]}
        />
        <FilterSelect
          label="Severity"
          value={filters.severity}
          onChange={setFilter('severity')}
          options={[
            { value: 'all', label: 'Severity: All' },
            ...SEVERITIES.map((s) => ({
              value: s.value,
              label: `Severity: ${s.label}`,
            })),
          ]}
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={setFilter('status')}
          options={[
            { value: 'open', label: 'Status: Open' },
            { value: 'all', label: 'Status: All' },
            ...reportStatusSchema.options.map((status) => ({
              value: status,
              label: `Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            })),
          ]}
        />
        <FilterSelect
          label="Date"
          value={filters.date}
          onChange={setFilter('date')}
          options={DATE_RANGES.map((range) => ({
            value: range.value,
            label: `Date: ${range.label}`,
          }))}
        />
        {/* TODO: barangay name labels. */}
        <div className="flex w-42.5 items-center gap-2">
          <Checkbox id="barangay-names" disabled />
          <Label htmlFor="barangay-names">Barangay names</Label>
        </div>
        {/* TODO(#67): heatmap. */}
        <div className="flex w-42.5 items-center gap-2">
          <Checkbox id="heatmap" disabled />
          <Label htmlFor="heatmap">Heatmap</Label>
        </div>
      </div>

      {/* Map with legend and load error */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        <div ref={container} className="size-full" />
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 rounded-lg border bg-card px-3 py-2.5 text-xs">
          <span className="font-medium text-muted-foreground">Severity</span>
          {SEVERITIES.map((s) => (
            <span key={s.value} className="flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-full', s.color)} />
              {s.label}
            </span>
          ))}
        </div>
        {isError && (
          <div
            role="alert"
            className="absolute top-4 right-4 flex items-center gap-2 rounded-md border bg-background p-2 text-sm"
          >
            Couldn't load reports.
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* One filter dropdown; `items` makes the trigger show the label. */
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => next !== null && onChange(next)}
    >
      <SelectTrigger
        aria-label={label}
        className="min-w-0 flex-1 bg-background shadow-xs data-[size=default]:h-9"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
