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

- [2026-06-08] grill-with-docs · type: better · observation: while grilling the profile integration-test plan I framed it as the "first" service mocking external IO, but signup.integration.test.ts already established that exact vi.mock pattern + a TESTING_GUIDE note. · suggestion: in the "cross-reference with code" step, explicitly search for existing sibling implementations (e.g. other \*.integration.test.ts) before asserting a decision is net-new, to avoid duplicate-precedent framing. · [model]
- [2026-06-08] grill-with-docs · type: better · observation: the calendar integration-test task was a pure testing/refactor task with no new domain vocabulary, so the CONTEXT.md/ADR machinery never applied; grilling collapsed to two scoping questions. · suggestion: note in the skill that for testing-only or mechanical-refactor tasks the glossary/ADR steps are expected to be no-ops, so the agent doesn't manufacture ADRs to satisfy the ritual. · [model]
