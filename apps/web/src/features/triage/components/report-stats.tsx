import { openReportStatusSchema, type ReportSummary } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CircleDashed, Inbox, type LucideIcon, Siren, Sun } from 'lucide-react';
import { LoadError } from '@/components/load-error';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { label } from '@/lib/format';
import { statusStyles } from '@/lib/report-states';
import { reportQueries } from '../queries';

type Stat = {
  label: string;
  icon: LucideIcon;
  value: (summary: ReportSummary) => number;
  /** A short line under the number saying what it counts. */
  hint: (summary: ReportSummary) => React.ReactNode;
  /** Draws a nonzero value in the danger color. */
  alarming?: boolean;
};

const openTotal = (summary: ReportSummary) =>
  Object.values(summary.openByStatus).reduce((sum, n) => sum + n, 0);

const STATS: Stat[] = [
  {
    label: 'Open reports',
    icon: Inbox,
    value: openTotal,
    hint: (summary) => <StatusSplit summary={summary} />,
  },
  {
    label: 'New today',
    icon: Sun,
    value: (summary) => summary.newToday,
    hint: () => 'Since midnight',
  },
  {
    label: 'Pending review',
    icon: CircleDashed,
    value: (summary) => summary.openByStatus.pending,
    hint: () => 'Not yet confirmed by a responder',
  },
  {
    label: 'Critical',
    icon: Siren,
    value: (summary) => summary.openBySeverity.critical,
    hint: () => 'Open reports rated critical',
    alarming: true,
  },
];

/** Headline report counts for the dashboard home; each card opens the incidents page. */
export function ReportStats() {
  const { data, isPending, isError, refetch } = useQuery(
    reportQueries.summary(),
  );

  if (isError) {
    return (
      <LoadError
        what="report counts"
        onRetry={() => void refetch()}
        className="rounded-xl border"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {STATS.map((stat) => {
        const value = data && stat.value(data);
        return (
          // TODO(#40): open the list filtered to what the card counts once the feed has filters.
          <Link
            key={stat.label}
            to="/dashboard/incidents"
            className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full gap-2 transition-colors group-hover:bg-muted/60 group-hover:ring-foreground/25">
              <CardHeader>
                <CardDescription>{stat.label}</CardDescription>
                <CardAction>
                  <stat.icon
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                </CardAction>
                {isPending ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <CardTitle
                    className={cn(
                      'text-3xl font-semibold tabular-nums',
                      stat.alarming && value ? 'text-destructive' : undefined,
                    )}
                  >
                    {value}
                  </CardTitle>
                )}
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {data ? stat.hint(data) : <Skeleton className="h-4 w-24" />}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

/** Open reports split by status: a thin bar, then the counts in words. */
function StatusSplit({ summary }: { summary: ReportSummary }) {
  const total = openTotal(summary);
  const statuses = openReportStatusSchema.options;
  return (
    <div className="flex flex-col gap-1.5">
      {total > 0 && (
        <div aria-hidden className="flex h-1.5 overflow-hidden rounded-full">
          {statuses.map((status) => (
            <div
              key={status}
              className={statusStyles[status].solid}
              style={{ flexGrow: summary.openByStatus[status] }}
            />
          ))}
        </div>
      )}
      <span>
        {statuses
          .map(
            (status) =>
              `${summary.openByStatus[status]} ${label(status).toLowerCase()}`,
          )
          .join(' · ')}
      </span>
    </div>
  );
}
