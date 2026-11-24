import { REPORT_EVENTS } from '@repo/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '@/features/realtime';
import { reportQueries } from '../queries';

/** Refetches every report query when a report is created or updated. */
export function useReportLiveUpdates() {
  const queryClient = useQueryClient();
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: reportQueries.all() });
  useRealtimeEvent(REPORT_EVENTS.created, refresh);
  useRealtimeEvent(REPORT_EVENTS.updated, refresh);
}
