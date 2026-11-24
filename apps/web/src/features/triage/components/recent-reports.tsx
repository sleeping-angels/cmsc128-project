import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Inbox } from 'lucide-react';
import { IncidentTypeLabel } from '@/components/incident-type-label';
import { LoadError } from '@/components/load-error';
import { SeverityBadge, StatusBadge } from '@/components/report-badges';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
import { formatLocation, formatTimeAgo } from '@/lib/format';
import { reportQueries } from '../queries';

const LIMIT = 5;

/** The newest reports; each opens its quick view on the incidents page. */
export function RecentReports() {
  // The feed is newest first, and sharing its cache keeps the incidents page instant.
  const { data, isPending, isError, refetch } = useQuery(reportQueries.feed());
  const reports = data?.slice(0, LIMIT);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent reports</CardTitle>
        <CardDescription>The newest reports from every channel</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to="/dashboard/incidents" />}
          >
            View all
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <LoadError what="reports" onRetry={() => void refetch()} />
        ) : !reports?.length ? (
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
        ) : (
          <ItemGroup className="gap-1">
            {reports.map((report) => (
              <Item
                key={report.id}
                size="sm"
                render={
                  <Link
                    to="/dashboard/incidents"
                    search={{ report: report.id }}
                  />
                }
              >
                <ItemContent className="min-w-0">
                  <ItemTitle className="w-full">
                    <IncidentTypeLabel
                      type={report.incidentType}
                      className="truncate"
                    />
                  </ItemTitle>
                  <ItemDescription className="truncate">
                    {[
                      formatLocation(
                        report.locationText,
                        report.barangay?.name,
                      ),
                      formatTimeAgo(report.createdAt),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </ItemDescription>
                </ItemContent>
                <ItemActions className="flex-wrap justify-end">
                  {report.severity && (
                    <SeverityBadge severity={report.severity} />
                  )}
                  <StatusBadge status={report.status} />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}
