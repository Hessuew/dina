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
- [2026-06-10] grill-with-docs · type: better · observation: skill says "ask one question at a time", but /plan workflow gathers decisions via batched AskUserQuestion (multiple questions per call); the two guidances conflict on cadence. · suggestion: note that under /plan the batched AskUserQuestion form satisfies the "interrogate" intent, so one-at-a-time isn't required there. · [model]
