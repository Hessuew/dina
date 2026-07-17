# src/db

## Purpose

Database access layer and schema definitions.

- `schema.ts` is a barrel re-exporting the per-domain modules in `src/db/schema/` (tables/enums/relations and policy helpers) used by Drizzle.
- `index.ts` defines how the app connects to Postgres and creates the Drizzle client.

## Key Entry Points

- **`index.ts`**
  - `getConnectionString()`
    - Uses Cloudflare Workers env bindings when available.
    - Supports Hyperdrive via `HYPERDRIVE.connectionString`.
    - Falls back to `DATABASE_URL`.
  - `getDb()`
    - Returns a Drizzle instance. Inside a request scope (see `withDbConnection`)
      the first call opens one `pg` `Client` and connects; every later call in the
      same request reuses that connection. Outside a request scope (loaders,
      scripts) it opens a one-off connection.
  - `withDbConnection(fn)`
    - Runs `fn` within a request scope that shares a single connection across all
      `getDb()` calls, then closes that connection when `fn` finishes. Opens
      nothing if `fn` never calls `getDb()`. `withRequestCache()` composes this,
      so any server function wrapped in it already gets request-scoped reuse.

- **`schema.ts`**
  - Barrel that re-exports the per-domain modules in `src/db/schema/`.
  - Those modules (enums, tables, relations) are the schema source of truth for Drizzle queries; importers use `@/db/schema`.
  - Notable tables:
    - `profiles`
      - Stores authenticated user profile data, including optional `lecturer_title` metadata for teacher/lecturer display surfaces.
    - `media_library`
      - Stores org-wide library materials (YouTube links, PDFs, etc.).
      - Draft gating is modeled via `is_published`.
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

- **Request-scoped connection**
  - Application code should use `getDb()` rather than creating its own connections.
  - One connection is opened per request, reused across all `getDb()` calls within
    that request, and closed when the request finishes. The request scope comes
    from `withDbConnection`, which `withRequestCache()` composes.

- **Schema changes require doc updates**
  - If you modify the schema modules in `src/db/schema/`, update this README and any related deep dives.

## Common Change Recipes

- **Add a new table/enum**
  - Add to the relevant module in `src/db/schema/` (new tables → a domain `*.schema.ts`; new enums → `enums.schema.ts`).
  - Ensure relations are declared in the same module.
  - Update this README at minimum.

- **Change DB connection behavior**
  - Edit `index.ts`.
  - Be mindful of Cloudflare vs local runtime env.

## Related Docs

- `docs/ENGINEERING_GUIDE.md`
- `src/db/schema.md`
