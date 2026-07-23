# Engineering Guide

Defines eng + repo nav guidance for AI changes.

- UI/brand rules → `CLAUDE.md`.
- Module maps → dir `README.md` files (e.g. `src/routes/README.md`).

## Read Order (Required)

1. Read `docs/rules/` for applicable binding project rules.
2. Read `docs/ENGINEERING_GUIDE.md` (eng rules + doc contract).
3. Read `CLAUDE.md` (visual system / UI constraints).
4. Read nearest dir `README.md` for area you edit.

## Architecture Overview

- **Framework**: TanStack Start + React + TanStack Router file-based routing.
- **Routing**: `src/routes/**` with root route in `src/routes/__root.tsx`.
- **Server logic**: TanStack Start server functions via `createServerFn`.
- **Database**: Postgres via Drizzle.
  - DB entrypoint: `src/db/index.ts` exports `getDb()` and `withDbConnection()`.
  - Cloudflare Hyperdrive via `cloudflare:workers` env (`HYPERDRIVE.connectionString`).
  - Global Start middleware (`src/start.tsx` → `src/utils/request-scope-middleware.ts`)
    enters one ambient request scope for authz caching and DB connection reuse.
- **Auth**: Supabase.
  - Server client: `src/utils/supabase.ts` (`getSupabaseServerClient`).
  - Root context user fetched in `src/routes/__root.tsx`, available as `context.user`.

## Tooling

- **Package runner**: Bun.
  - Scripts: `bun run <script>`.
  - Deps: `bun add` / `bun install`.

## Cross-Cutting Invariants

- **Auth boundaries**
  - `src/routes/_authed/**` require auth via `src/routes/_authed.tsx`.
  - Auth server fns call `getCurrentUser()` (`src/utils/auth.ts`).
- **Server-function errors**
  - Expected failures throw typed errors from `src/utils/errors.ts`.
  - UI/route boundaries use `toUserError()`, not raw `error.message`.
- **Environment variables**
  - Typed env in `src/env.ts`. No hardcoded secrets; use bindings/env.
- **Database connections**
  - Use `getDb()` from `src/db/index.ts`. No ad-hoc DB instantiation.
  - One `pg.Client` per request under Hyperdrive (Hyperdrive is the real pool). Do
    not use a module-scoped `Pool` on Workers.
  - Scope is **global**: Start `requestMiddleware` + `functionMiddleware` enter
    `withRequestScope`, which composes authz cache maps with `withDbConnection`.
    Handlers need no manual scope wrapper.
  - Parallel first-touch `getDb()` shares one in-flight connect (see
    `src/db/connection-scope.ts`). Nested request and DB scopes re-enter; outer
    scopes own cache maps and `end()`.
- **Domain services**
  - Business logic in `src/domain/` as pure fns, no HTTP infra.
  - Server fns in `src/utils/` are thin adapters: validate → call domain → return.
  - Domain services accept `db` param (testable with mock DB).
  - Example: `AssignmentService.validateSubmissionWindow(assignment, now)` holds rule; server fn calls it.
- **Stable-ref consumers** (`docs/rules/react-compiler-memo.md`)
  - React Compiler (`babel-plugin-react-compiler`) memoizes components by prop identity. A
    **stable-ref consumer** is a sub-component that receives a prop whose _identity_ is stable
    but whose internal state changes — e.g. a TanStack `useReactTable` instance. The compiler
    sees no prop change and skips the re-render, causing silent stale output.
  - Any stable-ref consumer must add `'use no memo'` as its first statement with a comment
    naming the stable-ref prop. See `docs/rules/react-compiler-memo.md` for the full rule.
  - Known stable-ref types: `TanstackTable<TData>` from `useReactTable`.

## Documentation Contract (Keep Docs Updated)

Update docs in same PR/commit as changes.

For engineering-management metadata, also follow
[`docs/rules/notion-sync.md`](./rules/notion-sync.md). The repo is canonical for ADR bodies,
rules, code-adjacent docs, schema docs, and implementation invariants. Notion is canonical for
roadmap, maturity, service ownership, SLO status, dashboards, runbooks, incidents, risks, and
readiness reviews. Run `bun run docs:notion-check` before final handoff when those areas may have
changed.

### What to Update When You Change Things

- **Routing**
  - Add/remove route in `src/routes/**` → update `src/routes/README.md`.
  - Add/remove authed route in `src/routes/_authed/**` → update `src/routes/_authed/README.md`.
  - Change root route context shape (e.g. `context.user` fields) → update `src/routes/README.md` + `docs/ENGINEERING_GUIDE.md`.

- **Utilities / server functions**
  - Add/remove major utility or change cross-module patterns → update `src/utils/README.md`.

- **Components**
  - New component family/subsystem → update `src/components/README.md`.
  - New public marketing UI pattern → update `CLAUDE.md` if it becomes standard.

- **Database schema**
  - Add/change tables/enums/relations in `src/db/schema.ts` → update `src/db/README.md` + deep dive if exists.

### When to Add a "Deep Dive" Doc

Create sibling `*.md` next to code file only if **keystone module**:

- Long (> ~250 lines),
- High impact (many callers / core workflows), or
- Non-obvious invariants (auth, pagination, soft delete, permissions, data integrity).

Deep dive structure: Purpose · Responsibilities · Invariants · Key exports · Common change recipes.

## How to Document

- Prefer **local** docs (dir `README.md`) over new global docs.
- No code duplication; document "why" and invariants.
- Keep wording concrete, tied to filenames.
