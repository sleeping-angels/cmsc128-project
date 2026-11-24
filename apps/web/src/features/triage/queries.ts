import {
  reportDetailSchema,
  reportFeedItemSchema,
  reportSummarySchema,
} from '@repo/shared';
import { queryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Report queries. Invalidating `all()` refreshes the feed and every open report. */
export const reportQueries = {
  all: () => ['reports'] as const,

  /** Every report for the incidents list, newest first. */
  // TODO(#38): invalidate on report:created / report:updated for live updates.
  feed: () =>
    queryOptions({
      queryKey: [...reportQueries.all(), 'feed'],
      queryFn: ({ signal }) =>
        api.get('/triage/reports', reportFeedItemSchema.array(), { signal }),
    }),

  /** Open report counts by status and severity, and how many came in today. */
  summary: () =>
    queryOptions({
      queryKey: [...reportQueries.all(), 'summary'],
      queryFn: ({ signal }) =>
        api.get('/triage/reports/summary', reportSummarySchema, { signal }),
    }),

  /** One report for responders, or null when no report has that ID. */
  detail: (id: string) =>
    queryOptions({
      queryKey: [...reportQueries.all(), 'detail', id],
      queryFn: ({ signal }) =>
        api.getOrNull(`/triage/reports/${id}`, reportDetailSchema, {
          signal,
          // 400 is a malformed ID, which can't match any report either.
          missing: [400, 404],
        }),
    }),
};
