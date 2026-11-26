# Broadcasts

Lets responders send advisories to residents and track delivery (EP5).

- API: `apps/api/src/broadcasts/`
- Web: `apps/web/src/features/broadcasts/`
- Schemas: `packages/shared/src/broadcasts/`

## Endpoints

- `GET /broadcasts/advisories` (alias `/broadcasts/advisories/recent`): the five most recently sent advisories, newest first, as `broadcastSummarySchema`. Each carries `deliveries`, its `BroadcastDelivery` count per status. Needs a responder or admin.

## Dashboard

- `/dashboard/broadcasts`: compose an advisory and list recent ones.
- `/dashboard/broadcasts/:broadcastId`: delivery counts (stub).
- `/dashboard` (home): `RecentBroadcasts` lists the recent advisories with their nonzero delivery counts; each opens its page.
