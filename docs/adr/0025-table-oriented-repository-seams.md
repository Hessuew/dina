# ADR 0025 — Table-Oriented Repository Seams

**Status:** Accepted  
**Date:** 2026-09-19

## Context

The original `src/utils/` layout described in ADR 0004 placed a repository inside
each feature folder. That made a feature repository a tempting place to add any
table needed by the feature, so the same table could be queried from several
repositories. A caller then had to search across feature folders to find the
complete persistence interface for one table.

The repository seam should provide locality: changing persistence for one table
should have one obvious implementation site, while feature services retain the
responsibility for composing joined reads and multi-table workflows.

## Decision

1. **One shared repository owner per database table.** Every `pgTable` in
   `src/db/schema/` has exactly one `src/utils/repository/<sql-table-name>.repository.ts`
   owner. The filename uses the SQL table name with underscores replaced by
   hyphens.
2. **Callers use the shared barrel.** Application and utility callers import
   repository adapters from `src/utils/repository/index.ts`, never from an
   individual repository file or a feature-local repository path. Every adapter
   is re-exported by the barrel.
3. **Repositories stay table-oriented.** A repository may read or mutate its
   owned table, including transaction-scoped adapters, but it does not join
   another table, load Drizzle relations, or import another repository at
   runtime.
4. **Composition stays above the seam.** Feature services and explicit
   transaction modules compose table adapters for joined projections and
   atomic multi-table workflows. Transaction modules coordinate adapters but do
   not issue Drizzle queries themselves.
5. **The invariant is enforced.** The repository-boundary test checks ownership,
   barrel exports, caller imports, direct Drizzle access, raw SQL table access,
   and Supabase table selectors across application source.

This supersedes the feature-local repository placement shown in ADR 0004. ADR
0004 remains the reference for the three-layer testing placement: pure domain
logic is colocated under `domain/` and database/framework adapters are kept out
of the domain coverage surface.

## Alternatives considered

- **Keep repositories inside each feature** — rejected. The same table can be
  needed by several features, which recreates duplicate persistence interfaces
  and weakens locality.
- **Create one repository per feature aggregate** — rejected. Aggregates often
  span tables and would make table ownership ambiguous; composition belongs in
  feature services or explicit transaction modules.
- **Allow direct database access in tests and helpers** — rejected for
  application callers. Integration tests use the shared adapters so their
  assertions exercise the same persistence seam; only documented infrastructure
  and operational script seams remain direct.

## Consequences

- A new table requires one shared repository file, one barrel export, and
  boundary-test coverage for the ownership invariant.
- A feature that needs data from several tables imports several adapters and
  composes their results in its service or domain-facing orchestration.
- Joined projections remain easy to locate by feature, while table CRUD remains
  easy to locate by SQL table.
- Repository adapters remain integration-tested rather than included in the
  strict pure-domain coverage target.
