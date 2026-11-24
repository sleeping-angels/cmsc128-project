import { RecentBroadcasts } from '@/features/broadcasts';
import {
  OpenReportCharts,
  RecentReports,
  ReportStats,
} from '@/features/triage';

/** `/dashboard`: the current situation, from widgets the owning modules provide. */
export function DashboardHome() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <ReportStats />
      <OpenReportCharts />
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentReports />
        <RecentBroadcasts />
      </div>
    </div>
  );
}
