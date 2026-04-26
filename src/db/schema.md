# src/db/schema.ts (Deep Dive)

## Purpose

Defines the database schema used by Drizzle:

- Enums
- Tables
- Relations
- Policy helpers (where applicable)

This file is the schema source of truth for type-safe queries via Drizzle.

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

- Enums are defined once and reused.
- Relation helpers should be declared near the relevant tables.
- Prefer clear, explicit foreign keys and relation naming.

## Common Change Recipes

- Add a new table
  - Add `pgTable(...)` with standard fields.
  - Add `relations(...)` for foreign keys.
  - Update `src/db/README.md`.

- Add a new enum
  - Add a `pgEnum(...)` export.
  - Reference it in table definitions.
