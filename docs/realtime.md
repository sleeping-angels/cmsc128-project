# Realtime

Socket.IO gateway shared by every module that pushes to the dashboard (triage feed, broadcasts, messaging). Server-to-client only; clients change data through REST.

- API: `apps/api/src/realtime/`
- Web: `apps/web/src/features/realtime/`

## Connections

The socket shares the API origin and authenticates with the Better Auth session cookie at the handshake. Connections without a session fail with `connect_error` `UNAUTHORIZED`. Each accepted socket joins:

- `dashboard`: every signed-in user
- `user:<id>`: that user's own connections

`DashboardLayout` opens the connection while the dashboard is mounted.

## Emitting from a module

Import `RealtimeModule` and inject `RealtimeService`:

```ts
@Injectable()
export class TriageService {
  constructor(private readonly realtime: RealtimeService) {}

  async publish(report: ReportFeedItem) {
    this.realtime.toDashboard('report:created', report);
  }
}
```

- `toDashboard(event, payload)`: all signed-in users
- `toUser(userId, event, payload)`: one user

Name events `<entity>:<verb>` (`report:created`, `report:updated`). Define each payload schema in that module's folder in `@repo/shared` so both apps share the type.

## Listening in the web app

```tsx
const queryClient = useQueryClient();

useRealtimeEvent<ReportFeedItem>('report:created', () => {
  void queryClient.invalidateQueries({ queryKey: reportQueries.all() });
});
```

Prefer invalidating or patching TanStack Query caches over keeping separate state.

`useRealtimeConnected()` returns whether the socket is connected, e.g. to show a page is live.
