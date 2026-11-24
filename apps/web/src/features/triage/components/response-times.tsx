import type { ResponseTimes as ResponseTimesData } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { Timer, TrendingDown, TrendingUp } from 'lucide-react';
import { LoadError } from '@/components/load-error';
import {
  Card,
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
import { Skeleton } from '@/components/ui/skeleton';
import { formatMinutes } from '../lib/duration';
import { reportQueries } from '../queries';

type Step = keyof Omit<ResponseTimesData, 'days'>;

const STEPS: { key: Step; label: string; total?: boolean }[] = [
  { key: 'toValidate', label: 'Report to confirmed' },
  { key: 'toDispatch', label: 'Confirmed to help sent' },
  { key: 'toHelp', label: 'Report to help sent', total: true },
];

/** Typical (median) time each step takes this week, against last week. */
export function ResponseTimes() {
  const { data, isPending, isError, refetch } = useQuery(
    reportQueries.responseTimes(),
  );
  const empty = data && STEPS.every(({ key }) => data[key].minutes === null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>How fast we respond</CardTitle>
        <CardDescription>
          Typical times over the last {data?.days ?? 7} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex flex-col gap-3">
            {STEPS.map(({ key }) => (
              <Skeleton key={key} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <LoadError what="response times" onRetry={() => void refetch()} />
        ) : empty ? (
          <Empty className="p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Timer />
              </EmptyMedia>
              <EmptyTitle>No responses yet</EmptyTitle>
              <EmptyDescription>
                Times appear once reports are confirmed or help is sent.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <dl className="flex flex-col divide-y">
            {STEPS.map(({ key, label, total }) => (
              <div
                key={key}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <dt
                  className={cn(
                    'text-sm',
                    total ? 'font-medium' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </dt>
                <dd className="flex flex-col items-end gap-0.5 text-right">
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      total && 'text-lg',
                    )}
                  >
                    {data[key].minutes === null
                      ? 'No data'
                      : formatMinutes(data[key].minutes)}
                  </span>
                  <Change
                    minutes={data[key].minutes}
                    previous={data[key].previousMinutes}
                  />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

/** "3 min faster than last week" in green, slower in amber; nothing without both weeks. */
function Change({
  minutes,
  previous,
}: {
  minutes: number | null;
  previous: number | null;
}) {
  if (minutes === null || previous === null) return null;
  const diff = Math.round(minutes - previous);
  if (diff === 0) {
    return (
      <span className="text-xs text-muted-foreground">Same as last week</span>
    );
  }
  const faster = diff < 0;
  const Icon = faster ? TrendingDown : TrendingUp;
  return (
    <span
      className={cn(
        'flex items-center gap-1 text-xs',
        faster ? 'text-success' : 'text-warning',
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {formatMinutes(Math.abs(diff))} {faster ? 'faster' : 'slower'} than last
      week
    </span>
  );
}
