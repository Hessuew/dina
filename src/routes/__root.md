# src/routes/\_\_root.tsx (Deep Dive)

## Purpose

Defines the root route for TanStack Router and establishes the global application shell.

## Responsibilities

- Fetch the current authenticated user on the server and expose it via `context.user`.
- Provide global layout and persistent UI:
  - Sidebar and header
  - Catch boundary and not-found
  - Global UI providers (tooltips, toaster)
- Define global document structure (`<html>`, `<head>`, `<body>`) and route outlet.

## Invariants

- `context.user` is the primary auth signal for route protection.
  - The authenticated route tree checks this value in `src/routes/_authed.tsx`.
- If the shape of `context.user` changes, update:
  - `docs/ENGINEERING_GUIDE.md`
  - `src/routes/README.md`

## Key Entry Points

- `fetchUser` server function
  - Uses `getSupabaseServerClient()` to get Supabase auth user.
  - Looks up the user profile via Drizzle to enrich the UI user object.

- `Route = createRootRoute({ beforeLoad })`
  - Calls `fetchUser` and returns `{ user }` to populate route context.

## Common Change Recipes

- Add a new global provider
  - Add it in `RootDocument` around `{children}`.

- Change authentication context
  - Adjust `fetchUser` and the returned `user` shape.
  - Update doc contract targets (see `docs/ENGINEERING_GUIDE.md`).
