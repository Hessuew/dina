# Skill Improvements Queue

Append-only proposals for repo-owned skill and skill/tool workflow improvements. Follow the
[improvement proposal protocol](./IMPROVEMENTS_PROTOCOL.md).

**Entry format:**

```
- [YYYY-MM-DD] <skill> · type: fix|better|feature|new-skill · observation: … · suggestion: … · [auto|model]
```

`type`: `fix` (error/broken step) · `better` (improvement) · `feature` (add to existing skill) · `new-skill` (propose new skill).
Source tag: `[auto]` (hook, from a tool error) · `[model]` (agent judgment).

## Entries

<!-- newest first; remove a line only when a focused improvement task handles it -->

- [2026-07-10] improve-codebase-architecture · type: fix · observation: the skill requires reading `LANGUAGE.md` and links to it repeatedly, but that file does not exist beside the canonical `SKILL.md` · suggestion: restore the referenced glossary or inline the complete required language so the exploration workflow has no broken dependency · [model]

- [2026-07-10] notion-axi · type: better · observation: Markdown backticks inside a shell-quoted `page update --append` value were evaluated by zsh before `notion-axi` received them, corrupting the Notion update · suggestion: warn that append content passed through the shell must avoid backticks or use single-quoted arguments · [model]

- [2026-07-07] coordinate-adr-ledger · type: better · observation: in a 4-wave run clearing all 26 open ADR-11 rows, 10 targets were stale (already ≤ 60 from prior merged work), so workers spent their runs verifying no-ops; the skill trusts the ledger snapshot as-is · suggestion: add an optional pre-wave step for the main agent to bulk-verify claimed rows with a single `npx eslint` pass over the target files and close stale rows without spawning workers for them · [model]

- [2026-07-07] coordinate-adr-ledger · type: better · observation: one worker died mid-wave on a transient server error after making partial edits; the skill has no guidance on recovery · suggestion: document that the main agent should resume the failed worker with a "check current file state first, then continue" message rather than respawning fresh or reverting · [model]

- [2026-07-07] skill-creator · type: fix · observation: `quick_validate.py` fails with `ModuleNotFoundError: No module named 'yaml'` when the active Python lacks PyYAML, but the skill does not mention using a temp venv or installing the dependency · suggestion: document the PyYAML prerequisite or make the validator self-bootstrapping/fallback to stdlib frontmatter checks · [model]

- [2026-07-05] notion-axi · type: fix · observation: `notion-axi page update <id> --prop "Name=value"` fails with "Nothing to update"; the working flag on update is `--set` (create uses `--prop`) · suggestion: document the create/update flag asymmetry in the skill, or accept `--prop` as an alias on update · [model]

- [2026-07-04] notion-knowledge-capture · type: fix · observation: Notion database writes failed on three schema details during import: `parent.data_source_id` needs the raw UUID, select options must match the exact schema (for example Service Catalog does not accept `Storage`), and date properties must use expanded `date:<field>:start` keys · suggestion: add a short "database write gotchas" note to the skill with these validation rules and a parent UUID example · [model]

- [2026-07-04] grill-with-docs · type: better · observation: when a grilling round needed a vendor-fact check (WhatsApp template constraints), WebSearch failed transiently and the skill gives no guidance on whether to block the round or proceed on training knowledge · suggestion: add a note to prefer proceeding on high-confidence knowledge for non-plan-critical facts, flagging them in the plan as "verify during implementation" · [model]

- [2026-07-04] fix-sentry · type: fix · observation: `get_sentry_resource` with `resourceType: 'breadcrumbs'` + `resourceId` also requires `organizationSlug` when not using `url`; the skill table says "Pass only resourceType + resourceId; do not pass url" but omits that organizationSlug is mandatory, causing a tool call failure · suggestion: update the skill table row for breadcrumbs to note `organizationSlug` is required alongside `resourceType` + `resourceId` · [model]

- [2026-06-23] reviewing-code · type: better · observation: staged-only review scope was requested but the skill does not say how to proceed when the staged diff cannot be read directly · suggestion: add a fallback step to request a pasted staged diff or explicitly downgrade scope before reporting findings · [model]
