import { useQuery } from '@tanstack/react-query';
import { CircleDashed, Inbox, type LucideIcon, Siren, Sun } from 'lucide-react';
import { LoadError } from '@/components/load-error';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { reportQueries } from '../queries';

/** Headline report counts for the dashboard home. */
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

  const open = data
    ? Object.values(data.openByStatus).reduce((sum, n) => sum + n, 0)
    : 0;
  const stats: { label: string; icon: LucideIcon; value?: number }[] = [
    { label: 'Open reports', icon: Inbox, value: data && open },
    { label: 'New today', icon: Sun, value: data?.newToday },
    {
      label: 'Pending review',
      icon: CircleDashed,
      value: data?.openByStatus.pending,
    },
    {
      label: 'Critical and open',
      icon: Siren,
      value: data?.openBySeverity.critical,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(({ label, icon: Icon, value }) => (
        <Card key={label}>
          <CardHeader>
            <CardDescription>{label}</CardDescription>
            <CardAction>
              <Icon aria-hidden className="size-4 text-muted-foreground" />
            </CardAction>
            {isPending ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <CardTitle className="text-3xl font-semibold tabular-nums">
                {value}
              </CardTitle>
            )}
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
