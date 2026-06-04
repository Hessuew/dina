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
    - Creates a new `pg` `Client`, connects, and returns a Drizzle instance.

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

## Key Invariants / Assumptions

- **Single connection pattern**
  - Application code should use `getDb()` rather than creating its own connections.

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
