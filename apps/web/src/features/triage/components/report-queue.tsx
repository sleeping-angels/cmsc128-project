import type { AttentionReason, ReportFeedItem } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  CircleCheck,
  CircleHelp,
  Clock,
  Inbox,
  type LucideIcon,
  ScanSearch,
  Siren,
} from 'lucide-react';
import { useState } from 'react';
import { IncidentTypeLabel } from '@/components/incident-type-label';
import { LoadError } from '@/components/load-error';
import { SeverityBadge, StatusBadge } from '@/components/report-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatLocation, formatTimeAgo } from '@/lib/format';
import { useNow } from '../hooks/use-now';
import { reportQueries } from '../queries';

/** How many reports the Latest tab lists. */
const LATEST_LIMIT = 8;

/** A report this young gets a "New" badge. */
const NEW_FOR_MS = 5 * 60 * 1000;

/** Plain words for each reason, with the most pressing in the danger color. */
const REASONS: Record<
  AttentionReason,
  { icon: LucideIcon; text: string; urgent?: boolean }
> = {
  urgent: { icon: Siren, text: 'Serious, help not sent yet', urgent: true },
  waiting: { icon: Clock, text: 'Waiting over 30 min for review' },
  incomplete: { icon: CircleHelp, text: 'Missing type or severity' },
  unsure: { icon: ScanSearch, text: 'Check details: the bot was unsure' },
};

/**
 * The dashboard home's main list: open reports that need a responder, and
 * the latest reports. Each row opens its quick view on the incidents page.
 */
export function ReportQueue() {
  const [tab, setTab] = useState<'attention' | 'latest'>('attention');
  const attention = useQuery(reportQueries.attention());
  // Rerender every minute so "5 minutes ago" and "New" stay true.
  const now = useNow();

  return (
    <Card>
      <Tabs
        value={tab}
        onValueChange={(next) => setTab(next as typeof tab)}
        className="gap-4"
      >
        <CardHeader className="gap-3">
          <CardTitle className="sr-only">Reports</CardTitle>
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="attention">
              Needs attention
              {attention.data && (
                <Badge
                  variant={attention.data.total ? 'destructive' : 'secondary'}
                  className="tabular-nums"
                >
                  {attention.data.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="latest">Latest</TabsTrigger>
          </TabsList>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link to="/dashboard/incidents" />}
            >
              <span className="hidden sm:inline">All reports</span>
              <span className="sm:hidden">All</span>
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <TabsContent value="attention">
            <AttentionList now={now} />
          </TabsContent>
          <TabsContent value="latest">
            <LatestList now={now} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

function AttentionList({ now }: { now: Date }) {
  const { data, isPending, isError, refetch } = useQuery(
    reportQueries.attention(),
  );

  if (isPending) return <RowsSkeleton />;
  if (isError) {
    return <LoadError what="reports" onRetry={() => void refetch()} />;
  }
  if (!data.reports.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleCheck />
          </EmptyMedia>
          <EmptyTitle>All caught up</EmptyTitle>
          <EmptyDescription>
            No open report needs attention right now.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <ItemGroup className="gap-1">
        {data.reports.map((report) => (
          <ReportRow key={report.id} report={report} now={now}>
            <span className="flex flex-wrap gap-x-3 gap-y-0.5">
              {report.reasons.map((reason) => {
                const { icon: Icon, text, urgent } = REASONS[reason];
                return (
                  <span
                    key={reason}
                    className={
                      urgent
                        ? 'flex items-center gap-1 font-medium text-destructive'
                        : 'flex items-center gap-1'
                    }
                  >
                    <Icon aria-hidden className="size-3.5 shrink-0" />
                    {text}
                  </span>
                );
              })}
            </span>
          </ReportRow>
        ))}
      </ItemGroup>
      {data.total > data.reports.length && (
        <p className="px-3 text-xs text-muted-foreground">
          Showing the {data.reports.length} most urgent of {data.total}.
        </p>
      )}
    </div>
  );
}

function LatestList({ now }: { now: Date }) {
  // The feed is newest first, and sharing its cache keeps the incidents page instant.
  const { data, isPending, isError, refetch } = useQuery(reportQueries.feed());

  if (isPending) return <RowsSkeleton />;
  if (isError) {
    return <LoadError what="reports" onRetry={() => void refetch()} />;
  }
  if (!data.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>No reports yet</EmptyTitle>
          <EmptyDescription>
            New reports from residents appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ItemGroup className="gap-1">
      {data.slice(0, LATEST_LIMIT).map((report) => (
        <ReportRow key={report.id} report={report} now={now} />
      ))}
    </ItemGroup>
  );
}

/** One report: what and where, when, and its severity and status; opens the quick view. */
function ReportRow({
  report,
  now,
  children,
}: {
  report: ReportFeedItem;
  now: Date;
  /** Extra lines under the place and time, such as why it needs attention. */
  children?: React.ReactNode;
}) {
  const isNew = now.getTime() - report.createdAt.getTime() < NEW_FOR_MS;
  const place = formatLocation(report.locationText, report.barangay?.name);
  return (
    <Item
      size="sm"
      render={<Link to="/dashboard/incidents" search={{ report: report.id }} />}
    >
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full">
          <IncidentTypeLabel type={report.incidentType} className="truncate" />
          {isNew && <Badge className="shrink-0">New</Badge>}
        </ItemTitle>
        <ItemDescription className="truncate">
          {[place, formatTimeAgo(report.createdAt)].filter(Boolean).join(' · ')}
        </ItemDescription>
        {children && (
          <div className="text-xs text-muted-foreground">{children}</div>
        )}
      </ItemContent>
      <ItemActions className="w-full flex-wrap sm:w-auto sm:justify-end sm:self-start">
        {report.severity && <SeverityBadge severity={report.severity} />}
        <StatusBadge status={report.status} />
      </ItemActions>
    </Item>
  );
}

function RowsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
