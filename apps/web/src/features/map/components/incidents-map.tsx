import {
  openReportStatusSchema,
  type ReportFeedItem,
  type ReportStatus,
  reportStatusSchema,
  type SeverityLevel,
  severityLevelSchema,
} from '@repo/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { IncidentTypeLabel } from '@/components/incident-type-label';
import { SeverityBadge, StatusBadge } from '@/components/report-badges';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { reportQueries } from '@/features/triage';
import { label } from '@/lib/format';
// Aliased: `Map` would shadow the built-in Map that typesIn uses.
import { Map as AppMap } from '@/components/map';
import { ReportPins } from './report-pins';
import { SeverityLegend } from './severity-legend';
import { MapControls, useMap } from '@/components/ui/map';

const FOCUS_ZOOM = 16;

/* Most severe first, for the filter and legend. */
const SEVERITIES = severityLevelSchema.options.toReversed();

/* Date filter choices; null days means all time. */
const DATE_RANGES = [
  { value: '1', label: 'Last 24 hours', days: 1 },
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: 'all', label: 'All time', days: null },
];

/* Each list keeps the values shown; an empty list shows every value. */
type Filters = {
  types: string[];
  severities: SeverityLevel[];
  statuses: ReportStatus[];
  date: string;
};
/* Default filters: open reports from the last 7 days. */
const DEFAULT_FILTERS: Filters = {
  types: [],
  severities: [],
  statuses: [...openReportStatusSchema.options],
  date: '7',
};

/* True when `value` is picked, or nothing is. */
function allows<T>(picked: T[], value: T | null | undefined) {
  return !picked.length || (value != null && picked.includes(value));
}

/* Keeps the reports that pass every filter. */
function applyFilters(reports: ReportFeedItem[], filters: Filters) {
  const days = DATE_RANGES.find((range) => range.value === filters.date)?.days;
  const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
  return reports.filter(
    (report) =>
      allows(filters.types, report.incidentType?.id) &&
      allows(filters.severities, report.severity) &&
      allows(filters.statuses, report.status) &&
      (since === null || report.createdAt.getTime() >= since),
  );
}

/* Incident types in the loaded reports. */
function typesIn(reports: ReportFeedItem[]) {
  const types = new Map<string, NonNullable<ReportFeedItem['incidentType']>>();
  for (const report of reports) {
    if (report.incidentType) {
      types.set(report.incidentType.id, report.incidentType);
    }
  }
  return [...types.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/* /dashboard/map: filters and a pin per located report, centered on `focusId` if given. */
// TODO(#66): place reports without a point at their barangay's centroid.
export function IncidentsMap({ focusId }: { focusId?: string }) {
  const { data, isError, refetch } = useQuery(reportQueries.feed());
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  /* Updates one filter. */
  const setFilter =
    <K extends keyof Filters>(key: K) =>
    (value: Filters[K]) =>
      setFilters((current) => ({ ...current, [key]: value }));

  const types = useMemo(
    () => new Map(typesIn(data ?? []).map((type) => [type.id, type])),
    [data],
  );

  /* Reports that pass the filters; the linked report stays even when they'd hide it. */
  // TODO(#38): pins follow live updates once the feed query refetches on report events.
  const pinned = useMemo(() => {
    if (!data) return [];
    const shown = applyFilters(data, filters);
    const focused = data.find((report) => report.id === focusId);
    if (focused && !shown.includes(focused)) shown.push(focused);
    return shown;
  }, [data, filters, focusId]);

  const focusPoint = data?.find((report) => report.id === focusId)?.location;

  /* -m-4 cancels the layout's padding so the map fills the page. */
  return (
    <div className="relative -m-4 h-[calc(100%+2rem)] overflow-hidden md:rounded-b-xl">
      <AppMap className="size-full">
        <ReportPins reports={pinned} focusId={focusId} />
        {focusPoint && <FlyTo lngLat={focusPoint} />}
        <MapControls showCompass showLocate showFullscreen />
      </AppMap>

      <div className="absolute inset-x-3 top-3 flex flex-wrap items-start gap-2">
        <MultiFilter
          label="Type"
          options={[...types.keys()]}
          optionLabel={(id) => types.get(id)?.name ?? id}
          renderOption={(id) => <IncidentTypeLabel type={types.get(id)!} />}
          value={filters.types}
          onChange={setFilter('types')}
        />
        <MultiFilter
          label="Severity"
          options={SEVERITIES}
          optionLabel={label}
          renderOption={(severity) => <SeverityBadge severity={severity} />}
          value={filters.severities}
          onChange={setFilter('severities')}
        />
        <MultiFilter
          label="Status"
          options={reportStatusSchema.options}
          optionLabel={label}
          renderOption={(status) => <StatusBadge status={status} />}
          value={filters.statuses}
          onChange={setFilter('statuses')}
        />
        <Select
          items={DATE_RANGES.map((range) => ({
            value: range.value,
            label: `Date: ${range.label}`,
          }))}
          value={filters.date}
          onValueChange={(next) => next !== null && setFilter('date')(next)}
        >
          <SelectTrigger
            aria-label="Date"
            size="sm"
            className="bg-background shadow-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isError && (
          <div
            role="alert"
            className="ml-auto flex items-center gap-2 rounded-md border bg-background py-1 pr-1 pl-3 text-sm shadow-sm"
          >
            Couldn't load reports.
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
      </div>

      <SeverityLegend className="absolute bottom-3 left-3" />
    </div>
  );
}
/* Centers the map on a point once the map is ready. */
function FlyTo({
  lngLat: { lng, lat },
}: {
  lngLat: { lng: number; lat: number };
}) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (map && isLoaded) map.flyTo({ center: [lng, lat], zoom: FOCUS_ZOOM });
  }, [map, isLoaded, lng, lat]);
  return null;
}

/* "Severity: All", "Severity: High", "Severity: 2 selected". */
function summary<T>(label: string, value: T[], optionLabel: (v: T) => string) {
  if (!value.length) return `${label}: All`;
  if (value.length === 1) return `${label}: ${optionLabel(value[0]!)}`;
  return `${label}: ${value.length} selected`;
}

/* A multi-select filter: a button that opens a searchable, checkable list. */
function MultiFilter<T extends string>({
  label,
  options,
  optionLabel,
  renderOption,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  optionLabel: (value: T) => string;
  renderOption: (value: T) => React.ReactNode;
  value: T[];
  onChange: (value: T[]) => void;
}) {
  return (
    <Combobox
      multiple
      items={options}
      itemToStringLabel={optionLabel}
      value={value}
      onValueChange={onChange}
    >
      <ComboboxTrigger
        aria-label={label}
        render={
          <Button
            variant="outline"
            size="sm"
            className="bg-background font-normal shadow-sm"
          />
        }
      >
        {summary(label, value, optionLabel)}
      </ComboboxTrigger>
      <ComboboxContent className="min-w-48">
        <ComboboxInput
          showTrigger={false}
          placeholder={`Search ${label.toLowerCase()}`}
        />
        <ComboboxEmpty>No matches</ComboboxEmpty>
        <ComboboxList>
          {(option: T) => (
            <ComboboxItem key={option} value={option}>
              {renderOption(option)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
