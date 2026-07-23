# ADR 0013 — Sentry Errors Carry User Identity

**Status:** Accepted  
**Date:** 2026-07-04

## Context

Sentry captures errors from two runtimes — the browser (`Sentry.init` in `src/router.tsx`)
and the Cloudflare Worker (`Sentry.withSentry` in `src/server.ts` plus the global
function/request middlewares in `src/start.tsx`) — but never set a user on the scope. Every
event was anonymous, so triage meant inferring the affected person from stack traces and
breadcrumbs alone.

The acting user is readily available in both runtimes:

- **Client** — the root route context already exposes `UserContext { id, email, role, … }`
  (`src/routes/__root.tsx`, built by `buildUserContext`).
- **Server** — `getCurrentUser()` (`src/utils/auth/auth.ts`) returns the Supabase user
  `{ id, email }` and is called as the auth boundary inside the global request scope in
  essentially every authed server function. It has no `role` — role lives on the profile row.

## Decision

**Attach the acting user to the Sentry scope in both runtimes.**

- **Server:** call `Sentry.setUser({ id, email })` inside `getCurrentUser()`, right after the
  user resolves. This piggybacks the existing auth-boundary call, adds no query, and runs
  inside the request's Sentry isolation scope (established by `sentryGlobalFunctionMiddleware`
  alongside the global request-scope middleware), so
  identity is scoped to that request and cannot leak across the reused Worker isolate. No
  clearing is needed — each request gets a fresh isolation scope.
- **Client:** a browser-only `useSentryUser` hook in `RootDocument` syncs the route-context
  user → `Sentry.setUser({ id, email, role })`, or `Sentry.setUser(null)` on logout. `role` is
  included because it is free from route context; the `useEffect` guarantees the call never
  runs during SSR.

Identity is deliberately **decoupled from authorization**: it is not routed through the
`authz` permission system (`src/utils/authz/`) and no new permission middleware is introduced.
Sentry only needs _who_ — a passive label on the event — never _what they may do_.

## Consequences

- **Email (PII) is stored in Sentry events.** Accepted for this internal LMS in exchange for
  traceable errors; email is retained by Sentry per its retention policy.
- **Role is client-only.** Server events carry `{ id, email }` without role, avoiding a
  per-request profile lookup solely to enrich a Sentry tag. Minor asymmetry between runtimes.
- **`getCurrentUser` now imports Sentry.** The auth util gains one observability dependency;
  it is server-only (`getSupabaseServerClient`), so the import never reaches the browser bundle.
- Public/pre-auth server functions (which don't call `getCurrentUser`) and pre-login browser
  errors remain anonymous, as expected.

## Alternatives considered

- **Dedicated Sentry function middleware.** Resolve the user best-effort in a middleware after
  `sentryGlobalFunctionMiddleware` instead of inside `getCurrentUser`. Rejected: it keeps the
  auth util clean but must re-resolve auth (or call `getCurrentUser` and swallow the
  `AuthenticationError` for public fns) — more plumbing for the same result, when
  `getCurrentUser` is already the single point where server-side identity becomes known.
- **Email-only identity.** Simpler, but email is mutable (ADR 0001 email-change flow) and can't
  correlate anonymized events; the Supabase `id` UUID is the stable join key, so we send both.
- **Server-side role enrichment.** Fetch the profile so server events also carry role.
  Rejected: a DB query on every authed request purely for a Sentry tag.
