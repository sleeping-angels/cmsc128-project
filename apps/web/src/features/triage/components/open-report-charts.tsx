import { useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';
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
import { reportQueries } from '../queries';

// Colors come from the report state tokens in index.css, so charts match the badges.
const statusConfig = {
  count: { label: 'Reports' },
  pending: { label: 'Pending', color: 'var(--status-pending)' },
  validated: { label: 'Validated', color: 'var(--status-validated)' },
  dispatched: { label: 'Dispatched', color: 'var(--status-dispatched)' },
} satisfies ChartConfig;

const severityConfig = {
  count: { label: 'Reports' },
  critical: { label: 'Critical', color: 'var(--severity-critical)' },
  high: { label: 'High', color: 'var(--severity-high)' },
  moderate: { label: 'Moderate', color: 'var(--severity-moderate)' },
  low: { label: 'Low', color: 'var(--severity-low)' },
  unrated: { label: 'Unrated', color: 'var(--muted-foreground)' },
} satisfies ChartConfig;

/** Open reports by status and by severity, as two bar charts. */
export function OpenReportCharts() {
  const { data, isPending, isError, refetch } = useQuery(
    reportQueries.summary(),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartCard
        title="Open reports by status"
        description="Reports not yet resolved, closed or invalid"
        config={statusConfig}
        counts={data?.openByStatus}
        isPending={isPending}
        isError={isError}
        onRetry={() => void refetch()}
      />
      <ChartCard
        title="Open reports by severity"
        description="Unrated reports await a responder's assessment"
        config={severityConfig}
        counts={data?.openBySeverity}
        isPending={isPending}
        isError={isError}
        onRetry={() => void refetch()}
      />
    </div>
  );
}

function ChartCard({
  title,
  description,
  config,
  counts,
  isPending,
  isError,
  onRetry,
}: {
  title: string;
  description: string;
  config: ChartConfig;
  counts: Record<string, number> | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  // Bars follow the config's order, which reads from most to least urgent.
  const keys = Object.keys(config).filter((key) => key !== 'count');
  const data = keys.map((key) => ({
    key,
    count: counts?.[key] ?? 0,
    fill: `var(--color-${key})`,
  }));
  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-48 w-full" />
        ) : isError ? (
          <LoadError what="report counts" onRetry={onRetry} />
        ) : total === 0 ? (
          <Empty className="h-48">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>No open reports</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-48 w-full">
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{ left: 0, right: 32 }}
            >
              <YAxis
                dataKey="key"
                type="category"
                tickLine={false}
                axisLine={false}
                width={80}
                tickFormatter={(key: string) =>
                  String(config[key]?.label ?? key)
                }
              />
              <XAxis dataKey="count" type="number" allowDecimals={false} hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent nameKey="key" hideLabel />}
              />
              <Bar dataKey="count" maxBarSize={28}>
                <LabelList
                  dataKey="count"
                  position="right"
                  fill="var(--foreground)"
                  className="tabular-nums"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
