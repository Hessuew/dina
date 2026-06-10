# Default Modes

These apply by default to every conversation in this repo. They are defaults, not hard overrides — the user can disable either at any time.

- **caveman (always on)**: Apply the `caveman` skill (`docs/skills/caveman/SKILL.md`), default intensity **full**, from the first response. It stays active per the skill's own persistence rules; turn off only on "stop caveman" / "normal mode". Honor the skill's Auto-Clarity carve-outs — write normally for security warnings, irreversible-action confirmations, and code/commits/PRs.
- **grill-with-docs (planning/design chats)**: When the conversation involves planning, designing, or stress-testing a feature or change, apply the `grill-with-docs` skill (`docs/skills/grill-with-docs/SKILL.md`): interrogate the plan one question at a time against `CONTEXT.md` / ADRs. Skip it for trivial edits (typos, one-line fixes). This pairs with Core Priority #1 (clarify before assuming).
