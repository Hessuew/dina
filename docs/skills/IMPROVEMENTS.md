# Skill Improvements Log

Append-only review queue for skill improvements. See [`SELF_IMPROVEMENT.md`](./SELF_IMPROVEMENT.md) for the rule.

**Entry format:**

```
- [YYYY-MM-DD] <skill> · type: fix|better|feature|new-skill · observation: … · suggestion: … · [auto|model]
```

`type`: `fix` (error/broken step) · `better` (improvement) · `feature` (add to existing skill) · `new-skill` (propose new skill).
Source tag: `[auto]` (hook, from a tool error) · `[model]` (agent judgment).

## Entries

<!-- newest first; remove a line once applied via PR -->

- [2026-07-04] fix-sentry · type: fix · observation: `get_sentry_resource` with `resourceType: 'breadcrumbs'` + `resourceId` also requires `organizationSlug` when not using `url`; the skill table says "Pass only resourceType + resourceId; do not pass url" but omits that organizationSlug is mandatory, causing a tool call failure · suggestion: update the skill table row for breadcrumbs to note `organizationSlug` is required alongside `resourceType` + `resourceId` · [model]

- [2026-06-23] reviewing-code · type: better · observation: staged-only review scope was requested but the skill does not say how to proceed when the staged diff cannot be read directly · suggestion: add a fallback step to request a pasted staged diff or explicitly downgrade scope before reporting findings · [model]
