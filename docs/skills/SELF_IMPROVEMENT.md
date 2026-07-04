# Skill Self-Improvement Rule

Single source of truth for how agents treat skills in this repo. Referenced — not copied — by
tool entrypoints and adapter folders.

## Canonical location

Repo-owned skills live once in `docs/skills/<name>/SKILL.md`. Tool dirs expose those skills as
adapters:

- `.claude/skills/<name>` → `docs/skills/<name>` (Claude Code)
- `.devin/skills/<name>` → `docs/skills/<name>` (Devin)
- `.agents/skills/<name>` → `docs/skills/<name>` for repo-local agent adapters when the skill is
  sourced from `docs/skills/`

**Edit repo-owned skills in `docs/skills/` only.** Never edit through a symlink path or fork a
copy into a tool dir.

## After using any skill

Once a skill finishes, take a moment to capture friction. Look for:

1. **Errors / non-functioning tool calls** — a tool failed, returned an error, or a step in the skill did not work as written.
2. **Could be done better** — the skill worked but a clearer instruction, fewer steps, or a different approach would improve it.
3. **Missing capability** — something the skill (or the toolset) should do but cannot. Decide whether it is a _feature_ to add to an existing skill, or a whole _new skill_.

If you find any of the above, **append one line** to [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) using the format below.

## Logging rule (logged proposals — no silent self-editing)

- **Do not edit the skill file in-session.** Improvements are proposals; a human (or a later review pass) applies them via a normal PR.
- Append-only. One entry per observation. Be specific and short.

Entry format:

```
- [YYYY-MM-DD] <skill> · type: fix|better|feature|new-skill · observation: … · suggestion: … · [auto|model]
```

- `type` — `fix` (error/broken step), `better` (improvement), `feature` (add to existing skill), `new-skill` (proposes a new skill).
- `[auto]` — written automatically by the hook from a tool-error payload.
- `[model]` — written by the agent for judgment-based observations (better / feature / new-skill).

## Review loop

Periodically (or when the log grows), triage `IMPROVEMENTS.md`: apply accepted entries by editing
the relevant `docs/skills/<name>/SKILL.md`, then remove the handled lines. `new-skill` entries
become a new `docs/skills/<name>/` dir plus the adapter links each tool needs.
