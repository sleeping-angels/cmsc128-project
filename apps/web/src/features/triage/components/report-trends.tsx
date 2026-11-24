import {
  type ReportTrends as ReportTrendsData,
  type TrendRange,
  trendRangeSchema,
} from '@repo/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import {
  ChartNoAxesColumn,
  CircleHelp,
  type LucideIcon,
  Signal,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
  type YAxisTickContentProps,
} from 'recharts';
import { LoadError } from '@/components/load-error';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { incidentTypeIcon } from '@/lib/incident-types';
import { severityStyles } from '@/lib/report-states';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { reportQueries } from '../queries';

const RANGES: Record<TrendRange, { short: string; long: string }> = {
  '24h': { short: '24 hours', long: 'last 24 hours' },
  '7d': { short: '7 days', long: 'last 7 days' },
  '30d': { short: '30 days', long: 'last 30 days' },
  '90d': { short: '90 days', long: 'last 90 days' },
};

const TIME_ZONE = 'Asia/Manila';

// Colors come from the report state tokens in index.css, so charts match the badges.
// Most severe first; stacked bars draw the first key at the bottom.
const severityConfig = {
  critical: { label: 'Critical', color: 'var(--severity-critical)' },
  high: { label: 'High', color: 'var(--severity-high)' },
  moderate: { label: 'Moderate', color: 'var(--severity-moderate)' },
  low: { label: 'Low', color: 'var(--severity-low)' },
  unrated: { label: 'Unrated', color: 'var(--muted-foreground)' },
} satisfies ChartConfig;
const SEVERITY_KEYS = Object.keys(
  severityConfig,
) as (keyof typeof severityConfig)[];

/**
 * Reports received over a range, except invalid ones: over time, and by
 * severity, incident type and barangay. The range is the caller's, e.g. from the URL.
 */
export function ReportTrends({
  range,
  onRangeChange,
}: {
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
}) {
  // Keep the last range's charts up while the next one loads, instead of flashing skeletons.
  const { data, isPending, isError, isPlaceholderData, refetch } = useQuery({
    ...reportQueries.trends(range),
    placeholderData: keepPreviousData,
  });
  const period = RANGES[range].long;

  return (
    <section aria-labelledby="trends" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="trends" className="text-lg font-semibold">
            Trends
          </h2>
          <p className="text-sm text-muted-foreground">
            {data && !isPlaceholderData
              ? `${data.total} ${data.total === 1 ? 'report' : 'reports'} in the ${period}`
              : `Reports in the ${period}`}
            , not counting invalid ones
          </p>
        </div>
        <ToggleGroup
          aria-label="Time range"
          variant="outline"
          size="sm"
          value={[range]}
          onValueChange={(next) => {
            const picked = trendRangeSchema.safeParse(next[0]);
            if (picked.success) onRangeChange(picked.data);
          }}
        >
          {trendRangeSchema.options.map((option) => (
            <ToggleGroupItem key={option} value={option}>
              {RANGES[option].short}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {isError ? (
        <LoadError
          what="trends"
          onRetry={() => void refetch()}
          className="rounded-xl border"
        />
      ) : (
        <div
          className={cn(
            'flex flex-col gap-4 transition-opacity',
            isPlaceholderData && 'opacity-60',
          )}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TrendCard
              title="Reports over time"
              description={range === '24h' ? 'Per hour' : 'Per day'}
              data={data}
              isPending={isPending}
              className="lg:col-span-2"
            >
              {(trends) => <OverTimeChart trends={trends} />}
            </TrendCard>
            <TrendCard
              title="By severity"
              description="Unrated: no severity set yet"
              data={data}
              isPending={isPending}
            >
              {(trends) => (
                <RankedBars
                  className="h-56"
                  rows={SEVERITY_KEYS.map((key) => ({
                    label: severityConfig[key].label,
                    count: trends.bySeverity[key],
                    color: severityConfig[key].color,
                    // The badges' signal icons; unrated matches "Missing type or severity".
                    icon:
                      key === 'unrated' ? CircleHelp : severityStyles[key].icon,
                    track: key !== 'unrated',
                  }))}
                />
              )}
            </TrendCard>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TrendCard
              title="By incident type"
              description="Unclassified: no type set yet"
              data={data}
              isPending={isPending}
            >
              {(trends) => (
                <RankedBars
                  className="h-64"
                  rows={trends.byType.map(({ incidentType, count }) => ({
                    label: incidentType?.name ?? 'Unclassified',
                    count,
                    icon: incidentTypeIcon(incidentType),
                  }))}
                />
              )}
            </TrendCard>
            <TrendCard
              title="Barangays with the most reports"
              description="Reports without a barangay aren't counted"
              data={data}
              isPending={isPending}
            >
              {(trends) =>
                trends.byBarangay.length ? (
                  <RankedBars
                    className="h-64"
                    rows={trends.byBarangay.map(({ name, count }) => ({
                      label: name,
                      count,
                    }))}
                  />
                ) : (
                  <NoReports text="No barangays recorded" className="h-64" />
                )
              }
            </TrendCard>
          </div>
        </div>
      )}
    </section>
  );
}

/** A chart card that shows a skeleton while loading and a note when the range is empty. */
function TrendCard({
  title,
  description,
  data,
  isPending,
  className,
  children,
}: {
  title: string;
  description?: string;
  data: ReportTrendsData | undefined;
  isPending: boolean;
  className?: string;
  children: (trends: ReportTrendsData) => React.ReactNode;
}) {
  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isPending || !data ? (
          <Skeleton className="h-56 w-full" />
        ) : data.total === 0 ? (
          <NoReports text="No reports in this period" />
        ) : (
          children(data)
        )}
      </CardContent>
    </Card>
  );
}

function NoReports({
  text,
  className = 'h-56',
}: {
  text: string;
  className?: string;
}) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartNoAxesColumn />
        </EmptyMedia>
        <EmptyTitle>{text}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}

/** Reports per hour or day, stacked by severity. */
function OverTimeChart({ trends }: { trends: ReportTrendsData }) {
  const hourly = trends.range === '24h';
  const tick = (start: Date) =>
    start.toLocaleString('en-PH', {
      timeZone: TIME_ZONE,
      ...(hourly ? { hour: 'numeric' } : { month: 'short', day: 'numeric' }),
    });
  const full = (start: Date) =>
    start.toLocaleString('en-PH', {
      timeZone: TIME_ZONE,
      ...(hourly
        ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
        : { weekday: 'short', month: 'short', day: 'numeric' }),
    });
  const data = trends.overTime.map(({ start, counts }) => ({
    start,
    ...counts,
  }));

  return (
    <ChartContainer config={severityConfig} className="aspect-auto h-56 w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: -16 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="start"
          tickLine={false}
          axisLine={false}
          minTickGap={16}
          tickFormatter={tick}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const start = payload[0]?.payload?.start;
                return start instanceof Date ? full(start) : null;
              }}
            />
          }
        />
        <ChartLegend itemSorter={null} content={<ChartLegendContent />} />
        {SEVERITY_KEYS.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="reports"
            fill={`var(--color-${key})`}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

const rankedConfig = {
  count: { label: 'Reports', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/**
 * Horizontal bars, one per row, labeled with their count. The height is fixed
 * by `className`, so cards side by side match however many rows there are.
 */
function RankedBars({
  rows,
  className,
}: {
  rows: {
    label: string;
    count: number;
    color?: string;
    /** Drawn before the label, in the bar's color. */
    icon?: LucideIcon;
    /** Draws the full signal faintly behind the icon, as severity badges do. */
    track?: boolean;
  }[];
  className: string;
}) {
  const data = rows.map((row) => ({
    ...row,
    fill: row.color ?? 'var(--color-count)',
  }));
  return (
    <ChartContainer
      config={rankedConfig}
      className={cn('aspect-auto w-full', className)}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 32 }}
      >
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={AXIS_WIDTH}
          // Every row keeps its label; recharts would otherwise skip some to avoid overlap.
          interval={0}
          tick={(props: YAxisTickContentProps) => (
            <RankedTick {...props} row={rows[props.index]} />
          )}
        />
        <XAxis dataKey="count" type="number" allowDecimals={false} hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey="label" />}
        />
        <Bar dataKey="count" maxBarSize={24}>
          <LabelList
            dataKey="count"
            position="right"
            fill="var(--foreground)"
            className="tabular-nums"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Room for a ranked chart's labels, icon included. */
const AXIS_WIDTH = 128;

/** Labels longer than this get an ellipsis so they fit beside the bars. */
const MAX_LABEL = 16;

/** A row's label, left-aligned in the axis, with its icon before it when it has one. */
function RankedTick({
  x,
  y,
  row,
}: YAxisTickContentProps & {
  row?: { label: string; color?: string; icon?: LucideIcon; track?: boolean };
}) {
  if (!row) return null;
  const { label, color, icon: Icon, track } = row;
  // `x` sits a tick's length (8px) left of the axis' right edge; start at its left edge.
  const left = Number(x) - AXIS_WIDTH + 8;
  const text =
    label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label;
  return (
    <g transform={`translate(${left},${Number(y)})`}>
      <title>{label}</title>
      {track && (
        <Signal
          x={0}
          y={-7}
          width={14}
          height={14}
          aria-hidden
          opacity={0.25}
          color={color}
        />
      )}
      {Icon && (
        <Icon
          x={0}
          y={-7}
          width={14}
          height={14}
          aria-hidden
          color={color ?? 'var(--muted-foreground)'}
        />
      )}
      <text
        x={Icon ? 20 : 0}
        dy="0.355em"
        textAnchor="start"
        className="fill-muted-foreground text-xs"
      >
        {text}
      </text>
    </g>
  );
}
