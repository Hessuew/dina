# AI_GUIDE.md

This file defines engineering and repository navigation guidance for AI-assisted changes in this repo.

- UI/brand rules live in `CLAUDE.md`.
- Local module maps live in directory `README.md` files (e.g. `src/routes/README.md`).

## Read Order (Required)

When working in this repo:

1. Read `AI_GUIDE.md` (engineering rules + documentation contract).
2. Read `CLAUDE.md` (visual system / UI constraints).
3. Read the nearest directory `README.md` for the area you will edit.

## Architecture Overview

- **Framework**: TanStack Start + React + TanStack Router file-based routing.
- **Routing**: `src/routes/**` with root route in `src/routes/__root.tsx`.
- **Server logic**: TanStack Start server functions via `createServerFn`.
- **Database**: Postgres queried via Drizzle.
  - DB entrypoint: `src/db/index.ts` exports `getDb()` and `getConnectionString()`.
  - Cloudflare Hyperdrive is supported via `cloudflare:workers` env (`HYPERDRIVE.connectionString`).
- **Auth**: Supabase.
  - Server client: `src/utils/supabase.ts` (`getSupabaseServerClient`).
  - Root context user is fetched in `src/routes/__root.tsx` and made available as `context.user`.

## Tooling

- **Package runner**: Bun.
  - Run scripts via `bun run <script>`.
  - Install deps via `bun add` / `bun install`.

## Cross-Cutting Invariants

- **Auth boundaries**
  - Routes under `src/routes/_authed/**` require authentication via `src/routes/_authed.tsx`.
  - Server functions that require auth should call `getCurrentUser()` (`src/utils/auth.ts`).
- **Environment variables**
  - Typed env definitions live in `src/env.ts`.
  - Never hardcode secrets; use bindings/env.
- **Database connections**
  - Use `getDb()` from `src/db/index.ts`.
  - Do not instantiate DB connections ad-hoc elsewhere.

## Documentation Contract (Keep Docs Updated)

When making changes, update documentation in the same PR/commit.

### What to Update When You Change Things

- **Routing**
  - Adding/removing a route file in `src/routes/**`:
    - Update `src/routes/README.md`.
  - Adding/removing an authenticated route in `src/routes/_authed/**`:
    - Update `src/routes/_authed/README.md`.
  - Changing root route context shape (e.g. `context.user` fields):
    - Update `src/routes/README.md` and this file (`AI_GUIDE.md`).

- **Utilities / server functions**
  - Adding/removing a major utility module or changing cross-module patterns:
    - Update `src/utils/README.md`.

- **Components**
  - Adding a new component family/subsystem (new subfolder or new UI pattern):
    - Update `src/components/README.md`.
  - Adding new public-facing marketing UI patterns:
    - Update `CLAUDE.md` if the pattern becomes a standard.

- **Database schema**
  - Adding/changing tables/enums/relations in `src/db/schema.ts`:
    - Update `src/db/README.md`.
    - If a deep dive exists for the specific file, update it.

### When to Add a “Deep Dive” Doc

Create a sibling `*.md` file next to a code file only when it is a **keystone module**:

- Long (> ~250 lines),
- High impact (many callers / core workflows), or
- Has non-obvious invariants (auth, pagination, soft delete, permissions, data integrity).

Deep dives should be short and structured:

- Purpose
- Responsibilities
- Invariants
- Key exports / entry points
- Common change recipes

## How to Document

- Prefer **local** docs (directory `README.md`) over new global docs.
- Do not duplicate obvious code; document “why” and invariants.
- Keep wording concrete and tied to filenames.
