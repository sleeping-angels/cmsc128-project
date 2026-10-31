# MIGO

Miagao Incident Gateway for Operations.

## Wireframe

[Figma](https://www.figma.com/design/YBshm4KSFoGAK5pbSPx38U/CMSC128_Final-Project)

## Structure

```
apps/
  api/   NestJS, Drizzle, Better Auth
  web/   React, Vite, TanStack Router/Query, Tailwind, shadcn
packages/
  shared/             Zod schemas and types shared by api and web
  typescript-config/  shared tsconfigs
  eslint-config/      shared ESLint configs
```

## Setup

Requires Node 22+ and pnpm 10.

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Set `BETTER_AUTH_SECRET` in `apps/api/.env` (`openssl rand -base64 32`).

Agent skills live in `.agents/skills`. To link them for your agent (e.g. Claude Code's `.claude/skills`), run `npx skills experimental_install`.

### Database

PostgreSQL with PostGIS. Either:

- Docker: `docker compose up -d` (matches the default `DATABASE_URL`), or
- Neon: create a branch and put its connection string in `DATABASE_URL`.

Then apply migrations:

```sh
pnpm db:migrate
```

Public sign-up is disabled, so create dashboard accounts with the seed script
(local development use case only):

```sh
pnpm --filter api db:seed-user admin@migo.local 12345678 "MIGO Admin"
pnpm --filter api db:seed-user responder@migo.local 12345678 "MIGO Responder" responder
```

| Role      | Email                  | Password   |
| --------- | ---------------------- | ---------- |
| Admin     | `admin@migo.local`     | `12345678` |
| Responder | `responder@migo.local` | `12345678` |

Schema and ERDs: [docs/database.md](docs/database.md).

### Run

```sh
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000 (docs at `/docs`, health at `/health`)

## Scripts

| Script                            | Description                                        |
| --------------------------------- | -------------------------------------------------- |
| `pnpm dev`                        | Run all apps in watch mode                         |
| `pnpm build`                      | Build all packages and apps                        |
| `pnpm lint`                       | Lint                                               |
| `pnpm typecheck`                  | Typecheck                                          |
| `pnpm test`                       | Run tests (Vitest)                                 |
| `pnpm db:generate`                | Generate a migration from the Drizzle schema       |
| `pnpm db:migrate`                 | Apply migrations                                   |
| `pnpm --filter api db:seed-user`  | Create a dashboard account (see Database)          |
| `pnpm --filter api auth:generate` | Regenerate Better Auth tables after config changes |
| `pnpm format`                     | Format with Prettier                               |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
