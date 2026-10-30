# Channels

The only path between MIGO and the chat platforms. Intake, feedback and broadcasts go through `ChannelsService` and never call Meta directly.

- API: `apps/api/src/channels/`

One Chat SDK bot (`bot.ts`) holds an adapter per channel, keyed by `source_channel`. Chat SDK's `Thread` and `Message` are the shared internal format. Its state (`chat_state_*` tables) comes from `@chat-adapter/state-pg` on the same database.

## Receiving

`/webhooks/:platform` forwards to that adapter, which verifies the request. Each resident message:

1. is saved as a `Message` row, creating a `Resident` and `ResidentChannel` on first contact, before the webhook is answered. If the save fails, the webhook returns 500 and the platform retries.
2. is dropped if its `(channel, external_id)` already exists, so retries never reach handlers twice
3. goes to every handler registered with `onMessage`

`ChannelsModule` is global; inject `ChannelsService`:

```ts
@Injectable()
export class IntakeService implements OnModuleInit {
  constructor(private readonly channels: ChannelsService) {}

  onModuleInit() {
    this.channels.onMessage(
      async (thread, message, { messageId, residentId }) => {
        // ...
      },
    );
  }
}
```

Handlers run before the webhook is answered, so enqueue slow work instead of awaiting it. A failing handler is logged; the message stays saved.

## Sending

```ts
await this.channels.send(residentId, 'messenger', text, { reportId });
```

`send` posts to the resident's identity on that channel and saves an outbound `Message` row. It throws when the resident has never used the channel or the platform refuses, for example outside Meta's 24-hour window.

## Messenger setup

Messenger is disabled, and its webhook returns 404, unless all three env vars are set:

| Var                          | Where to get it                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `FACEBOOK_APP_SECRET`        | Meta app > App settings > Basic > App secret                                                                     |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Use cases > Messenger from Meta > Customize > Messenger API Settings > Generate access tokens, for the MIGO Page |
| `FACEBOOK_VERIFY_TOKEN`      | Any random string (`openssl rand -hex 16`)                                                                       |

In the same Messenger API Settings:

1. Set the callback URL to `https://<api host>/webhooks/messenger` and the verify token to `FACEBOOK_VERIFY_TOKEN`, then Verify and save. The API must be running and reachable over HTTPS.
2. Subscribe the Page to the `messages` and `messaging_postbacks` fields.

For local development, expose the API with a tunnel (`ngrok http 3000`) and use its URL as the callback. Until App Review (#21) is approved, only people with an admin, developer or tester role on the app can message the Page.
