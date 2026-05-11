# src/components

## Purpose

Reusable UI and feature components.

This folder contains:

- Shared app navigation components
- Feature UI components (views, dialogs, cards)
- Base UI primitives (shadcn/ui) and small wrappers

## What Lives Here

- **`ui/`**
  - Shared UI primitives, largely shadcn-style components.
  - These are the building blocks used across routes and feature components.
  - Includes `DeleteConfirmDialog` for standardized delete confirmation flows.
  - Includes `FormDialog` for standardized form dialog structure with background styling, mode-based labels, and default footer with Cancel/Submit buttons.
  - Includes `StatusChip` for standardized status badges with auto-capitalization, size variants (sm/md), and strict design system color tokens. Variants: published, draft, closed, submitted, graded, not-submitted.
  - Includes `app-form-fields.tsx` — TanStack Form-aware field components (`TextField`, `NumberField`, `TextAreaField`, `SelectField`, `SwitchField`) that read from `useFieldContext()` internally and render existing DINA design-system primitives. Use these inside `form.AppField` render-prop children.

- **`navigation/`**
  - App shell components: sidebar, header, catch boundary, not-found page.

- **`layout/`**
  - Page layout wrappers: PageLayout for consistent page background and container structure; PageHeader for detail page headers with back button, gold line, title, metadata, and actions; EntityHeaderActions for standardized StatusChip + edit/delete button pattern with permission logic.

- **Feature component families**
  - `auth/`: signup/login/reset/enrolment forms.
  - `dialog/`: dialogs for profile, invitations, teachers, event previews.
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

- **Add a new feature dialog or view**
  - Place in `components/dialog/*` or `components/view/*`.
  - Keep data fetching in routes/server functions; keep components focused on rendering + callbacks.
  - For forms: use `useAppForm` from `src/hooks/form.ts`. Define form values as UI-shaped types (strings for date inputs, numbers for numeric fields). Build the server payload inside `onSubmit`, validate with the existing Zod schema there, and surface field errors via a local `submitErrors` state bridged to field `error` props. Use `form.reset(values)` inside a `useEffect` on `open` to initialize/reset the form.

- **Update global nav**
  - Edit `components/navigation/*`.
  - Root layout composition is in `src/routes/__root.tsx`.

## Related Docs

- `documentation/DESIGN_SYSTEM.md`
- `src/routes/README.md`
