# ADR 0021 — Global request-scope middleware (DB + authz)

**Status:** Accepted  
**Date:** 2026-07-22

## Context

TanStack Start on Cloudflare Workers needs **per-request ambient state** that must not
leak across isolates or requests:

1. **Database** — one logical `pg.Client` per request through Hyperdrive (real pool is
   Hyperdrive; app must not hold a module-scoped `Pool`). Implemented after Sentry
   DINA-10: `withDbConnection` + in-flight connect dedupe (`src/db/connection-scope.ts`)
   entered by Start middleware.
2. **Authz cache** — per-request memo of role and resource checks
   (`src/utils/authz/cache.ts`), consumed by `DefaultAuthorizationService`.

Authz cache was historically **opt-in** via `withRequestCache()` at each server function
or service entry. That forced every handler to remember the wrap; forgetting only colds
the cache (correct but wasteful), while the old dual purpose of `withRequestCache`
(also opening DB scope) created the class of bug fixed for DB globally.

DB is already non-opt-in. Authz should match so endpoints stay thin and ambient
lifecycle cannot be forgotten.

## Decision

**Enter a single unified request scope from global TanStack Start middleware**
(`requestMiddleware` + `functionMiddleware` in `src/start.tsx`):

- Authz ALS maps (re-entrant: nested enter is a no-op; outer owns the maps).
- DB `withDbConnection` (already re-entrant; outer owns `client.end()`).

**Delete** the public `withRequestCache` API and all call sites. Handlers and services
call `authz` / `getDb` with no manual wrap.

Keep exporting `withDbConnection` for non-Start paths (`/readyz`, scripts). Keep authz
get/set cache helpers internal to the authz module (or package-private) for the adapter.

Implementation detail and file inventory: `docs/plan/GLOBAL_REQUEST_SCOPE_AUTHZ.md`.

## Alternatives considered

| Alternative                                         | Why not                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Keep per-handler `withRequestCache`                 | Forgetting is easy; noise at every boundary; dual DB composition obsolete.            |
| Separate authz middleware + keep `db-middleware`    | Two sources of truth; easy to register only one; still need identical re-entry rules. |
| Inject `context.db` / `context.authz` (blog-style)  | Fights domain/service layering; every layer learns Start context.                     |
| Leave cache cold without wraps                      | Correct but multiplies role/resource queries under load.                              |
| Deprecated no-op `withRequestCache` for one release | Extra API surface; user chose hard delete + compile-time breakage.                    |

## Consequences

- **Positive:** One ambient lifecycle story; thinner endpoints; authz memo always on for
  Start traffic; same re-entry story as DB under nested middleware.
- **Neutral:** `/readyz` and scripts still manage DB explicitly; cache remains cold there.
- **Docs:** Update ENGINEERING_GUIDE, utils/db READMEs, ADR 0013/0015 wording that names
  `withRequestCache` as the scope boundary.
- **Tests:** Unit tests must prove nested scope does not wipe maps or double-`end` clients.

## Implementation

Implemented via `docs/plan/GLOBAL_REQUEST_SCOPE_AUTHZ.md`.
