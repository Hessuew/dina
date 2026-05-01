# src/components

## Purpose

Reusable UI and feature components.

This folder contains:

- Shared app navigation components
- Feature UI components (views, modals, cards)
- Base UI primitives (shadcn/ui) and small wrappers

## What Lives Here

- **`ui/`**
  - Shared UI primitives, largely shadcn-style components.
  - These are the building blocks used across routes and feature components.

- **`navigation/`**
  - App shell components: sidebar, header, catch boundary, not-found page.

- **Feature component families**
  - `auth/`: signup/login/reset/enrolment forms.
  - `modal/`: modals for profile, invitations, teachers, event previews.
  - `card/`: card-style feature components.
  - `view/`: composite “page section” components for feature pages.
  - `landing/`: public landing page sections.

## Key Invariants / Assumptions

- **Design system**
  - Public-facing UI should follow `documentation/DESIGN_SYSTEM.md` for visual tokens and patterns.

- **Composition**
  - Prefer composing feature UI from `ui/*` primitives and small feature components.

## Common Change Recipes

- **Add a new reusable primitive**
  - Add under `components/ui/*`.
  - Keep API consistent with existing components.

- **Add a new feature modal or view**
  - Place in `components/modal/*` or `components/view/*`.
  - Keep data fetching in routes/server functions; keep components focused on rendering + callbacks.

- **Update global nav**
  - Edit `components/navigation/*`.
  - Root layout composition is in `src/routes/__root.tsx`.

## Related Docs

- `documentation/DESIGN_SYSTEM.md`
- `src/routes/README.md`
