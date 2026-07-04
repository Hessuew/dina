# Repository Guidelines

Tool-neutral entrypoint for agents and contributors working in this repo.

## Read Order

1. **`docs/rules/`** — always-on project rules. Before writing or editing a component or
   endpoint, read the applicable `docs/rules/*.md`; rules are binding.
2. **`docs/ENGINEERING_GUIDE.md`** — engineering guidance, repo navigation, and cross-cutting
   invariants.
3. **`CLAUDE.md`** — core priority rules plus UI and visual constraints.
4. **Nearest directory `README.md`** for the area you edit.

## Project Structure

- `src/routes/**` — TanStack Router file-based routes; `_authed/**` is protected by
  `src/routes/_authed.tsx`.
- `src/components/**` — reusable UI components.
- `src/utils/**` — server-function adapters and shared utilities.
- `src/domain/**` — pure business logic.
- `src/db/**` — Drizzle schema, database entrypoint, and migrations.
- `docs/**` — canonical rules, skills, ADRs, and engineering documentation.

## Commands

- `bun dev` — start the development server.
- `bun run test` — run unit tests.
- `bun run test:integration` — run integration tests.
- `bun run quality:gate` — run lint, type, test, and newly introduced complexity checks.

## Style

- Keep changes surgical and directly tied to the task.
- Prefer existing helpers, project patterns, and directory-local conventions.
- Keep business logic in pure domain services; keep server functions thin.
- Derive database enum and column types from Drizzle schema instead of duplicating literal
  unions.
- Follow the component and endpoint complexity limits in `docs/rules/complexity.md`.

## Testing

- Add or update focused tests when behavior changes.
- Domain logic should be unit-tested where practical; `src/**/domain/**` coverage remains
  strict.
- Run `bun run quality:gate` before submitting tracked changes. It blocks on lint, type, test,
  and newly introduced complexity failures.

## Commits And PRs

- Keep commits and PRs scoped to one intent.
- Update docs in the same change when routes, database shape, utilities, component families,
  or cross-cutting patterns change.
- Do not include unrelated cleanup, formatting churn, or adapter-folder copies of canonical
  docs.

## Agent-Specific Rules

- Rules live once in `docs/rules/*.md`; edit rules only there.
- Skills live once in `docs/skills/<name>/SKILL.md`; edit skills only there.
- `.claude/`, `.devin/`, and `.agents/` are tool-specific adapter surfaces. Their rule and
  skill entries should reference the canonical `docs/` sources rather than fork content.
- Invoke reusable workflows from `docs/skills/<name>/SKILL.md` or the tool adapter that points
  to it. Devin also exposes `.devin/workflows/invoke_skills.md`.
