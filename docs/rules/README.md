# Project Rules

Binding, always-on engineering rules for this repo. Unlike **skills** (`docs/skills/`, invoked
on demand), rules apply to every change without being asked for.

Rules live **once** here and are symlinked into each agent's conventional location so local and
cloud agents read the same source:

- `.claude/rules` → `../docs/rules` (Claude Code)
- `.devin/rules` → `../docs/rules` (Devin / cloud)

Edit rules only in `docs/rules/`, never through a symlink.

## How rules are loaded

Symlinks give co-location, not auto-load. Activation is by reference from the always-loaded
entrypoints:

- **`CLAUDE.md`** → `## Rules` block (Claude Code reads `CLAUDE.md` every session).
- **`AGENTS.md`** (repo root) → the cross-agent convention (Devin/cloud and other tools).

Both state the same contract: **before writing or editing a component or endpoint, read the
applicable `docs/rules/*.md`.** Rules are binding like the Core Priority rules in `CLAUDE.md`.

> **Cursor** is not used in this repo today. If adopted, add `.cursor/rules/<name>.mdc` files
> with frontmatter `alwaysApply: true` that reference the matching `docs/rules/<name>.md`
> (Cursor only auto-loads `.mdc` files from `.cursor/rules/`, not symlinked `.md`).

## Rule file format

Frontmatter + body:

```markdown
---
name: <kebab-case>
scope: <globs the rule governs>
enforced-by: <how violations are caught — gate / eslint / review>
---

# <Title>

## Rule — the limit/requirement, stated concretely

## Why — what problem it prevents

## How to comply

## Enforcement — exact command(s) that block violations

## Escape hatch — the sanctioned suppression + when it's allowed
```

## Rules

| Rule                                            | Scope                                | Enforced by                                                     |
| ----------------------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| [complexity](./complexity.md)                   | new/changed components & endpoints   | `quality:gate` (fallow `introduced` cyc/cog/CRAP) + ESLint warn |
| [react-compiler-memo](./react-compiler-memo.md) | src/components/\*\*, src/routes/\*\* | review                                                          |
| [db-types](./db-types.md)                       | src/\*\*                             | review                                                          |

## Backlog (candidate rules)

Cross-cutting invariants already documented in
[`../ENGINEERING_GUIDE.md`](../ENGINEERING_GUIDE.md), ripe to promote into enforced rules:

- **auth-boundary** — `src/routes/_authed/**` must go through `_authed.tsx` / `getCurrentUser()`.
- **server-fn-errors** — expected failures throw typed errors (`src/utils/errors.ts`); UI uses
  `toUserError()`, never raw `error.message`.
- **domain-service-layering** — business logic in `src/domain/` pure services; server fns in
  `src/utils/` stay thin adapters (validate → call domain → return).
- **no-adhoc-db** — use `getDb()` from `src/db/index.ts`; no ad-hoc DB instantiation.
- **unit-size** — function/component bodies under the size threshold.
