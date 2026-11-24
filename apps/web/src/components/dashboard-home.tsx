import type { TrendRange } from '@repo/shared';
import { useQuery } from '@tanstack/react-query';
import { greeting, TIME_ZONE } from '@/lib/format';
import { authQueries } from '@/features/auth';
import { RecentBroadcasts } from '@/features/broadcasts';
import { OpenReportsMinimap } from '@/features/map';
import { LiveStatus } from '@/features/realtime';
import {
  ReportQueue,
  ReportStats,
  ReportTrends,
  ResponseTimes,
  useReportLiveUpdates,
} from '@/features/triage';

/**
 * `/dashboard`: what needs a responder now, where, and how things are going.
 * Each widget comes from the module that owns its data.
 */
export function DashboardHome({
  range,
  onRangeChange,
}: {
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
}) {
  useReportLiveUpdates();
  const { data: session } = useQuery(authQueries.session());
  const firstName = session?.user.name.split(' ')[0];
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold">
            {greeting(now)}
            {firstName && `, ${firstName}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {now.toLocaleDateString('en-PH', {
              timeZone: TIME_ZONE,
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <LiveStatus />
      </header>

      <ReportStats />

      {/*
        Each row's cards share a height: the map stretches to the queue, and
        response times sit beside broadcasts. Narrower screens stack them, queue first.
      */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ReportQueue className="min-w-0 xl:col-span-2" />
        <OpenReportsMinimap className="min-w-0" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ResponseTimes className="min-w-0" />
        <RecentBroadcasts limit={2} className="min-w-0 xl:col-span-2" />
      </div>

      <ReportTrends range={range} onRangeChange={onRangeChange} />
    </div>
  );
}
