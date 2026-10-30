# Intake

Turns resident messages and form answers into reports.

- API: `apps/api/src/intake/`
- Shared: `packages/shared/src/reports/`

## Creating a report

`IntakeService.createReport` is the only way to create a report. Messenger, web chat, the classifier and the guided form all call it. `IntakeModule` is global:

```ts
const { id, trackingToken } = await this.intake.createReport({
  residentId,
  sourceChannel: 'messenger',
  incidentTypeId,
  barangayId,
  messageIds: [messageId],
  parsedAutomatically: true,
  parseConfidence: confidenceOf(parsed),
});
```

It validates the input against `reportInputSchema`, then in one transaction:

1. inserts a `pending` report and its victims
2. links `messageIds` to the report; throws if any isn't the resident's

It then emits `report:created` to the dashboard and returns the ID and tracking token for the confirmation message.

Leave unknown fields out; triage fills them in. Resolve names to IDs before calling: barangays through `BarangayService.findByName`, incident types by `code`.

## Parsing

Intake gets the parser through the `REPORT_PARSER` token:

```ts
constructor(@Inject(REPORT_PARSER) private readonly parser: ReportParser) {}

const parsed = await this.parser.parse(text);
if (!parsed) {
  // failed, timed out or unavailable: start the guided form
}
```

`parse` resolves to a `ParsedReport`, or null when parsing fails, times out or is unavailable. Until the classifier (#27) replaces it, `UnavailableParser` always returns null, so every message goes to the guided form.

## Contracts

| Schema                                                 | Shape                                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `parsedReportSchema`                                   | Classifier output: each field as `{ value, confidence }`, 0–1                 |
| `parseConfidenceSchema`                                | `report.parse_confidence`: field → confidence                                 |
| `reportInputSchema`                                    | `createReport` input                                                          |
| `reportFeedItemSchema`                                 | A report as the triage feed shows it                                          |
| `reportCreatedEventSchema`, `reportUpdatedEventSchema` | Feed item payloads of `report:created` and `report:updated` (`REPORT_EVENTS`) |

Victims have no name field (FR9). In a `ParsedReport`, `victims.value` is null when the message doesn't say and `[]` when it says no one is hurt.

Emit feed items encoded (`reportFeedItemSchema.encode(item)`) so dates go out as ISO strings, and decode them on the client. `findFeedItems(db, where?)` and `findFeedItem(db, id)` in `intake/reports.ts` load them.

## Sample data

```sh
pnpm --filter api db:seed
```

Adds eight sample reports across statuses, incident types and barangays, each with a resident and its raw message. Skips if it already ran and refuses when `NODE_ENV` is `production`. Seeded residents have `web` identities named `seed-<n>`.
