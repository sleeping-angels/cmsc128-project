import type { TrendRange } from '@repo/shared';
import { RecentBroadcasts } from '@/features/broadcasts';
import {
  ReportQueue,
  ReportStats,
  ReportTrends,
  useReportLiveUpdates,
} from '@/features/triage';

/** `/dashboard`: the current situation, from widgets the owning modules provide. */
export function DashboardHome({
  range,
  onRangeChange,
}: {
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
}) {
  useReportLiveUpdates();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <ReportStats />
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportQueue />
        <RecentBroadcasts />
      </div>
      <ReportTrends range={range} onRangeChange={onRangeChange} />
    </div>
  );
}
