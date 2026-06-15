# Agent Guide

Entry point for any agent (Devin / cloud and other tools) working in this repo.

## Binding rule sources — read before editing

1. **`docs/rules/`** — always-on project rules. **Before writing or editing a component or
   endpoint, read the applicable `docs/rules/*.md`.** Rules are binding.
2. **`docs/ENGINEERING_GUIDE.md`** — engineering + repo-navigation guidance and cross-cutting
   invariants.
3. **`CLAUDE.md`** — core priority rules and UI/visual constraints.
4. Nearest dir `README.md` for the area you edit.

## Skills

Reusable workflows live in `docs/skills/<name>/SKILL.md`, symlinked into `.devin/skills/`.
Invoke them on demand; see `.devin/workflows/invoke_skills.md`.

## Quality gate

Run `bun run quality:gate` before submitting. It blocks on lint/type/test failures and on
**newly introduced** code complexity (see `docs/rules/complexity.md`).
