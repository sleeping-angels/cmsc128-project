# Triage

Lets responders review reports. Read-only for now; editing arrives with #39.

- API: `apps/api/src/triage/`
- Web: `apps/web/src/features/triage/`
- Schemas: `packages/shared/src/triage/`

## Endpoints

Both need a signed-in responder or admin (`@Roles` on the controller, #41); any other role gets 403.

- `GET /triage/reports`: every report as a `reportFeedItemSchema`, newest first. Each item carries `firstMessage`, the text of the message the report came from, for the feed card, and `creator`, the responder who logged it from the dashboard (null for resident reports).
- `GET /triage/reports/summary`: counts for the dashboard home as `reportSummarySchema`. A report is open while `pending`, `validated` or `dispatched` (`openReportStatusSchema`); `openByStatus` and `openBySeverity` count open reports (severity `unrated` when none is set), and `newToday` counts reports of any status created since midnight Philippine time (UTC+8). Declared before `:id`.
- `GET /triage/reports/attention`: open reports that need a responder now, as `attentionQueueSchema`: `total` flagged and the three most urgent (most severe first, then oldest). Each carries its `reasons`: `urgent` (critical or high, not dispatched), `waiting` (pending over 30 minutes), `incomplete` (no type or severity) and `unsure` (pending, with a parse confidence under 0.5).
- `GET /triage/reports/response-times`: `responseTimesSchema`, the median minutes from report to validated (`toValidate`), validated to dispatched (`toDispatch`) and report to dispatched (`toHelp`), from the `ReportEdit` status rows. Each has `minutes` for steps finished in the last 7 days and `previousMinutes` for the 7 before, null without data.
- `GET /triage/reports/trends?range=7d`: `reportTrendsSchema` for the trend charts (#64). `range` is `24h`, `7d` (default), `30d` or `90d`; 400 otherwise. Counts reports created in the range, except invalid ones: `overTime` per hour (24h) or Philippine day, with empty periods, `bySeverity`, `byType` (each with its `incidentType` code and name, null for unclassified) and the top eight `byBarangay`.
- `GET /triage/reports/:id`: one report as `reportDetailSchema`; 400 for a malformed ID, 404 when no report has it. Unlike a feed item, it carries the resident's contact number, the victims and the conversation, oldest first. Keep it off public pages.

## Feed queries

`TriageRepository` holds the projection the list and the detail share: `reportColumns` hides internal links and the tracking token, and `reportRelations` adds the incident type and barangay. `ReportsService` exposes `findFeed()`, `findFeedItem(id)` and `findDetail(id)`; intake uses `findFeedItem` to push `report:created`. `ReportInsightsService` holds the dashboard home's counts and rules; times of day are Philippine time (UTC+8).

`parse_confidence` and `message.attachments` are `jsonb`, so `checkConfidence` and `checkAttachments` validate them against `parseConfidenceSchema` and `messageAttachmentsSchema` and return null for a value of the wrong shape instead of failing the response.

## Dashboard home widgets

Triage exports these widgets for `/dashboard`:

- `ReportStats`: open reports (split by status), new today, pending review and critical, from `reportQueries.summary()`, each with a line saying what it counts. Critical turns red above zero. Each card opens `/dashboard/incidents`; filtering to what it counts waits on the feed's filters (#40).
- `ReportQueue`: two tabs. Needs attention lists `reportQueries.attention()` with each report's reasons in plain words; Latest lists the four newest from `reportQueries.feed()` (sharing the incidents page's cache). Rows open the quick view at `/dashboard/incidents?report=<id>`, and a report under five minutes old reads New.
- `ResponseTimes`: the typical (median) time from report to confirmed, confirmed to help sent and report to help sent, with the change from last week.
- `ReportTrends`: the Trends section (#64): reports over time stacked by severity, and by severity, incident type and barangay, as shadcn charts colored with the report state tokens. The caller owns the range; the home keeps it in `?range=` (7 days when absent), and the last range's charts stay up while the next loads.

Each has its own loading, empty and error state. `useReportLiveUpdates()` refetches every report query on `report:created` and `report:updated`, so a page that calls it stays current.

## Incidents workspace

`/dashboard/incidents` follows the wireframe's Incident Feed: report cards on the left, and a quick view of the selected report's chat and details beside them. Selecting a card sets `?report=<id>` and stays on the same route, as the sitemap asks; a refresh or shared link keeps the selection. With none selected, both panes prompt to select a report. The Table and Kanban tabs, Sort and the message box are shown disabled until their features exist.

The quick view's header links to `/dashboard/incidents/:reportId`, the full report page (responders and admins): details, victims, location, messages, edit history and referrals. It is read-only; the status actions, Edit details and Edit history (#39), replies (#12), the map (#66) and referrals (#63) are shown disabled or as placeholders. A breadcrumb leads back to the feed.

The chat pane labels messages by `direction` and `sender_id`: inbound is the resident, outbound with a sender is a responder, outbound without one is the bot.

The web app reads the list with `reportQueries.feed()` and each report with `reportQueries.detail(id)`. Invalidating `reportQueries.all()` refreshes both, including open reports.

## Contracts

| Schema                     | Shape                                                    |
| -------------------------- | -------------------------------------------------------- |
| `reportFeedItemSchema`     | A report as the feed lists it (defined with intake's)    |
| `reportDetailSchema`       | One report as a responder reviews it                     |
| `reportIdParamsSchema`     | `{ id }` route params for one report                     |
| `reportSummarySchema`      | Open report counts and new reports today                 |
| `openReportStatusSchema`   | The statuses that count as open                          |
| `attentionQueueSchema`     | Open reports that need attention, with their reasons     |
| `responseTimesSchema`      | Median minutes per step, this week and last              |
| `reportTrendsSchema`       | Report counts over a `trendRangeSchema` range            |
| `messageAttachmentsSchema` | `message.attachments`, reduced to each attachment's type |
