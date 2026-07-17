# src/db/schema.ts (Deep Dive)

## Purpose

Defines the database schema used by Drizzle:

- Enums
- Tables
- Relations
- Policy helpers (where applicable)

`schema.ts` is a barrel that re-exports the per-domain modules in `src/db/schema/`
(`enums.schema.ts`, `profile.schema.ts`, `course.schema.ts`, `assignment.schema.ts`,
`enrollment.schema.ts`, `post.schema.ts`, `announcement.schema.ts`, `media.schema.ts`,
`calendar.schema.ts`, `zoom.schema.ts`, `notification.schema.ts`, `invitation.schema.ts`).
Those modules are the schema source of truth for type-safe queries via Drizzle; importers
continue to use `@/db/schema`.

`zoom.schema.ts` models General Zoom Links without an owner and Teacher Zoom Links with a
required `profiles` owner. Its section/owner check is the integrity boundary. Its SELECT
policy uses the caller-scoped `current_discipleship_teacher_id()` migration helper so
Student visibility can follow placement while discipleship tables remain staff-select-only.

## Responsibilities

- Provide the exported table objects used across the app (queries and mutations).
- Encode key domain relationships using `relations(...)`.
- Provide consistent conventions (timestamps, soft-delete fields where needed).

## Invariants

- Schema changes must remain compatible with:
  - Drizzle queries in `src/utils/*`
  - Route loaders and server functions
- If you add/remove/rename tables/columns:
  - Update `src/db/README.md`
  - Update any affected feature READMEs if they describe the data model

## Conventions to Keep Consistent

- Enums are defined once in `src/db/schema/enums.schema.ts` and reused.
- Relation helpers are co-located with their tables in each domain module.
- Prefer clear, explicit foreign keys and relation naming.

## Common Change Recipes

- Add a new table
  - Add `pgTable(...)` with standard fields to the relevant `src/db/schema/<domain>.schema.ts` (or a new module file plus an `export *` line in `schema.ts`).
  - Add `relations(...)` for foreign keys in the same module.
  - Update `src/db/README.md`.

- Add a new enum
  - Add a `pgEnum(...)` export to `src/db/schema/enums.schema.ts`.
  - Reference it in table definitions.
