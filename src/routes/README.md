# src/routes

## Purpose

TanStack Router file-based routes for the application.

This folder defines:

- Public pages (e.g. `/`, `/login`, `/signup`)
- Authenticated route tree under `/_authed/*`
- Route-level loaders/actions, search param validation, and route components

## What Lives Here

- **`__root.tsx`**
  - Defines the root route.
  - Fetches the current user on the server and exposes it via `context.user`.
  - Wraps the app with global providers and persistent UI (sidebar, header, toaster).

- **`_authed.tsx`**
  - Layout route for the authenticated route tree (`/_authed`).
  - Enforces authentication in `beforeLoad` by checking `context.user`.
  - Includes authenticated feature routes such as `/zoom`.

- **Public routes**
  - Routes at this level are generally accessible without auth.

- **API-style routes**
  - Some files may implement server-side endpoints using route files (e.g. upload routes).

## Key Invariants / Assumptions

- **Root context**
  - `context.user` is populated in `__root.tsx` and is the primary auth signal for routing.
  - If you change the shape of `context.user`, update:
    - `documentation/ENGINEERING_GUIDE.md`
    - This README

- **Authenticated routes**
  - Any route under `src/routes/_authed/**` assumes `_authed.tsx` has enforced auth.
  - Route code should not rely on client-only checks for protection.

## Common Change Recipes

- **Add a new authenticated page**
  - Add a file under `src/routes/_authed/...`.
  - Update `src/routes/_authed/README.md` if it changes navigation/structure.

- **Add a new public page**
  - Add a file under `src/routes/...`.
  - Update this README if it introduces a new top-level route area.

- **Change global layout/header/sidebar**
  - Root composition lives in `src/routes/__root.tsx`.
  - Shared navigation components are in `src/components/navigation/*`.

## Related Docs

- `documentation/ENGINEERING_GUIDE.md`
- `documentation/DESIGN_SYSTEM.md`
- `src/routes/_authed/README.md`
