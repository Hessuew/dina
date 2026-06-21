# Handoff — ADR 0010: Remove git/Graphite machinery from claim protocol

**Date:** 2026-06-18  
**Branch:** `06-18-_refactor_notifications_extract_notification_row_view-model_into_domain_module_with_tests_`

## What needs to happen

Edit `docs/adr/0010-crap-reduction-via-domain-extraction.md`, lines 257–338 only.

The goal: strip all git/commit/push/origin-main steps from the claim protocol. The `🔨 in progress` row flip + timestamp is now the **sole** reservation — no commit, no push, no origin/main check needed.

## Why the previous agent got stuck

The agent was in Plan mode and didn't make the actual edit. It read all the right content, identified all the right changes, but kept trying to reach exec/write tools that weren't available in its current mode. The plan is fully approved and ready to execute.

## Exact changes to make

All changes are in **`docs/adr/0010-crap-reduction-via-domain-extraction.md`**, in the section `#### Protocol — claim before you work (safe for parallel agents)` (lines 257–338).

### Replace lines 257–338 with this exact content

```
> **Fast path — get to work, don't investigate.** The ledger below is the single source of truth
> and is pre-populated, so picking a target is a **pure table read**. Open this file, take the top
> `⬜ todo` row by the selection rule (Sev → CRAP, Phase A hooks/pure before Phase B components),
> flip it to `🔨 in progress`, and start the TDD slice. **Do not** run `git status`, `git log`,
> `git branch`, `git diff`, or `git show <ref>:…`, and do not inspect what previous commits did,
> the current branch name, or the working-tree state to decide what to pick or to "reconcile"
> earlier agents' work — none of that changes the next target and it burns calls for nothing. No
> git operations are needed for claiming. A row someone else already finished is their problem; you
> just take the next `⬜ todo`.

> **Reserve first, unconditionally — flip the row to `🔨 in progress` before touching any code.**
> This is the always-first step for **every** agent, including a single agent on pure local changes.
> No row flip = do not start. If you find yourself writing domain/test code before the row reads
> `🔨 in progress` with a timestamp, stop and reserve first.

> **A `🔨 in progress` row is hands-off unless you wrote its `Claimed at` timestamp earlier in the
> live conversation you are running right now.** Never start, continue, verify, or finish it
> otherwise — not even to "resume" it. Only the agent that set the timestamp _within the current
> running session_ may complete the row.
>
> **"This session" means the current live agent invocation — nothing else confers ownership.** A row
> is **not** yours just because:
>
> - the **branch name** mentions the target (e.g. `…-claim-mutate-usemutation`),
> - a **prior commit** on this branch (including HEAD) claimed it,
> - the **working tree** holds a complete-looking implementation, or
> - it otherwise "looks like" your effort.
>
> None of those are evidence of ownership. The **only** valid proof is that _you_ flipped the row to
> `🔨 in progress` and wrote its timestamp during this same conversation, with that act still visible
> in your current context. If you did not do that in the session you are running right now, the row
> is **someone else's** — treat it exactly like any other in-progress row: hands-off.
>
> **Corollary — a pre-existing claim is never a task to "implement."** If you begin a session and
> find a `🔨 in progress` row (even one your branch was named for, even at HEAD), do **not** adopt it,
> resume it, or write its domain/test code. The claim half of the workflow already being done is
> **not** an invitation to do the implement half — claiming and implementing a target are one
> indivisible unit of work that must happen in the same session. Skip the row and pick the next
> `⬜ todo` row instead; claim that fresh, then implement it, all in the one session. (The >24h-stale
> reclaim rule below is the _only_ exception, and it still requires you to first flip the row back to
> `⬜ todo`, clear its timestamp, and re-claim it yourself this session.)
>
> **When you encounter a `🔨 in progress` row, simply skip it and pick the next `⬜ todo` row.** Do not
> investigate the files, check if they've been modified, or examine what's been done. The ledger is
> the single source of truth; a `🔨 in progress` row means "not available," period. Move to the next
> available target without any file inspection or git operations.

> **A `🔨 in progress` row with a `Claimed at` timestamp older than 24 hours was likely abandoned.**
> Treat it as available: flip it to `⬜ todo`, clear the timestamp to `—`, and take it as your target.

So multiple agents (local or cloud) can pay down findings at once without colliding:

1. **Pick a `⬜ todo` row and flip it to `🔨 in progress` first — before any code.** Set a UTC
   timestamp (ISO-8601, e.g. `2026-06-16T10:23Z`) in the `Claimed at` column. The row flip is
   the reservation — no commit or git operation needed.
2. **On completion, flip the row to `✅ done`** and replace the `Claimed at` timestamp with the
   completion date (YYYY-MM-DD), fill in the domain file and the finding(s)/duplicate(s) cleared,
   and drop the new `fallow health` total in the count above.
3. **Release if you abandon it** — flip the row back to `⬜ todo` and clear `Claimed at` to `—`
   so it isn't stranded as permanently "in progress".
```

### Summary of what changed and why

| Old text                                                                                                                                                        | New text                                                                             | Reason                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| Lines 263–266: `"The only git you need is the reservation commit (step 2) and, **when parallel agents may be active**, the \`origin/main\` refresh in step 1."` | `"No git operations are needed for claiming."`                                       | Remove all git references             |
| Lines 269–274: mentions "purely local Graphite stack", `origin/main` landing requirement, "No reservation commit = do not start."                               | "pure local changes", origin/main requirement removed, "No row flip = do not start." | Remove Graphite + commit requirement  |
| Lines 276–278: entire "A claim only counts once it's on `origin/main`." callout                                                                                 | _(deleted)_                                                                          | No longer relevant — no push required |
| Lines 312–315: `origin/main` in stale-row callout, commit message example                                                                                       | Remove `origin/main` qualifier, remove commit message example                        | No commits in this workflow           |
| Lines 319–331: Step 1 (origin/main refresh), Step 2 (commit + push to origin/main)                                                                              | Step 1 deleted; new Step 1 = flip row, no commit                                     | Core change                           |
| Lines 332–333: Step 3 (push rejection / rebase)                                                                                                                 | _(deleted)_                                                                          | No push = no rejection                |
| Steps 4→2, 5→3                                                                                                                                                  | Renumbered                                                                           | Steps 1 and 3 removed                 |

## Verification

After making the edit, grep for any remaining git/commit/origin/push commands in lines 257–338:

```
grep -n "gt c\|origin/main\|git fetch\|git show origin\|reservation commit\|land it on\|push is rejected\|rebase" docs/adr/0010-crap-reduction-via-domain-extraction.md
```

Should return zero matches in the protocol section.

## Files touched

- `docs/adr/0010-crap-reduction-via-domain-extraction.md` — the only file

## Suggested skills

None needed — this is a pure document edit with no code changes.
