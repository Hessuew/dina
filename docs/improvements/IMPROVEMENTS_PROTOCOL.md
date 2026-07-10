# Improvement Proposal Protocol

Canonical, append-only queues for improvements agents discover while working in this repository.
Record an observation **as soon as you find it**, then return to the assigned task. This preserves
focus without losing the opportunity to improve the system.

## What to do when you find an improvement

1. Choose the queue that owns the target.
2. Add one specific entry near the top, below that queue's `newest first` comment.
3. Continue the current task. Do not expand its scope to implement the proposal.

Apply a queued proposal only in a separately scoped improvement task or PR. The exception is
documentation or code that the active task itself requires: update that directly under the normal
documentation contract.

## Queue selection

| Queue                                                | Use for                                                                                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [`IMPROVEMENTS_SKILLS.md`](./IMPROVEMENTS_SKILLS.md) | Repo-owned skills, their adapters, or a skill/tool workflow that could work better.                                                     |
| [`IMPROVEMENTS_RULES.md`](./IMPROVEMENTS_RULES.md)   | Binding policy in `docs/rules/**` that is unclear, incomplete, or needs changing.                                                       |
| [`IMPROVEMENTS_MAIN.md`](./IMPROVEMENTS_MAIN.md)     | Agent entrypoints: `AGENTS.md`, `CLAUDE.md`, `docs/ENGINEERING_GUIDE.md`, `docs/DEFAULT_MODES.md`, and top-level documentation indexes. |
| [`IMPROVEMENTS_CODE.md`](./IMPROVEMENTS_CODE.md)     | Unrelated production or test code that should be corrected, simplified, or refactored.                                                  |

If code violates an existing rule, log it in the code queue and name the rule in the entry. If the
rule itself also needs clarification or a policy change, add a separate rules-queue entry.

## Shared entry requirements

Every entry must be a single Markdown list item with a date, precise target, observation,
suggested outcome, and source tag. Use `[model]` for agent judgment and `[auto]` only for a hook
that created the entry from a tool failure. Keep entries concrete enough for a later focused task
to start without rediscovering the issue.

The skills queue keeps its existing `type` values. Rules and main-document queues use
`type: fix|better|gap`. The code queue also requires `effort: <0-100>/100`:

- `1-20` — local, low-risk change in one area.
- `21-50` — bounded module work or coordinated tests.
- `51-80` — cross-cutting refactor with multiple consumers.
- `81-100` — architecture, migration, or high-risk change.

Use `0/100` only when the implementation has already been identified and is effectively no work;
otherwise choose the closest positive estimate.

## Review loop

Queues are newest first. During a focused improvement task, review the relevant entries, implement
accepted work, and remove only the entries handled by that task. Keep rejected or deferred entries
until a human decision explicitly removes them.
