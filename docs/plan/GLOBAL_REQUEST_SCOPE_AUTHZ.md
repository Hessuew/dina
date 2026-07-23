# Plan: Global request-scope authz cache (drop `withRequestCache`)

**Status:** Implemented  
**Owner:** Engineering  
**Prerequisite:** DB request scope already global (DINA-10 follow-up).  
See `src/db/connection-scope.ts`, `src/utils/request-scope.ts`, `src/start.tsx`, ADR 0021.  
**Related:** ADR 0013 (Sentry user identity), ADR 0015 (WhatsApp lock note about cache scope).

---

## Goal

Make **authz per-request caching** automatic the same way **DB connection scope** already is:

- Every TanStack Start HTTP request and server function enters one unified request scope.
- That scope provides:
  1. Authz ALS maps (`roleChecks`, `resourceChecks`)
  2. DB `withDbConnection` (already true via middleware; keep composing so one place owns ambient lifecycle)
- Delete **all** `withRequestCache(...)` call sites and the export.
- Handlers/services call `authz` / `getDb` with zero manual wrap.

**Success criteria (verifiable):**

1. `rg 'withRequestCache' src` → no matches (except historical comments if any remain outside src — prefer zero in `src/`).
2. `rg 'withRequestCache' docs` only references past tense / ADR history / this plan.
3. Global middleware in `src/start.tsx` is a **single** unified scope middleware (request + function), not separate db-only + authz-only pairs.
4. Nested scope entry is a **no-op** (re-enter outer maps + outer DB client); unit tests prove it.
5. `DefaultAuthorizationService.isRole` hits the DB at most once per `(userId, role)` inside one scoped call even without any service-level wrap (unit or integration proof).
6. Scoped tests pass; `bun run typecheck` clean. Do **not** run full `quality:gate` unless submitting a PR that requires it — use scoped vitest + typecheck per project habit.
7. ADR 0021 filled Status=Accepted and docs updated in the same change.

---

## Non-goals

- Do **not** change authz rules, `AuthorizationService` API, or RLS.
- Do **not** reintroduce module-scoped `pg.Pool` on Workers.
- Do **not** inject `context.db` / `context.authz` into every handler (keep ambient `getDb` + `authz()`).
- Do **not** remove `withDbConnection` export (still used by `/readyz` and scripts).
- Do **not** treat `withRequestCache` as a cross-request lock (ADR 0015 already says it is not).

---

## Current state (as of plan write)

### DB (already done)

| Piece                        | Role                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `src/db/connection-scope.ts` | ALS + in-flight connect dedupe + re-entrant `withDbConnection` |
| `src/db/db-middleware.ts`    | `dbRequestMiddleware` / `dbFunctionMiddleware`                 |
| `src/start.tsx`              | Registers both next to Sentry middleware                       |

### Authz (still opt-in)

| Piece                                | Role                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `src/utils/authz/cache.ts`           | ALS maps + `withRequestCache` which **also** calls `withDbConnection`        |
| `src/utils/authz/default-adapter.ts` | Reads/writes cache via `getCachedRole` / `setCachedRole` / resource variants |
| ~70 call sites                       | Server fn modules + services + one route loader wrap                         |

### Call-site inventory (delete wraps)

Strip the wrap only — keep body. Typical patterns:

```ts
// BEFORE (server fn module)
return withRequestCache(async () => {
  const user = await getCurrentUser()
  return someService(data, user.id)
})

// AFTER
const user = await getCurrentUser()
return someService(data, user.id)
```

```ts
// BEFORE (service entry)
export async function fooService(...) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')
    ...
  })
}

// AFTER
export async function fooService(...) {
  await authz(userId).hasRole('admin')
  ...
}
```

**Files with call sites (grep before start; recount after):**

| File                                                      | Notes           |
| --------------------------------------------------------- | --------------- |
| `src/utils/attendance/attendance.ts`                      | server fn layer |
| `src/utils/post/posts.ts`                                 | server fn layer |
| `src/utils/student/students.ts`                           | server fn layer |
| `src/utils/assignments/service/assignments.service.ts`    | service         |
| `src/utils/discipleship/service/discipleship.service.ts`  | service         |
| `src/utils/enrolment/service/enrolment.service.ts`        | service (many)  |
| `src/utils/courses/service/lesson.service.ts`             | service         |
| `src/utils/courses/service/course.service.ts`             | service         |
| `src/utils/courses/service/teacher-assignment.service.ts` | service         |
| `src/utils/teachers/service/teachers.service.ts`          | service         |
| `src/utils/zoomLink/service/zoomLink.service.ts`          | service         |
| `src/utils/whatsapp/service/whatsapp.service.ts`          | service         |
| `src/utils/email/service/email-campaign.service.ts`       | service         |
| `src/routes/_authed/posts.tsx`                            | route loader    |

Also remove export from `src/utils/authz/index.ts` and definition from `cache.ts` (or replace definition with internal-only `withAuthzCache` used solely by unified middleware — prefer **no public export**).

---

## Target design

### Unified request scope

One module owns “everything ambient for a request”:

**Suggested path:** `src/utils/request-scope.ts` (or `src/db/request-scope.ts` if you want DB package to own it — **prefer `src/utils/request-scope.ts`** so authz does not import a misnamed db file for auth maps).

```ts
// Pseudocode — implement for real; keep ≤60 line bodies
export async function withRequestScope<T>(fn: () => Promise<T>): Promise<T> {
  return withAuthzCache(() => withDbConnection(fn))
  // OR nest the other way; see Invariants. Prefer:
  //   outer = authz cache (cheap, always)
  //   inner = db connection (opens only on getDb)
}

// Re-entry: if authz store already present, skip creating new maps.
// DB already re-enters via withDbConnection.
```

**Middleware** (`src/utils/request-scope-middleware.ts` or fold into existing file):

```ts
export const requestScopeMiddleware = createMiddleware().server(
  async ({ next }) => withRequestScope(async () => await next()),
)

export const requestScopeFunctionMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => withRequestScope(async () => await next()))
```

**`src/start.tsx` after:**

```ts
export const startInstance = createStart(() => ({
  requestMiddleware: [sentryGlobalRequestMiddleware, requestScopeMiddleware],
  functionMiddleware: [
    sentryGlobalFunctionMiddleware,
    requestScopeFunctionMiddleware,
  ],
}))
```

**Delete** `src/db/db-middleware.ts` after migration (or re-export from new file for one commit then delete — avoid dual registration).

### Authz cache API after cleanup

Keep:

- `getCachedRole` / `setCachedRole`
- `getCachedResourceCheck` / `setCachedResourceCheck`

Change:

- `withRequestCache` → **remove public API**
- Internal enter helper used only by `withRequestScope`:
  - If `requestStorage.getStore()` already set → `return fn()` (re-enter outer maps)
  - Else `requestStorage.run(freshMaps, fn)`
- **Stop** calling `withDbConnection` from authz cache (ownership moves to `withRequestScope`)

### Nested / double-middleware behavior

TanStack may run request middleware then function middleware for `/_serverFn/*`.  
Request middlewares already executed are filtered out of the function chain when the same middleware object is in `executedRequestMiddlewares` — but **function** middleware is a different object.

So both `requestScopeMiddleware` and `requestScopeFunctionMiddleware` can run for one server fn call. Therefore:

**Invariant: `withRequestScope` / `withAuthzCache` / `withDbConnection` must all be re-entrant no-ops when already inside a scope.**

Unit-test this explicitly (authz maps identity stable across nested enter; single `client.end()`).

### Paths outside Start middleware

| Path                                         | Required                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/readyz` via `src/server.ts`                | Keep explicit `withDbConnection` in `checkDatabaseReadiness`. No authz cache needed.                                                                                                                                                                                                                       |
| Integration tests (`test/integration/db.ts`) | Keep surface parity for `getDb` / `withDbConnection`. If tests call authz + expect cache, enter `withRequestScope` in test setup **or** document that cache is cold without scope (same as today without wrap). Prefer: thin test helper `withRequestScope` exported for tests that need authz cache hits. |
| Scripts / one-off                            | No scope; cache misses (fine).                                                                                                                                                                                                                                                                             |

---

## Implementation steps (ordered)

### 0. Branch / base

Implement on top of the already-merged (or still-open) DINA-10 DB scope work. If DB middleware is not on the branch yet, land that first or include it as step 0 of this PR — do not remove `withRequestCache` DB composition until DB is globally scoped.

### 1. ADR

Complete `docs/adr/0021-global-request-scope-middleware.md` (stub in repo): Status Accepted, link this plan, record alternatives rejected (per-handler wrap, `context.db` injection, separate middleware pair without re-entry).

### 2. Tests first (TDD for scope)

Add/extend unit tests **before** mass deletion:

**Authz re-entry + maps** (new `src/utils/authz/cache.test.ts` or `src/utils/request-scope.test.ts`):

- Fresh scope: `setCachedRole` then `getCachedRole` returns value.
- Nested `withRequestScope`: inner sees outer maps; second enter does not wipe.
- Outside scope: `getCachedRole` returns `null`; `setCachedRole` is no-op (today’s behavior).

**DB re-entry** already covered in `src/db/connection-scope.test.ts` — keep green.

**Optional integration smoke:** one service that does two `authz(...).hasRole('admin')` calls under `withRequestScope` and assert single profile query (spy/`getDb` count) — only if easy with existing pglite harness; not required if unit coverage is solid.

### 3. Implement unified scope + middleware

1. Extract/authz-internalize enter helper with re-entry.
2. Implement `withRequestScope` composing authz enter + `withDbConnection`.
3. Add unified middleware exports.
4. Wire `src/start.tsx`.
5. Remove `db-middleware.ts` registration (delete file if unused).
6. Update `src/db/index.ts` comments that still mention `withRequestCache`.

### 4. Delete all call sites

Mechanical, file-by-file from inventory table. Rules:

- Surgical: remove wrap + unused imports only.
- Do not reformat unrelated code.
- Do not “clean up” service structure beyond unwrapping.
- After each file group: `bun run typecheck` if unsure about dangling imports.

Quick verify:

```bash
rg 'withRequestCache' src
# expect empty
```

### 5. Docs

Update in same PR:

| Doc                                       | Change                                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `docs/ENGINEERING_GUIDE.md`               | Request ambient scope = global middleware (DB + authz). Remove “compose via withRequestCache”.                         |
| `src/db/README.md`                        | Point to unified middleware; drop withRequestCache composition notes.                                                  |
| `src/utils/README.md`                     | Authz cache entered by Start middleware; no manual wrap.                                                               |
| `docs/TESTING_GUIDE.md`                   | Service row: drop `withRequestCache` from description.                                                                 |
| `docs/adr/0013-sentry-user-identity.md`   | Wording: auth boundary runs inside global request scope (not “inside withRequestCache”). Short note, not full rewrite. |
| `docs/adr/0015-whatsapp-campaign-lock.md` | One-line: historical name `withRequestCache` → global request-scope ALS; still not a cross-request lock.               |
| `docs/plan/BULK_SEND.md`                  | Same one-line if still accurate; optional.                                                                             |
| This plan                                 | Set **Status: Implemented** when done.                                                                                 |

### 6. Notion (end of task)

Run `bun run docs:notion-check`. Likely targets:

- `maturity` (ENGINEERING_GUIDE)
- `adr-register` (ADR 0021)
- maybe architecture inventory if you touch README shapes

Follow `docs/notion/README.md` recipes; append dated notes; do not skip without reason in final response.

### 7. Verify

```bash
bun run vitest run src/db/connection-scope.test.ts src/utils/request-scope.test.ts src/utils/authz/cache.test.ts
# adjust paths to whatever tests you added
bun run typecheck
rg 'withRequestCache' src   # empty
```

Optional: one integration file that previously relied on service-level wrap — run that file only:

```bash
bun run test:integration -- src/utils/zoomLink/zoomLink.integration.test.ts
# or whichever is fastest and exercises authz+db
```

### 8. PR / stack

Single intent PR preferred (“global request scope: authz cache + drop withRequestCache”).  
If stacking on unmerged DB work, second PR in stack is fine. Use stack-planner only if user asks.

---

## Invariants (must hold after)

1. **One authz map pair per outermost request scope.** Nested enter does not allocate new maps.
2. **One `pg.Client` per outermost DB scope.** Nested `withDbConnection` does not `end()` early.
3. **Parallel first-touch `getDb()`** still shares in-flight connect (existing `connection-scope` tests).
4. **Cache miss outside scope is safe** — authz still correct, just colder (extra role queries).
5. **No dual middleware registration** of both old db-middleware and new request-scope middleware.
6. **Function middleware `next` must be awaited** (`await next()`) for correct TS + lifecycle (see DINA-10 middleware fix).

---

## Risk register

| Risk                                                     | Mitigation                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Server fn runs only functionMiddleware in some edge path | Register **both** request + function unified middleware (same as DB today).            |
| Nested middleware wipes cache / double-ends client       | Re-entrant no-op + unit tests.                                                         |
| Integration tests expected warm cache without Start      | Enter `withRequestScope` in test helper or accept cold cache.                          |
| Accidental leave of a wrap                               | `rg` gate in verify step; typecheck fails only if export removed while import remains. |
| Doc drift (ADR 0013/0015)                                | Update wording in same PR.                                                             |

---

## Out of order / do not

- Do not rename `authz()` or change builder fluency.
- Do not fold authz into Drizzle middleware.
- Do not make `/readyz` open authz cache (unnecessary).
- Do not keep `withRequestCache` as deprecated no-op export unless a late finding forces a two-phase ship — user decision is **delete all call sites + export**.

---

## Agent handoff checklist

Copy-paste for implementing agent:

```
[x] Read this plan + ADR 0021 stub + src/start.tsx + src/utils/authz/cache.ts + src/db/db-middleware.ts
[x] Confirm DB global middleware already on branch
[x] Write re-entry unit tests (red)
[x] Implement withRequestScope + unified middleware; wire start.tsx; remove db-middleware
[x] Make tests green
[x] Delete every withRequestCache call site + export (inventory table)
[x] rg src clean; typecheck; scoped tests
[x] Docs + ADR Status Accepted
[x] docs:notion-check + Notion recipes
[x] Mark this plan Status: Implemented
```

---

## Decisions locked (grill)

| Decision                | Choice                                    |
| ----------------------- | ----------------------------------------- |
| Middleware shape        | **Unified** request-scope MW (authz + DB) |
| `withRequestCache` fate | **Delete all call sites + export**        |
| Nested semantics        | **Re-enter outer** (no fresh maps)        |
| Record                  | **Short ADR 0021** + this plan            |
