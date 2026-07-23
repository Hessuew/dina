# src/db

## Purpose

Database access layer and schema definitions.

- `schema.ts` is a barrel re-exporting the per-domain modules in `src/db/schema/` (tables/enums/relations and policy helpers) used by Drizzle.
- `index.ts` defines how the app connects to Postgres and creates the Drizzle client.
- `connection-scope.ts` owns the request-scoped connect/reuse/`end` lifecycle (testable pure helper).
- `src/utils/request-scope.ts` composes the DB lifecycle with authz cache maps.
- `src/utils/request-scope-middleware.ts` installs that unified scope globally.

## Key Entry Points

- **`index.ts`**
  - `getDb()`
    - Returns a Drizzle instance. Inside a request scope the first call opens one
      `pg` `Client` and connects; every later call in the same request reuses that
      connection. Parallel first-touch callers share a single in-flight connect
      (no double Hyperdrive open). Outside a request scope (scripts) it opens a
      one-off connection. Connection string comes from Hyperdrive
      (`HYPERDRIVE.connectionString`) or `DATABASE_URL` (internal helper only).
  - `withDbConnection(fn)`
    - Runs `fn` within a request scope that shares a single connection across all
      `getDb()` calls, then closes that connection when `fn` finishes. Nested calls
      re-enter the outer scope (outer owns `end()`). Opens nothing if `fn` never
      calls `getDb()`. Start handlers should rely on global request-scope middleware.

- **Unified request-scope middleware**
  - `requestScopeMiddleware` / `requestScopeFunctionMiddleware` are registered in
    `src/start.tsx`, so every HTTP request and server function automatically runs
    under authz caching and `withDbConnection`.

- **`schema.ts`**
  - Barrel that re-exports the per-domain modules in `src/db/schema/`.
  - Those modules (enums, tables, relations) are the schema source of truth for Drizzle queries; importers use `@/db/schema`.
  - Notable tables:
    - `profiles`
      - Stores authenticated user profile data, including optional `lecturer_title` metadata for teacher/lecturer display surfaces.
    - `submissions`
      - Stores text answers and grading data; no attachment or URL field.
      - Enforces one row per `(assignment_id, student_id)`; assignment saves use conflict-safe upsert behavior.
    - `media_library`
      - Stores org-wide library materials (YouTube links, PDFs, etc.).
      - Draft gating is modeled via `is_published`.
      - Stores private uploads as canonical `file_path` / `thumbnail_path`;
        external media stays in `external_url` (ADR 0022).
    - `profiles.avatar_path` and `courses.thumbnail_path`
      - Store canonical private Storage object paths. Read services return
        short-lived signed display URLs instead of exposing paths.
    - `enrollments`
      - Stores public enrolment submissions (application data).
      - Admin-only review workflow via `status`, plus invitation tracking via `invitation_sent`.
    - `post_notifications`
      - Stores post-related notifications (new teacher/admin posts, comments on your posts).
      - Used to power the in-app notifications dropdown and unread badge.
    - `zoom_links`
      - Stores academy-wide General Zoom Links and links owned by a Teacher-user or Admin.
      - General rows have no `teacher_id`; teacher rows require one and cascade on owner deletion.
      - Student visibility follows `discipleship_assignments` without granting Student SELECT on that table (ADR 0019).
    - `whatsapp_messages` / `whatsapp_campaign_locks`
      - Audit/logging and per-campaign locking for admin WhatsApp campaigns.
    - `email_messages` / `email_campaign_locks`
      - Audit/failure logging and per-campaign locking for admin bulk email campaigns.
      - `email_messages` logs bulk campaign attempts only; one-off invitation emails are not backfilled.

## Key Invariants / Assumptions

- **Request-scoped connection (enforced)**
  - Application code should use `getDb()` rather than creating its own connections.
  - Global Start middleware (`src/start.tsx` → `src/utils/request-scope-middleware.ts`)
    enters `withRequestScope` for every request and server function. One connection
    is opened per outermost DB scope, reused across all `getDb()` calls (including
    parallel first-touch), and closed when that scope finishes.
  - Prefer single `pg.Client` per request under Hyperdrive (Hyperdrive is the
    real pool). Do not reintroduce a module-scoped `Pool` on Workers.
  - Nested request scopes and `withDbConnection` calls are re-entrant; outer scopes
    own lifecycle cleanup.

- **Schema changes require doc updates**
  - If you modify the schema modules in `src/db/schema/`, update this README and any related deep dives.

## Common Change Recipes

- **Add a new table/enum**
  - Add to the relevant module in `src/db/schema/` (new tables → a domain `*.schema.ts`; new enums → `enums.schema.ts`).
  - Ensure relations are declared in the same module.
  - Update this README at minimum.

- **Change DB connection behavior**
  - Lifecycle logic: `connection-scope.ts` (+ unit tests).
  - Wire-up / Hyperdrive string: `index.ts`.
  - Global enforcement: `src/utils/request-scope-middleware.ts` + `src/start.tsx`.
  - Be mindful of Cloudflare vs local runtime env.

## Related Docs

- `docs/ENGINEERING_GUIDE.md`
- `src/db/schema.md`
