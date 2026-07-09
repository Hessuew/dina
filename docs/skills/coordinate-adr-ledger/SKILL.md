---
name: coordinate-adr-ledger
description: Coordinate ADR ledger paydown with parallel sub-agents in the current checkout. Use when the user asks to work through ADR targets, ADR 0011 unit-size rows, ADR 0010 CRAP rows, ledger targets, or multiple sub-agents/waves for complexity paydown without git worktrees.
---

# Coordinate ADR Ledger

## Overview

Coordinate ledger-driven paydown from `docs/adr/0011-unit-size-reduction-via-component-decomposition.md` by default. Include `docs/adr/0010-crap-reduction-via-domain-extraction.md` only when the user explicitly asks for ADR 10 or CRAP targets.

The main agent owns ledger reservation, worker assignment, integration, typecheck, and final ledger updates. Workers own only the exact targets assigned to them.

## Hard Rules

- Do not create, switch, or inspect git worktrees for this workflow.
- Do not use branch names, commits, git history, or git diffs to choose targets.
- Use the live ADR ledger as the coordination source of truth.
- Claim rows before any code work starts.
- Do not let workers choose new rows or claim rows themselves.
- Treat `🔨 in progress` rows as unavailable unless the main agent claimed them in this run.
- Stop launching new worker waves after 85% of the five-hour usage window is used. At that point, consolidate, verify, update ledgers, and hand off.

## Wave Workflow

1. Record the session start time and read the requested ADR ledger. Default to ADR 11.
2. Select the next available `⬜ todo` rows using the ADR's ordering rules.
3. Bundle same-file rows into one worker assignment when that reduces conflict risk and stays coherent.
4. Claim each selected row in the ledger: set status to `🔨 in progress` and write a UTC ISO-8601 `Claimed at` timestamp.
5. Spawn 3 workers by default. Use 4 only when targets are small, disjoint, or clean same-file bundles.
6. Give each worker:
   - exact ADR path and row(s),
   - exact file(s) and function names,
   - relevant ADR method and definition of done,
   - instruction to avoid worktrees and avoid touching unassigned ledger rows,
   - instruction that other agents may edit nearby files and they must not revert unrelated changes.
7. While workers run, do only non-overlapping coordination or review work.
8. When the wave finishes, review results, resolve integration issues, and run `bun run typecheck` once for the combined wave.
9. If typecheck reveals issues, fix them in the main checkout.
10. Complete the ledger rows only after the assigned target passes its ADR-specific checks and the wave typecheck is clean.
11. Check the 85% usage cap before launching another wave.

## ADR-Specific Worker Checks

### ADR 11: Unit Size

Workers decompose oversized functions according to ADR 11. They should prefer same-file named sub-components or helpers, route branchy logic to the correct domain layer, and recursively keep every extracted function under 60 LOC.

Required worker checks:

- `npx eslint <changed-file>` must report zero `max-lines-per-function` findings for every changed production file.
- Run the relevant focused tests when domain logic was extracted.
- Run `bunx fallow audit --production-health` when a Fallow aggregate/progress check is needed; do not use stale `complexity.large_functions` filtering as the per-target pass signal.

Main-agent completion:

- Mark rows `✅ done`.
- Replace `Claimed at` with the completion date.
- Fill the sub-components/helpers extracted.
- Decrement `Current open` by the number of cleared rows.

### ADR 10: CRAP

Use ADR 10 only when explicitly requested. Workers must follow the TDD/domain-extraction playbook: characterize behavior, extract pure domain logic to the correct owner layer, and cover it at 100%.

Required worker checks:

- The target no longer appears in `bunx fallow health --format json --quiet`.
- Run the focused domain test or coverage command required by ADR 10.
- Run any relevant local tests for changed behavior.

Main-agent completion:

- Mark rows `✅ done`.
- Fill the domain file and cleared finding count.
- Replace `Claimed at` with the completion date.
- Decrement `Current open`.

## Worker Prompt Shape

Use a bounded prompt like this:

```text
You are one worker in a parallel ADR ledger paydown wave. Other agents may edit the same repo; do not revert unrelated changes.

Do not create or use git worktrees. Do not claim ledger rows. Do not choose additional targets.

ADR: <path>
Assigned row(s): <copy exact row text>
Owned file(s): <paths>
Goal: clear only these target(s) according to the ADR definition of done.

Run the ADR-specific focused checks for your changes and report:
- files changed,
- validation commands and results,
- extracted sub-components/domain files,
- any integration risk for the main agent.
```

If the available sub-agent tool uses isolated forked workspaces, still do not create manual git worktrees. Have workers return changed paths and results so the main agent can integrate according to the platform's normal sub-agent workflow.

## Handoff

When stopping because the 85% cap is reached or no safe next wave remains, leave a compact handoff:

- claimed rows and their final status,
- workers completed and checks run,
- any rows intentionally left `🔨 in progress` or reverted to `⬜ todo`,
- remaining typecheck/test/fallow concerns,
- recommended next `⬜ todo` row for the next run.
