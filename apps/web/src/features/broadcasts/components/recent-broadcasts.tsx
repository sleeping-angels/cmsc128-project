import type { BroadcastSummary, DeliveryStatus } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Radio } from 'lucide-react';
import { LoadError } from '@/components/load-error';
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
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo } from '@/lib/format';
import { broadcastQueries } from '../queries';

const deliveryLabels: Record<DeliveryStatus, string> = {
  sent: 'sent',
  queued: 'queued',
  failed: 'failed',
  outside_window: 'outside window',
};

/** "12 sent · 2 failed": nonzero counts only, or "No recipients". */
function deliverySummary(deliveries: BroadcastSummary['deliveries']) {
  const parts = (Object.keys(deliveryLabels) as DeliveryStatus[])
    .filter((status) => deliveries[status] > 0)
    .map((status) => `${deliveries[status]} ${deliveryLabels[status]}`);
  return parts.length ? parts.join(' · ') : 'No recipients';
}

/** The latest advisories with their delivery counts; each opens its page. */
export function RecentBroadcasts() {
  const { data, isPending, isError, refetch } = useQuery(
    broadcastQueries.recentAdvisories(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent broadcasts</CardTitle>
        <CardDescription>Advisories sent to residents</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to="/dashboard/broadcasts" />}
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
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isError ? (
          <LoadError what="broadcasts" onRetry={() => void refetch()} />
        ) : !data.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Radio />
              </EmptyMedia>
              <EmptyTitle>No broadcasts yet</EmptyTitle>
              <EmptyDescription>
                Advisories you send appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup className="gap-1">
            {data.map((advisory) => (
              <Item
                key={advisory.id}
                size="sm"
                render={
                  <Link
                    to="/dashboard/broadcasts/$broadcastId"
                    params={{ broadcastId: advisory.id }}
                  />
                }
              >
                <ItemContent className="min-w-0">
                  <ItemTitle className="line-clamp-2 font-normal">
                    {advisory.messageBody}
                  </ItemTitle>
                  <ItemDescription className="truncate">
                    {advisory.createdBy.name} · {formatTimeAgo(advisory.sentAt)}
                  </ItemDescription>
                </ItemContent>
                <ItemFooter className="text-xs text-muted-foreground tabular-nums">
                  {deliverySummary(advisory.deliveries)}
                </ItemFooter>
              </Item>
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}
