# src/db

## Purpose

Database access layer and schema definitions.

- `schema.ts` defines tables/enums/relations and policy helpers used by Drizzle.
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
  - Contains enums, tables, and relations for the app.
  - Acts as the schema source of truth for Drizzle queries.
  - Notable tables:
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
  - If you modify `schema.ts`, update this README and any related deep dives.

## Common Change Recipes

- **Add a new table/enum**
  - Add to `schema.ts`.
  - Ensure relations are declared.
  - Update this README at minimum.

- **Change DB connection behavior**
  - Edit `index.ts`.
  - Be mindful of Cloudflare vs local runtime env.

## Related Docs

- `documentation/ENGINEERING_GUIDE.md`
- `src/db/schema.md`
