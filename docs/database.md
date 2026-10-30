# Database

PostgreSQL 17 + PostGIS, managed by Drizzle.

- Schema: `apps/api/src/database/schema/`
- Migrations: `apps/api/drizzle/`

Update this doc with every schema change.

## Conceptual model

```mermaid
erDiagram
    USER["User (Responder)"]
    SESSION["Session"]
    ACCOUNT["Account"]
    INVITE["Invite"]
    BARANGAY["Barangay"]
    RESIDENT["Resident"]
    RESIDENT_CHANNEL["ResidentChannel"]
    REPORT["Report"]
    INCIDENT_TYPE["IncidentType"]
    VICTIM["Victim"]
    MESSAGE["Message"]
    REPORT_EDIT["ReportEdit"]
    BROADCAST["Broadcast"]
    BROADCAST_OPTION["BroadcastOption"]
    BROADCAST_DELIVERY["BroadcastDelivery"]
    BROADCAST_RESPONSE["BroadcastResponse"]
    AGENCY["Agency"]
    AGENCY_REFERRAL["AgencyReferral"]
    KNOWLEDGE_ENTRY["KnowledgeEntry"]

    USER ||--o{ SESSION : "has"
    USER ||--o{ ACCOUNT : "has"
    USER ||--o{ INVITE : "sends"
    USER |o--o| INVITE : "accepts"

    BARANGAY |o--o{ RESIDENT : "is home of"
    BARANGAY |o--o{ REPORT : "locates"
    RESIDENT ||--o{ RESIDENT_CHANNEL : "reaches MIGO via"
    RESIDENT ||--o{ REPORT : "submits"
    RESIDENT ||--o{ MESSAGE : "exchanges"
    INCIDENT_TYPE |o--o{ REPORT : "classifies"
    REPORT ||--o{ VICTIM : "involves"
    REPORT |o--o{ MESSAGE : "is discussed in"
    USER |o--o{ REPORT : "reviews"
    USER |o--o{ MESSAGE : "sends"

    REPORT ||--o{ REPORT_EDIT : "is corrected by"
    USER ||--o{ REPORT_EDIT : "makes"

    USER ||--o{ BROADCAST : "creates"
    BROADCAST ||--o{ BROADCAST_OPTION : "offers"
    BROADCAST ||--o{ BROADCAST_DELIVERY : "is sent as"
    BROADCAST ||--o{ BROADCAST_RESPONSE : "receives"
    RESIDENT ||--o{ BROADCAST_DELIVERY : "receives"
    RESIDENT ||--o{ BROADCAST_RESPONSE : "gives"
    BROADCAST_OPTION ||--o{ BROADCAST_RESPONSE : "is selected in"
    BROADCAST_RESPONSE |o--o| REPORT : "is escalated into"

    REPORT ||--o{ AGENCY_REFERRAL : "is referred via"
    AGENCY ||--o{ AGENCY_REFERRAL : "receives"
    USER ||--o{ AGENCY_REFERRAL : "makes"

    USER ||--o{ KNOWLEDGE_ENTRY : "maintains"
```

`Broadcast.target_barangay_ids` is a `uuid[]`, not a foreign key.

## Logical model

Better Auth tables other than `user` are omitted.

```mermaid
erDiagram
    user {
        text id PK
        text name
        text email UK
        text role "admin plugin"
        boolean banned
    }

    barangay {
        uuid id PK
        text name UK
        geometry_point centroid
        geometry_multipolygon boundary "nullable"
        boolean is_coastal
        boolean is_upland
        hazard_type_array hazards
    }

    resident {
        uuid id PK
        text name "nullable"
        text contact_number "nullable"
        integer age "nullable"
        sex sex "nullable"
        uuid barangay_id FK "nullable"
        text location_text "nullable"
        geometry_point location "nullable"
        language language_preference
        boolean broadcasts_opt_in
        timestamp privacy_notice_at "nullable"
        timestamp created_at
        timestamp updated_at
    }

    resident_channel {
        uuid id PK
        uuid resident_id FK
        source_channel channel UK "with external_id"
        text external_id UK "with channel"
        timestamp last_inbound_at "nullable"
        jsonb push_subscription "nullable"
    }

    incident_type {
        uuid id PK
        text code UK
        text name
        boolean is_active
    }

    report {
        uuid id PK
        text tracking_token UK
        uuid resident_id FK
        boolean is_proxy
        text reviewed_by FK "nullable"
        report_status status
        uuid incident_type_id FK "nullable"
        severity_level severity "nullable"
        uuid barangay_id FK "nullable"
        text location_text "nullable"
        geometry_point location "nullable"
        timestamp incident_at "nullable"
        source_channel source_channel
        boolean parsed_automatically
        jsonb parse_confidence "nullable"
        timestamp created_at
        timestamp updated_at
    }

    victim {
        uuid id PK
        uuid report_id FK
        sex sex "nullable"
        integer age "nullable"
        text medical_condition "nullable"
    }

    message {
        uuid id PK
        uuid resident_id FK
        uuid report_id FK "nullable"
        source_channel channel
        direction direction
        text sender_id FK "nullable"
        text body "nullable"
        jsonb attachments "nullable"
        text external_id "nullable"
        timestamp created_at
    }

    barangay |o--o{ resident : "barangay_id"
    barangay |o--o{ report : "barangay_id"
    resident ||--o{ resident_channel : "resident_id"
    resident ||--o{ report : "resident_id"
    resident ||--o{ message : "resident_id"
    incident_type |o--o{ report : "incident_type_id"
    report ||--o{ victim : "report_id"
    report |o--o{ message : "report_id"
    user |o--o{ report : "reviewed_by"
    user |o--o{ message : "sender_id"
```

## Data dictionary

Spatial columns are PostGIS `geometry` in SRID 4326. Timestamps are UTC, without time zone.

### barangay

Miagao's barangays. Resolve locations and target broadcasts. Seeded by migration from `apps/api/scripts/build-barangays.py`, which derives the flags from PSA boundaries, Project NOAH hazard maps, and Copernicus elevation data.

| Column       | Type                     | Null | Default | Constraint | Description                         |
| ------------ | ------------------------ | ---- | ------- | ---------- | ----------------------------------- |
| `id`         | `uuid`                   | no   | random  | PK         |                                     |
| `name`       | `text`                   | no   |         | unique     | Official name                       |
| `centroid`   | `geometry(Point)`        | no   |         | GiST       | Pin when only the barangay is known |
| `boundary`   | `geometry(MultiPolygon)` | yes  |         | GiST       | Seeded from PSA/NAMRIA 2023         |
| `is_coastal` | `boolean`                | no   | `false` |            | Storm surge, gale targeting         |
| `is_upland`  | `boolean`                | no   | `false` |            | Landslide targeting                 |
| `hazards`    | `hazard_type[]`          | no   | `{}`    |            | From Project NOAH hazard maps       |

### resident

A person who has messaged MIGO. All details are optional.

| Column                | Type              | Null | Default | Constraint      | Description          |
| --------------------- | ----------------- | ---- | ------- | --------------- | -------------------- |
| `id`                  | `uuid`            | no   | random  | PK              |                      |
| `name`                | `text`            | yes  |         |                 |                      |
| `contact_number`      | `text`            | yes  |         |                 | Asked for first      |
| `age`                 | `integer`         | yes  |         | `>= 0`          |                      |
| `sex`                 | `sex`             | yes  |         |                 |                      |
| `barangay_id`         | `uuid`            | yes  |         | FK → `barangay` |                      |
| `location_text`       | `text`            | yes  |         |                 | Home address         |
| `location`            | `geometry(Point)` | yes  |         | GiST            |                      |
| `language_preference` | `language`        | no   | `tgl`   |                 |                      |
| `broadcasts_opt_in`   | `boolean`         | no   | `true`  |                 |                      |
| `privacy_notice_at`   | `timestamp`       | yes  |         |                 | Privacy notice shown |
| `created_at`          | `timestamp`       | no   | `now()` |                 |                      |
| `updated_at`          | `timestamp`       | no   | `now()` |                 | Updated by Drizzle   |

### resident_channel

A resident's identity on one platform. One resident can have several.

| Column              | Type             | Null | Default | Constraint                        | Description                      |
| ------------------- | ---------------- | ---- | ------- | --------------------------------- | -------------------------------- |
| `id`                | `uuid`           | no   | random  | PK                                |                                  |
| `resident_id`       | `uuid`           | no   |         | FK → `resident`, index            |                                  |
| `channel`           | `source_channel` | no   |         | unique (`channel`, `external_id`) |                                  |
| `external_id`       | `text`           | no   |         | unique (`channel`, `external_id`) | Messenger PSID or web session ID |
| `last_inbound_at`   | `timestamp`      | yes  |         |                                   | Messaging window check           |
| `push_subscription` | `jsonb`          | yes  |         |                                   | Web Push endpoint                |

### incident_type

Kinds of incident a report can have. Seeded by migration; admins add types and retire them with `is_active`.

| Column      | Type      | Null | Default | Constraint | Description               |
| ----------- | --------- | ---- | ------- | ---------- | ------------------------- |
| `id`        | `uuid`    | no   | random  | PK         |                           |
| `code`      | `text`    | no   |         | unique     | Used by the classifier    |
| `name`      | `text`    | no   |         |            | Display label             |
| `is_active` | `boolean` | no   | `true`  |            | Offered to the classifier |

### report

An incident report. The sender is always `resident_id`; `is_proxy` marks reports about someone else.

| Column                 | Type              | Null | Default   | Constraint                     | Description                                 |
| ---------------------- | ----------------- | ---- | --------- | ------------------------------ | ------------------------------------------- |
| `id`                   | `uuid`            | no   | random    | PK                             |                                             |
| `tracking_token`       | `text`            | no   | generated | unique                         | 128-bit, base64url; `/status/:token`        |
| `resident_id`          | `uuid`            | no   |           | FK → `resident`, index         | Always the sender                           |
| `is_proxy`             | `boolean`         | no   | `false`   |                                | About someone else                          |
| `reviewed_by`          | `text`            | yes  |           | FK → `user`                    |                                             |
| `status`               | `report_status`   | no   | `pending` | index (`status`, `created_at`) |                                             |
| `incident_type_id`     | `uuid`            | yes  |           | FK → `incident_type`, index    |                                             |
| `severity`             | `severity_level`  | yes  |           |                                |                                             |
| `barangay_id`          | `uuid`            | yes  |           | FK → `barangay`, index         |                                             |
| `location_text`        | `text`            | yes  |           |                                | As reported                                 |
| `location`             | `geometry(Point)` | yes  |           | GiST                           |                                             |
| `incident_at`          | `timestamp`       | yes  |           |                                |                                             |
| `source_channel`       | `source_channel`  | no   |           |                                |                                             |
| `parsed_automatically` | `boolean`         | no   | `false`   |                                | False for form reports                      |
| `parse_confidence`     | `jsonb`           | yes  |           |                                | Field → confidence, `parseConfidenceSchema` |
| `created_at`           | `timestamp`       | no   | `now()`   |                                |                                             |
| `updated_at`           | `timestamp`       | no   | `now()`   |                                | Updated by Drizzle                          |

### victim

A person affected by a report. No names are stored (FR9).

| Column              | Type      | Null | Default | Constraint           | Description |
| ------------------- | --------- | ---- | ------- | -------------------- | ----------- |
| `id`                | `uuid`    | no   | random  | PK                   |             |
| `report_id`         | `uuid`    | no   |         | FK → `report`, index |             |
| `sex`               | `sex`     | yes  |         |                      |             |
| `age`               | `integer` | yes  |         | `>= 0`               |             |
| `medical_condition` | `text`    | yes  |         |                      |             |

### message

Every inbound and outbound chat message. Saved before processing, so it is the fallback record.

| Column        | Type             | Null | Default | Constraint                                                        | Description                     |
| ------------- | ---------------- | ---- | ------- | ----------------------------------------------------------------- | ------------------------------- |
| `id`          | `uuid`           | no   | random  | PK                                                                |                                 |
| `resident_id` | `uuid`           | no   |         | FK → `resident`, index (`resident_id`, `created_at`)              |                                 |
| `report_id`   | `uuid`           | yes  |         | FK → `report`, index                                              |                                 |
| `channel`     | `source_channel` | no   |         | unique (`channel`, `external_id`) where `external_id` is not null |                                 |
| `direction`   | `direction`      | no   |         |                                                                   |                                 |
| `sender_id`   | `text`           | yes  |         | FK → `user`                                                       | Null: bot or resident           |
| `body`        | `text`           | yes  |         |                                                                   | Raw text                        |
| `attachments` | `jsonb`          | yes  |         |                                                                   | Location payloads, storage keys |
| `external_id` | `text`           | yes  |         | see `channel`                                                     | Platform message ID (dedup)     |
| `created_at`  | `timestamp`      | no   | `now()` |                                                                   |                                 |

## Enums

Defined as Zod enums in `packages/shared/src/enums.ts`; the `pgEnum`s are built from them.

| Enum             | Values                                                                | Used by                                                                |
| ---------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `hazard_type`    | `flood`, `landslide`, `storm_surge`, `earthquake`, `fire`             | `barangay.hazards`                                                     |
| `sex`            | `male`, `female`                                                      | `resident.sex`, `victim.sex`                                           |
| `language`       | `hil`, `krj`, `tgl`, `eng` (ISO 639-3)                                | `resident.language_preference`                                         |
| `source_channel` | `messenger`, `web`                                                    | `resident_channel.channel`, `report.source_channel`, `message.channel` |
| `report_status`  | `pending`, `validated`, `dispatched`, `resolved`, `closed`, `invalid` | `report.status`                                                        |
| `severity_level` | `low`, `moderate`, `high`, `critical`                                 | `report.severity`                                                      |
| `direction`      | `inbound`, `outbound`                                                 | `message.direction`                                                    |

Only add values; removing or renaming one breaks older releases.

## Better Auth tables

Generated into `schema/auth.ts` by `pnpm --filter api auth:generate`; migrated by drizzle-kit. Don't edit by hand.

| Table          | Holds                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| `user`         | Responder accounts. `role` (`admin`, `responder`) and ban fields from the admin plugin |
| `session`      | Active sessions                                                                        |
| `account`      | Credentials per provider (password hash for email login)                               |
| `verification` | Short-lived tokens (email verification, password reset)                                |

App tables reference `user.id` (`text`). There is no separate responder table.

## Chat SDK state tables

`chat_state_*` tables belong to Chat SDK's `@chat-adapter/state-pg`, which creates them at startup. They hold expiring state (dedup, locks, subscriptions), not records.

- Not in the Drizzle schema; excluded from drizzle-kit.
- Safe to wipe.
- Never read history from them; use `message`.

## Conventions

- Tables and columns: singular `snake_case`.
- Primary keys: `uuid`. Responder FKs: `text` → `user.id`.
- No `DELETE`. FKs are `ON DELETE RESTRICT`; retire rows by status.
- Spatial columns: `geometry` (SRID 4326) via the `customType`s in `schema/columns.ts`, not Drizzle's built-in `geometry`, which drops the SRID. Points read as `{ lng, lat }`, multipolygons as GeoJSON.
- Distances in meters: cast to `geography` (`ST_Distance(a::geography, b::geography)`).
- Spatial queries: `sql` template.

  ```ts
  db.select()
    .from(barangay)
    .where(
      sql`ST_Contains(${barangay.boundary}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))`,
    );
  ```

## Migrations

```sh
pnpm db:generate   # then review the SQL in apps/api/drizzle/
pnpm db:migrate
```
