# Map

Incident map pins and, later, the heatmap (EP7).

- API: `apps/api/src/map/` (empty; pins read the triage feed)
- Web: `apps/web/src/features/map/`

## Dashboard

- `/dashboard/map`: pins from `reportQueries.feed()`, filtered by type, severity, status and date. Loaded lazily (NFR9).
- `/dashboard` (home): `OpenReportsMinimap` pins open reports and links to the full map. It frames every pin, keeps scroll zoom off so the page scrolls past it, and shows the map credits under the map so they never cover pins.

Both maps draw pins with `ReportPins` and the colors with `SeverityLegend`.

Map depends on triage, never the reverse. Spatial queries (heatmap aggregation, GeoJSON pins) belong here, not in triage.
