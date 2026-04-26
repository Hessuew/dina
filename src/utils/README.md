# src/utils

## Purpose

Server-side utilities and server functions used by routes and components.

This folder is primarily where TanStack Start server functions live (via `createServerFn`), along with shared helpers (auth, Supabase client creation, SEO).

## What Lives Here

- **Auth utilities**
  - `auth.ts`: current user lookup and role/access helpers.

- **Supabase utilities**
  - `supabase.ts`: server client (`@supabase/ssr`) and admin client.

- **Feature server function modules**
  - `courses.ts`, `assignments.ts`, `students.ts`, `teachers.ts`, `calendar.ts`, `events.ts`, `invitations.ts`, `posts.ts`.
  - These typically export server functions that routes call for loading and mutations.

- **Misc**
  - `imageUpload.ts`: server-side upload-related helpers.
  - `password.ts`: password-related helpers for auth flows.
  - `seo.ts`: metadata helper.

## Key Invariants / Assumptions

- **Server functions and auth**
  - Server functions that require authentication should call `getCurrentUser()` from `auth.ts`.

- **DB access**
  - Use `getDb()` from `src/db/index.ts`.
  - Do not create Drizzle instances in random locations.

- **Env/keys**
  - Use `src/env.ts` and `getSupabaseServerClient()` / `getSupabaseAdminClient()`.
  - Never expose the service role key to the client.

## Common Change Recipes

- **Add a new server function for a feature**
  - Prefer adding it to the closest feature module in this directory.
  - Validate inputs using schemas from `src/schemas/*`.

- **Change auth rules / roles**
  - Update `auth.ts`.
  - If route protection assumptions change, update `src/routes/README.md`.

## Related Docs

- `AI_GUIDE.md`
- `src/routes/README.md`
- `src/db/README.md`
