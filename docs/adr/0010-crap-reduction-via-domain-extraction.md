# ADR 0010 — CRAP Reduction via Domain Extraction

**Status:** Accepted  
**Date:** 2026-06-15

## Context

`fallow health` reports **138 CRAP findings** (21 critical, 46 high, 71 moderate). Every one is
`exceeded: "crap"` — none breach the cyclomatic (≤20) or cognitive (≤15) limits. The code
already passes those gates; the problem is **untested complexity**: branchy functions with
`coverage_tier: "none"`, so `CRAP = CC² · (1 − cov)³ + CC` stays high.

The pull-request quality gate (`QUALITY_BASE=origin/main bun run quality:gate`) blocks _newly
introduced_ CRAP via Fallow's `introduced` flag, so the pile cannot regrow. What is missing is
a single, durable method for **paying down the existing 138** that every contributor (and every
cloud agent) follows the same way. This ADR is that playbook; it is binding like the rules in
`docs/rules/complexity.md`, which it operationalizes.

## Rules

These state of this document is the current state of the work, and should be followed as
the source of truth. No external origin/main checkups should be done.

### Workflow — work locally, never in a separate worktree

Make paydown changes **directly in the local working tree on the current branch**. Do **not**
create or switch into a separate git worktree for this work. The developer reviews the local
changes via code review and puts them forward (commits/PRs) themselves — agents do not need an
isolated worktree to keep work reversible, because the changes are reviewed before they land.

A separate worktree only adds friction here: it can branch off a stale base (missing the
`vitest.config.ts` coverage roots this playbook depends on), and it splits the changes away from
the branch the developer is actually reviewing. Edit the files in place, run the fast
verification loop locally, update this ledger, and stop — leave committing and submission to the
developer.

## Decision

Pay down CRAP by **extracting logic into the feature's `src/utils/<feature>/domain/` layer and
covering it with unit tests**, built **test-first (TDD)**. We do not lower CRAP with jsdom /
render tests, and we do not suppress findings to avoid the work.

### Method — TDD, red→green→refactor, vertical slices

Drive each extraction one test at a time (red→green→refactor — no skill invocation needed once the workflow is internalized):

1. **Tracer bullet** — write one failing test for one observable behavior (`bun run test` →
   RED), then the minimal domain code to pass (GREEN).
2. **Incremental loop** — repeat one behavior per cycle until the function's behavior is
   covered. The existing function's known behavior **is** the spec (this is characterization of
   working code).
3. **Refactor call sites only once GREEN** — never refactor while RED.

Tests bind to the **public function signature only**, so the subsequent call-site swap is a
behavior-preserving refactor and the tests stay green throughout. **Do not** write all tests up
front then all code (horizontal slicing) — that produces tests of imagined shape, not behavior.

### Two fixes, by function kind

**Placement rule — where the domain file lives depends on the owner's layer:**

- **`src/utils/<feature>/domain/`** — for domain logic that belongs to a server function or
  shared backend feature (repository types, service orchestration, multi-consumer logic).
  `src/utils/` is server-function territory; its domain layer must stay there.
- **`src/hooks/<hookName>/domain/`** — for domain logic that belongs exclusively to a single
  React hook (hook view-model, carousel planners, mutation state derivation). The hook becomes
  a folder with an `index.ts` (the hook itself) and a `domain/` subfolder. Simple hooks with no
  extracted domain stay as flat files.
- **`src/components/<area>/.../domain/`** — for domain logic owned by the component layer (a
  component, a route, or a component-area helper like a table action builder). Put it in a
  `domain/` folder **colocated with its use site** — in the same parent folder as the component
  or helper it serves — never in a far-away `src/utils/<feature>/` folder.

**The boundary is ownership, not multi-consumer-ness — domain lives next to its owner.** A
helper used by several components is still component-layer code: colocate it in a `domain/`
folder beside those components, do **not** relocate it into `src/utils/`. `src/utils/<feature>/`
is reserved for logic genuinely owned by a server function or shared backend feature. Pushing a
component helper into `src/utils/` (or a hook's logic into `src/utils/`) scatters it far from
where it is read and is a placement bug. All four coverage roots — `src/domain/**`,
`src/utils/**/domain/**`, `src/hooks/**/domain/**`, `src/components/**/*.domain.ts` — are gated at
100% in `vitest.config.ts`, so a colocated component `*.domain.ts` file is covered automatically.
(The component glob matches the file suffix, not a `domain/` path segment, so it covers both the
colocated `<area>/<component>/<name>.domain.ts` layout and any legacy `<area>/domain/` subfolder.)

- **Pure function / hook** (e.g. `getYoutubeVideoId`, `getUserFriendlyError`, a hook's
  `handleKeyDown`): TDD a canonical copy into the appropriate domain layer (see placement rule
  above) with a colocated `<name>.domain.test.ts` at 100% coverage, then swap the original site
  to import it. Coverage rises → CRAP collapses. No behavior change.
- **React component / route body** (e.g. `EvaluationOverlay`, `MediaCard`, `SignupForm`):
  extract the pure view-model logic — initial-value/input builders, validation, mode/branch
  derivation — into a `domain/` folder **colocated with the component** (per the placement rule
  above) and unit-test it. The component shell shrinks to orchestration, so its
  cyclomatic/cognitive — and therefore CRAP — fall under threshold. **Never** add `*.test.tsx`
  render tests. Use a colocated `<name>.logic.ts` only for glue that genuinely does not belong
  in a `domain/` file.

  **Phase B React Compiler pitfall — stable-ref consumers.** When you extract a named
  sub-component that receives a prop whose _identity_ is stable but whose internal state
  changes (a **stable-ref consumer** — e.g. a TanStack `useReactTable` instance), the React
  Compiler will memoize the new component on the stable ref and it will silently go stale.
  The fix is `'use no memo'` as the first statement of the function body with a comment
  naming the prop. This is a binding rule — see `docs/rules/react-compiler-memo.md`. The
  DataTable modularization is the canonical example: all four extracted sub-components
  (`DataTableHead`, `DataTableRows`, `DataTableContent`, `PaginationFooter`) carry this
  directive for exactly this reason.

All of `src/utils/**/domain/**`, `src/hooks/**/domain/**`, and `src/components/**/*.domain.ts` are
in `vitest.config.ts` coverage at 100% lines/branches/functions/statements, so extracted domain
files in any of these layers are gated automatically.

### Coverage escape hatch — genuinely-unreachable branches only

The 100% domain-coverage gate is a **bright line** and stays at 100%: extracted domain logic
must be fully covered, because the CRAP collapse this playbook relies on
(`CRAP = CC² · (1 − cov)³ + CC`) depends on coverage reaching 1. Do **not** lower the threshold,
and do **not** write hollow tests that execute a line without asserting its behavior just to buy
the number.

The single sanctioned exception is a branch that is **genuinely unreachable** — a defensive
guard or `?? fallback` that no input can trigger because the type system already excludes it
(e.g. a `?? DEFAULT` after an exhaustive enum lookup). For those, and only those, mark the branch
with a v8 ignore directive plus a justification, mirroring the `fallow-ignore-next-line`
convention in `docs/rules/complexity.md`:

```ts
// the enum lookup is exhaustive over CalendarEvent['type']; this fallback is unreachable
/* v8 ignore next -- defensive default, no input reaches it */
return TYPE_CHIP[event.type] ?? TYPE_CHIP.other
```

Never use it to skip a **reachable** branch you simply did not test — write the test instead. A
`v8 ignore` without a justification comment is a code-review failure, exactly like an unjustified
`fallow-ignore`.

### Sequencing

- **Phase A — pure functions / hooks**, then **Phase B — components**. DONE, we focus on components now
- Within each phase, work **critical → high → moderate**.
- **Prefer duplicated targets first within a tier.** Run `bunx fallow dupes --format json`; a
  helper that exists in N files is an N-for-one win — a single extraction clears every copy's
  CRAP finding _and_ removes the fallow duplicate. (The first target cleared two copies; a
  later sweep found a third.)
- **Within a tier, prioritize hooks/functions over components.** DONE, we focus on components now
  When selecting targets from a severity tier (critical/high/moderate), choose hooks, functions, or similar non-component
  targets first; choose components last. This front-loads the cheaper extractions and defers
  the heavier component view-model work.
- **When components must be chosen, take first from the top of the list, and don't read further.**
  When the only remaining targets in a tier are components, select from the top of the fallow health output (i.e.,
  the most severe/moderate ones first) to build momentum before tackling the harder cases.

**Batching within a session** — Phase A pure functions are fast; 3–5 per session is fine.
Phase B component extractions are heavier (understanding the component is the real cost), so
limit to **2–3 same-feature targets per session/commit**. Never batch across features in one
commit — lost context produces shallow extractions that pass coverage but miss branches.

Rationale: pure extractions are cheap, low-risk, and drop CRAP fastest, so they front-load the
burndown; component view-model extraction is higher-effort and follows once the pure wins are
banked.

### Reconciling divergent near-duplicates

"Duplicates" are often **not identical** — copies drift (one handles `/shorts/`, another
normalizes scheme-less URLs, etc.). Unify them onto the **superset** canonical util, but only
after confirming, per call site, that the extra branches are either **inert** (that input never
reaches the site) or a **safe broadening** (the site now handles a URL it previously rejected,
which is an improvement, not a regression). Because the shared util's tests already specify the
superset behavior at 100%, the call-site swap stays a pure refactor against a green spec — you
do **not** write new tests for an already-tested superset; you only verify the delta is benign.
Note any deliberate broadening in the commit message so it is not mistaken for an accident.

### Definition of done (per target)

- The function no longer appears in `bunx fallow health --format json --quiet`.
- `bun run test:coverage` green at 100% for the new domain file.
- Direct target tests and both focused verification lanes clean.
- **No behavior change** (tests bound to the public interface stay green across the swap), or a
  deliberate **broadening** noted per "Reconciling divergent near-duplicates".

### Verification — the fast loop (don't run the full gate every cycle)

The full `bun run quality:gate` belongs only to pull-request CI. During implementation:

1. **Progress metric (cheap, no test run):** `bunx fallow health --format json --quiet` — the
   target finding is gone and the total dropped. This _is_ the burndown number. The count is
   **production-only**: `.fallowrc.json` `health.ignore` excludes `**/*.test.ts(x)` and
   `**/*.integration.test.ts` from complexity analysis (schema: _"Glob patterns to exclude from
   complexity analysis"_), so a target's own `*.domain.test.ts` never lands in `findings` and
   inflates the burndown. This is the same exclusion ADR 0011 relies on — one config key serves
   both CRAP and unit-size.
2. **Coverage of the new domain file:** `bun run test:coverage` (or a scoped `vitest run` on the
   `*.domain.test.ts` during red→green).
3. **Before handoff, once:** run `QUALITY_BASE=<pre-change-ref> bun run verify:focused:static`
   and `QUALITY_BASE=<pre-change-ref> bun run verify:focused:test`. The static lane isolates
   introduced complexity for this target; the test lane avoids the full unit suite and escalates
   integration only when the changed paths require it.
4. **PR CI:** let the pull-request workflow run `QUALITY_BASE=origin/main bun run quality:gate`
   exactly once. Do not repeat it locally.

### Worked example (first target)

`getYoutubeVideoId` existed **three** times with divergent implementations —
`src/components/library/MediaCard.tsx` (CRAP 156), `src/routes/_authed/library/index.tsx`
(CRAP 132), and `src/components/library/MediaDetailViewer.tsx` (CRAP 90). It was TDD'd into
`src/utils/library/domain/youtube.domain.ts` (+ `youtube.domain.test.ts`) and all three sites
now import it. The first two were behavior-neutral swaps; the third was a **safe broadening**
(its local copy lacked scheme-less normalization and `/shorts/`, so it now embeds URLs it
previously rejected) reconciled onto the already-tested superset — no new tests needed. This
removed **three CRAP findings and the fallow duplicate** — the canonical pattern for Phase A.

### Tracking & the progress ledger

Progress is the `fallow health` finding count; baseline **138 (21 critical / 46 high / 71
moderate)** as of 2026-06-15. The gate prevents regressions, so the count only moves down. The
full worklist below is pre-populated from this snapshot.

**Current open:** 32 (0 critical / 2 high / 30 moderate)

The **ledger** below is the durable record of what has been fixed and what is being worked on
right now. It is the single source of truth for the burndown — keep it current as part of every
target's change, not as an afterthought.

#### Protocol — claim before you work (safe for parallel agents)

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
   and decrement **Current open** above by the number of findings cleared.
3. **Release if you abandon it** — flip the row back to `⬜ todo` and clear `Claimed at` to `—`
   so it isn't stranded as permanently "in progress".

#### Ledger

The worklist below is **pre-populated with every open finding** from a single
`bunx fallow health` snapshot (baseline 2026-06-15) so you do **not** re-run fallow to pick a
target — pick the top `⬜ todo` row by **Sev** then **CRAP** (critical → high → moderate, CRAP
desc; the table is already in that order). The `Sev`/`CRAP` columns are the finding's severity
and CRAP score at snapshot time; `Files / sites` is the declaration site (`path:line`). Only
flip statuses (`⬜ todo` → `🔨 in progress` → `✅ done`) as you work — no fallow run is needed
to choose work, only to confirm `Done` per the verification loop above. New findings the gate
might surface later are appended as fresh `⬜ todo` rows.

| Status  | Sev     | CRAP | Target (function)                 | Kind        | Files / sites                                                                | Domain file                                                                                         | Cleared                                               | Claimed at        |
| ------- | ------- | ---- | --------------------------------- | ----------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------- |
| ✅ done | —       | —    | `getYoutubeVideoId`               | A pure      | `MediaCard.tsx`, `routes/_authed/library/index.tsx`, `MediaDetailViewer.tsx` | `src/utils/library/domain/youtube.domain.ts`                                                        | 3 CRAP findings + 1 fallow dupe                       | 2026-06-15        |
| ✅ done | —       | —    | `getUserFriendlyError`            | A pure      | `components/auth/login-form.tsx`                                             | `src/utils/auth/domain/login-error.domain.ts`                                                       | 1 CRAP finding (CRAP 156)                             | 2026-06-15        |
| ✅ done | —       | —    | `handleKeyDown`                   | A hook      | `src/hooks/useEvaluationKeyboard.ts`                                         | `src/utils/enrolment/domain/evaluation-keyboard.domain.ts`                                          | 1 CRAP finding (CRAP 156)                             | 2026-06-15        |
| ✅ done | 🔴 crit | 210  | `EvaluationOverlay`               | B component | `src/components/enrollment/EvaluationOverlay.tsx:245`                        | `src/components/enrollment/domain/evaluation-overlay.domain.ts`                                     | 1 CRAP finding (CRAP 210)                             | 2026-06-18        |
| ✅ done | 🔴 crit | 210  | `<arrow>`                         | B component | `src/components/view/AssignmentsView.tsx:137`                                | `src/components/view/domain/assignments-view.domain.ts`                                             | 1 CRAP finding (CRAP 210)                             | 2026-06-18        |
| ✅ done | 🔴 crit | 156  | `LessonRow`                       | B component | `src/components/course/CourseDetailSections.tsx:323`                         | `src/components/course/domain/lesson-row.domain.ts`                                                 | 1 CRAP finding (CRAP 156)                             | 2026-06-18        |
| ✅ done | 🔴 crit | 156  | `MediaCard`                       | B component | `src/components/library/MediaCard.tsx:75`                                    | `src/components/library/domain/media-card.domain.ts`                                                | 1 CRAP finding (CRAP 156)                             | 2026-06-18        |
| ✅ done | 🔴 crit | 156  | `AssignmentDetailComponent`       | B component | `src/routes/_authed/assignments/$assignmentId.tsx:86`                        | `src/utils/assignments/domain/assignment-detail.domain.ts`                                          | 1 CRAP finding (CRAP 156)                             | 2026-06-18        |
| ✅ done | 🔴 crit | 132  | `SignupForm`                      | B component | `src/components/auth/signup-form.tsx:90`                                     | `src/components/auth/domain/signup-form.domain.ts`                                                  | 1 CRAP finding (CRAP 132)                             | 2026-06-18        |
| ✅ done | 🔴 crit | 132  | `NotificationRow`                 | B component | `src/components/navigation/NotificationsMenu.tsx:181`                        | `src/components/navigation/domain/notification-row.domain.ts`                                       | 1 CRAP finding (CRAP 132)                             | 2026-06-18        |
| ✅ done | 🔴 crit | 132  | `navigate`                        | B component | `src/routes/_authed/enrollments/index.tsx:129`                               | `src/utils/enrolment/domain/enrollments-navigation.domain.ts`                                       | 1 CRAP finding (CRAP 132)                             | 2026-06-19        |
| ✅ done | 🔴 crit | 110  | `renderIconWithOverrides`         | B component | `src/components/animate-ui/icons/icon.tsx:545`                               | `src/components/animate-ui/icons/domain/icon-animation.domain.ts`                                   | 1 CRAP finding (CRAP 110)                             | 2026-06-19        |
| ✅ done | 🔴 crit | 110  | `CourseDialog`                    | B component | `src/components/dialog/CourseDialog.tsx:154`                                 | `src/components/dialog/domain/course-dialog.domain.ts`                                              | 1 CRAP finding (CRAP 110)                             | 2026-06-19        |
| ✅ done | 🔴 crit | 110  | `CommentsSection`                 | B component | `src/components/post/PostCard.tsx:315`                                       | `src/components/post/domain/comments-section.domain.ts`                                             | 1 CRAP finding (CRAP 110)                             | 2026-06-19        |
| ✅ done | 🔴 crit | 110  | `EmptyState`                      | B component | `src/components/ui/empty-state.tsx:19`                                       | `src/components/ui/domain/empty-state.domain.ts`                                                    | 1 CRAP finding (CRAP 110)                             | 2026-06-19        |
| ✅ done | 🔴 crit | 110  | `useEntityMutation`               | A hook      | `src/hooks/useEntityMutation.ts:58`                                          | `src/utils/mutation/domain/entity-mutation.domain.ts`                                               | 1 CRAP finding (CRAP 110)                             | 2026-06-16        |
| ✅ done | 🔴 crit | 110  | `CourseDetailComponent`           | B component | `src/routes/_authed/courses/$courseId.tsx:46`                                | `src/utils/courses/domain/course-detail.domain.ts`                                                  | 1 CRAP finding (CRAP 110)                             | 2026-06-19        |
| ✅ done | 🔴 crit | 110  | `validateSearch`                  | A pure      | `src/routes/_authed/enrollments/index.tsx:18`                                | `src/utils/enrolment/domain/enrollments-search.domain.ts`                                           | 1 CRAP finding (CRAP 110)                             | 2026-06-15        |
| ✅ done | 🔴 crit | 110  | `LessonDetailComponent`           | B component | `src/routes/_authed/lessons/$lessonId.tsx:52`                                | `src/utils/lessons/domain/lesson-detail.domain.ts`                                                  | 1 CRAP finding (CRAP 110)                             | 2026-06-19        |
| ✅ done | 🔴 crit | 110  | `PostsComponent`                  | B component | `src/routes/_authed/posts.tsx:62`                                            | `src/utils/post/domain/posts-view.domain.ts`                                                        | 1 CRAP finding (CRAP 110)                             | 2026-06-19        |
| ✅ done | 🟠 high | 90   | `<arrow>`                         | B component | `src/components/auth/signup-form.tsx:386`                                    | `src/components/auth/domain/signup-form.domain.ts`                                                  | 1 CRAP finding (CRAP 90)                              | 2026-06-18        |
| ✅ done | 🟠 high | 90   | `TeacherCard`                     | B component | `src/components/card/TeacherCard.tsx:26`                                     | `src/components/card/domain/teacher-card.domain.ts`                                                 | 1 CRAP finding (CRAP 90)                              | 2026-06-19        |
| ✅ done | 🟠 high | 90   | `EventDetailsSection`             | B component | `src/components/dialog/EventPreviewModal.tsx:124`                            | `src/components/dialog/domain/event-preview-modal.domain.ts`                                        | 1 CRAP finding (CRAP 90)                              | 2026-06-19        |
| ✅ done | 🟠 high | 90   | `ProfileModal`                    | B component | `src/components/dialog/ProfileModal.tsx:63`                                  | `src/components/dialog/domain/profile-modal.domain.ts`                                              | 1 CRAP finding (CRAP 90)                              | 2026-06-19        |
| ✅ done | 🟠 high | 90   | `EnrollmentDetails`               | B component | `src/components/enrollment/EnrollmentDetails.tsx:45`                         | `src/components/enrollment/domain/enrollment-details.domain.ts`                                     | 1 CRAP finding (CRAP 90)                              | 2026-06-19        |
| ✅ done | 🟠 high | 90   | `getYoutubeVideoId`               | B component | `src/components/library/MediaDetailViewer.tsx:21`                            | `src/utils/library/domain/youtube.domain.ts` (reused canonical superset)                            | 1 CRAP finding (CRAP 90) + local dupe removed         | 2026-06-19        |
| ✅ done | 🟠 high | 90   | `MediaContent`                    | B component | `src/components/library/MediaDetailViewer.tsx:128`                           | `src/components/library/domain/media-content.domain.ts`                                             | 1 CRAP finding (CRAP 90)                              | 2026-06-19        |
| ✅ done | 🟠 high | 90   | `AssignmentsView`                 | B component | `src/components/view/AssignmentsView.tsx:49`                                 | `src/components/view/domain/assignments-view.domain.ts`                                             | 1 CRAP finding (CRAP 90)                              | 2026-06-19        |
| ✅ done | 🟠 high | 72   | `CourseCard`                      | B component | `src/components/card/CourseCard.tsx:271`                                     | `src/components/card/domain/course-card.domain.ts`                                                  | 1 CRAP finding (CRAP 72)                              | 2026-06-19        |
| ✅ done | 🟠 high | 72   | `AssignmentDialog`                | B component | `src/components/dialog/AssignmentDialog.tsx:202`                             | src/components/dialog/domain/assignment-dialog.domain.ts                                            | 1 CRAP finding (CRAP 72)                              | 2026-06-19        |
| ✅ done | 🟠 high | 72   | `getDefaultValues`                | B component | `src/components/dialog/EventDialog.tsx:83`                                   | `src/components/dialog/domain/event-dialog.domain.ts`                                               | 1 CRAP finding (CRAP 72)                              | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `EventViewMode`                   | B component | `src/components/dialog/EventDialog.tsx:125`                                  | `src/components/dialog/domain/event-dialog.domain.ts`                                               | 1 CRAP finding (CRAP 72)                              | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `<arrow>`                         | B component | `src/components/dialog/MediaDialog.tsx:381`                                  | `src/components/dialog/domain/media-dialog.domain.ts`                                               | 1 CRAP finding (CRAP 72)                              | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `MediaDialog`                     | B component | `src/components/dialog/MediaDialog.tsx:140`                                  | `src/components/dialog/domain/media-dialog.domain.ts`                                               | 1 CRAP finding (CRAP 72)                              | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `<arrow>`                         | B component | `src/components/list/UpcomingAssignmentsList.tsx:69`                         | `src/components/list/domain/upcoming-assignments-list.domain.ts`                                    | 1 CRAP finding (CRAP 72)                              | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `NotificationTriggerButton`       | B component | `src/components/navigation/NotificationsMenu.tsx:56`                         | `src/components/navigation/domain/notifications-menu.domain.ts`                                     | 1 CRAP finding (CRAP 72)                              | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `FormDialog`                      | B component | `src/components/ui/form-dialog.tsx:63`                                       | `src/components/ui/domain/form-dialog.domain.ts`                                                    | 1 CRAP finding (CRAP 72)                              | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `Sidebar`                         | B component | `src/components/ui/sidebar.tsx:158`                                          | `src/components/ui/domain/sidebar.domain.ts`                                                        | 1 CRAP finding (CRAP 72)                              | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `useEnrollmentReview`             | A hook      | `src/hooks/useEnrollmentReview.ts:57`                                        | `src/utils/enrolment/domain/enrollment-review.domain.ts`                                            | 1 CRAP finding (CRAP 72)                              | 2026-06-16        |
| ✅ done | 🟠 high | 72   | `<arrow>`                         | B component | `src/routes/__root.tsx:26`                                                   | `src/utils/auth/domain/user-context.domain.ts`                                                      | 1 CRAP finding (CRAP 72)                              | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `<arrow>`                         | B component | `src/routes/_authed/courses/$courseId.tsx:93`                                | `src/utils/courses/domain/course-detail.domain.ts` (subsumed by `CourseDetailComponent` extraction) | 1 CRAP finding (CRAP 72) — already absent from fallow | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `EnrollmentsPage`                 | B component | `src/routes/_authed/enrollments/index.tsx:65`                                | `src/utils/enrolment/domain/enrollments-page.domain.ts`                                             | 1 CRAP finding (CRAP 90)                              | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `LibraryComponent`                | B component | `src/routes/_authed/library/index.tsx:33`                                    | `src/utils/library/domain/library-view.domain.ts`                                                   | 1 CRAP finding (CRAP 72)                              | 2026-06-20        |
| ✅ done | 🟠 high | 72   | `<arrow>`                         | B component | `src/routes/_authed/students/$studentId.tsx:160`                             | —                                                                                                   | —                                                     | 2026-06-20T14:00Z |
| ✅ done | 🟠 high | 56   | `run`                             | B component | `src/components/animate-ui/icons/icon.tsx:345`                               | — (already absent from fallow — cleared by prior icon.tsx refactoring)                              | 1 CRAP finding (CRAP 56) — already gone               | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `SubmissionStatusCard`            | B component | `src/components/assignment/AssignmentDetailSections.tsx:136`                 | `src/components/assignment/domain/assignment-detail-sections.domain.ts`                             | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `handleKeyDown`                   | B component | `src/components/auth/enrolment-form.tsx:220`                                 | `src/components/auth/domain/enrolment-form.domain.ts`                                               | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `<arrow>`                         | B component | `src/components/dialog/EventPreviewModal.tsx:85`                             | `src/components/dialog/domain/event-preview-modal.domain.ts`                                        | 1 CRAP finding (CRAP 56)                              | 2026-06-19        |
| ✅ done | 🟠 high | 56   | `getInitialValues`                | B component | `src/components/dialog/LessonDialog.tsx:45`                                  | `src/components/dialog/domain/lesson-dialog.domain.ts`                                              | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `onSubmit`                        | B component | `src/components/dialog/LessonDialog.tsx:80`                                  | `src/components/dialog/domain/lesson-dialog.domain.ts`                                              | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `resolveDocumentUrl`              | B component | `src/components/dialog/MediaDialog.tsx:100`                                  | `src/components/dialog/media-dialog/media-dialog.domain.ts`                                         | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `<arrow>`                         | B component | `src/components/dialog/MediaDialog.tsx:228`                                  | `src/components/dialog/domain/media-dialog.domain.ts` (computeOpenResetState)                       | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `TeacherModal`                    | B component | `src/components/dialog/TeacherModal.tsx:25`                                  | `src/components/dialog/domain/teacher-modal.domain.ts`                                              | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `ZoomLinkDialog`                  | B component | `src/components/dialog/ZoomLinkDialog.tsx:89`                                | `src/components/dialog/domain/zoom-link-dialog.domain.ts`                                           | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `AwardRow`                        | B component | `src/components/landing/about.tsx:52`                                        | `src/components/landing/domain/about.domain.ts`                                                     | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `LandingScriptureSectionHeader`   | B component | `src/components/landing/primitives/primitives.tsx:291`                       | `src/components/landing/primitives/landing-scripture-section-header.domain.ts`                      | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `handleMessage`                   | B component | `src/components/library/YouTubeEmbed.tsx:97`                                 | `src/components/library/youtube-embed.domain.ts`                                                    | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `CourseListInternal`              | B component | `src/components/list/CourseList.tsx:47`                                      | `src/components/list/domain/course-list.domain.ts`                                                  | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `UserText`                        | B component | `src/components/navigation/nav-user.tsx:90`                                  | `src/components/navigation/domain/nav-user.domain.ts`                                               | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `NavUserMenuContent`              | B component | `src/components/navigation/nav-user.tsx:187`                                 | — (already absent from fallow — cleared by prior NavUser refactoring)                               | 1 CRAP finding (CRAP 56) — already gone               | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `NotificationMenuHeader`          | B component | `src/components/navigation/NotificationsMenu.tsx:120`                        | `src/components/navigation/domain/notifications-menu.domain.ts`                                     | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `getFirstError`                   | A pure      | `src/components/ui/app-form-fields.tsx:66`                                   | `src/components/ui/app-form-fields.domain.ts`                                                       | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `FormFieldNumberInput`            | B component | `src/components/ui/form-field.tsx:92`                                        | `src/components/ui/form-field.domain.ts`                                                            | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `<arrow>`                         | B component | `src/components/view/CalendarView.tsx:152`                                   | `src/components/view/calendar-view.domain.ts`                                                       | 1 CRAP finding (CRAP 56)                              | 2026-06-20        |
| ✅ done | 🟠 high | 56   | `requestPasswordResetService`     | A pure      | `src/utils/password-reset/service/password-reset.service.ts:22`              | `src/utils/password-reset/domain/password-reset-flow.domain.ts`                                     | 1 CRAP finding (CRAP 56)                              | 2026-06-16        |
| ✅ done | 🟠 high | 56   | `resetPasswordService`            | A pure      | `src/utils/password-reset/service/password-reset.service.ts:111`             | `src/utils/password-reset/domain/password-reset-flow.domain.ts`                                     | 1 CRAP finding (CRAP 56)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 42   | `continueLoop`                    | B component | `src/components/animate-ui/icons/icon.tsx:334`                               | `src/components/animate-ui/icons/icon-animation.domain.ts` (`runContinueLoop`)                      | 1 CRAP finding (CRAP 42)                              | 2026-06-20        |
| ✅ done | 🟡 mod  | 42   | `getVariants`                     | B component | `src/components/animate-ui/icons/icon.tsx:734`                               | `src/components/animate-ui/icons/domain/icon-animation.domain.ts`                                   | 1 CRAP finding (CRAP 42)                              | 2026-06-19        |
| ✅ done | 🟡 mod  | 42   | `validYear`                       | B component | `src/components/auth/enrolment-form.tsx:55`                                  | `src/components/auth/domain/enrolment-form.domain.ts`                                               | 1 CRAP finding (CRAP 42)                              | 2026-06-20        |
| ✅ done | 🟡 mod  | 42   | `<arrow>`                         | B component | `src/components/auth/enrolment-form.tsx:135`                                 | `src/components/auth/enrolment-form/enrolment-form.domain.ts` (`runEnrolmentSuccessEffects`)        | 1 CRAP finding (CRAP 42)                              | 2026-06-20        |
| ✅ done | 🟡 mod  | 42   | `ResetPasswordForm`               | B component | `src/components/auth/reset-password-form.tsx:25`                             | `src/components/auth/reset-password-form.domain.ts`                                                 | 1 CRAP finding (CRAP 42)                              | 2026-06-20        |
| ✅ done | 🟡 mod  | 42   | `LessonActions`                   | B component | `src/components/course/CourseDetailSections.tsx:254`                         | `src/components/course/lesson-actions.domain.ts`                                                    | 1 CRAP finding (CRAP 42)                              | 2026-06-20        |
| ✅ done | 🟡 mod  | 42   | `onSubmit`                        | B component | `src/components/dialog/AssignmentDialog.tsx:240`                             | src/components/dialog/domain/assignment-dialog.domain.ts                                            | 1 CRAP finding (CRAP 42)                              | 2026-06-19        |
| ⬜ todo | 🟡 mod  | 42   | `onSubmit`                        | B component | `src/components/dialog/CourseDialog.tsx:217`                                 | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `EventDialog`                     | B component | `src/components/dialog/EventDialog.tsx:397`                                  | —                                                                                                   | —                                                     | —                 |
| ✅ done | 🟡 mod  | 42   | `EventPreviewModal`               | B component | `src/components/dialog/EventPreviewModal.tsx:183`                            | `src/components/dialog/domain/event-preview-modal.domain.ts`                                        | 1 CRAP finding (CRAP 42)                              | 2026-06-19        |
| ✅ done | 🟡 mod  | 42   | `onSubmit`                        | B component | `src/components/dialog/MediaDialog.tsx:184`                                  | `src/components/dialog/media-dialog/media-dialog.domain.ts`                                         | 1 CRAP finding (CRAP 42)                              | 2026-06-20        |
| ⬜ todo | 🟡 mod  | 42   | `GemLecturerCard`                 | B component | `src/components/landing/lecturers.tsx:242`                                   | —                                                                                                   | —                                                     | —                 |
| ✅ done | 🟡 mod  | 42   | `resolveMediaTypeConfig`          | B component | `src/components/library/MediaCard.tsx:62`                                    | `src/components/library/domain/media-card.domain.ts`                                                | 1 CRAP finding (CRAP 42)                              | 2026-06-18        |
| ⬜ todo | 🟡 mod  | 42   | `Header`                          | B component | `src/components/navigation/Header.tsx:52`                                    | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `PostHeader`                      | B component | `src/components/post/PostCard.tsx:95`                                        | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `CommentHeader`                   | B component | `src/components/post/PostCard.tsx:596`                                       | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `handlePaginationChange`          | B component | `src/components/table/DataTable.tsx:514`                                     | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `DataTable`                       | B component | `src/components/table/DataTable.tsx:455`                                     | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `FormFieldInput`                  | B component | `src/components/ui/form-field.tsx:37`                                        | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `FormFieldTextarea`               | B component | `src/components/ui/form-field.tsx:149`                                       | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `FormFieldSelect`                 | B component | `src/components/ui/form-field.tsx:201`                                       | —                                                                                                   | —                                                     | —                 |
| ✅ done | 🟡 mod  | 42   | `goNext`                          | A hook      | `src/hooks/useEnrollmentReview.ts:156`                                       | `src/utils/enrolment/domain/enrollment-review.domain.ts`                                            | 1 CRAP finding (CRAP 42)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 42   | `goPrev`                          | A hook      | `src/hooks/useEnrollmentReview.ts:176`                                       | `src/utils/enrolment/domain/enrollment-review.domain.ts`                                            | 1 CRAP finding (CRAP 42)                              | 2026-06-16        |
| ⬜ todo | 🟡 mod  | 42   | `CalendarComponent`               | B component | `src/routes/_authed/calendar.tsx:75`                                         | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `EnrollmentDetailPage`            | B component | `src/routes/_authed/enrollments/$enrollmentId.tsx:62`                        | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `MediaDetailComponent`            | B component | `src/routes/_authed/library/$mediaId.tsx:18`                                 | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `StudentDetailComponent`          | B component | `src/routes/_authed/students/$studentId.tsx:18`                              | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 42   | `VerifyEmailChangeComp`           | B component | `src/routes/verify-email-change.tsx:19`                                      | —                                                                                                   | —                                                     | —                 |
| ✅ done | 🟡 mod  | 42   | `<arrow>` (createEvent)           | A pure      | `src/utils/event/events.ts:59`                                               | `src/utils/event/domain/event-input.domain.ts`                                                      | 1 CRAP finding (CRAP 42)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 42   | `<arrow>` (updateEvent)           | A pure      | `src/utils/event/events.ts:80`                                               | `src/utils/event/domain/event-input.domain.ts`                                                      | 1 CRAP finding (CRAP 42)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 30   | `runCheck`                        | A pure      | `scripts/quality-fix.mjs:17`                                                 | `scripts/quality-fix.domain.mjs`                                                                    | 1 CRAP finding (CRAP 30)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 30   | `runInheritedCheck`               | A pure      | `scripts/quality-gate.mjs:62`                                                | `scripts/quality-fix.domain.mjs` (reused `describeCheck`/`interpretCheckResult`/`formatCommand`)    | 1 CRAP finding (CRAP 30) + `formatCommand` dupe       | 2026-06-16        |
| ✅ done | 🟡 mod  | 30   | `extractJson`                     | A pure      | `scripts/quality-gate.mjs:92`                                                | `scripts/quality-gate.domain.mjs`                                                                   | 1 CRAP finding (CRAP 30)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 30   | `reportFallowOutcome`             | A pure      | `scripts/quality-gate.mjs:239`                                               | `scripts/quality-gate.domain.mjs`                                                                   | 1 CRAP finding (CRAP 30)                              | 2026-06-16        |
| ⬜ todo | 🟡 mod  | 30   | `completeStoppedAnimation`        | B component | `src/components/animate-ui/icons/icon.tsx:269`                               | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `AnimateIcon`                     | B component | `src/components/animate-ui/icons/icon.tsx:124`                               | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `mergeProps`                      | B component | `src/components/animate-ui/primitives/animate/slot.tsx:38`                   | —                                                                                                   | —                                                     | —                 |
| ✅ done | 🟡 mod  | 30   | `SubmissionHeader`                | B component | `src/components/assignment/AssignmentDetailSections.tsx:105`                 | `src/components/assignment/domain/assignment-detail-sections.domain.ts`                             | 1 CRAP finding (CRAP 30)                              | 2026-06-20        |
| ⬜ todo | 🟡 mod  | 30   | `EnrolmentForm`                   | B component | `src/components/auth/enrolment-form.tsx:130`                                 | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `ForgotPasswordForm`              | B component | `src/components/auth/forgot-password-form.tsx:17`                            | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `LoginForm`                       | B component | `src/components/auth/login-form.tsx:20`                                      | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `CourseProgressCard`              | B component | `src/components/course/CourseDetailSections.tsx:96`                          | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `LessonsSection`                  | B component | `src/components/course/CourseDetailSections.tsx:412`                         | —                                                                                                   | —                                                     | —                 |
| ✅ done | 🟡 mod  | 30   | `getAssignmentInitialValues`      | B component | `src/components/dialog/AssignmentDialog.tsx:85`                              | src/components/dialog/domain/assignment-dialog.domain.ts                                            | 1 CRAP finding (CRAP 30)                              | 2026-06-19        |
| ✅ done | 🟡 mod  | 30   | `SubmissionPreview`               | B component | `src/components/dialog/AssignmentDialog.tsx:166`                             | src/components/dialog/domain/assignment-dialog.domain.ts                                            | 1 CRAP finding (CRAP 30)                              | 2026-06-19        |
| ✅ done | 🟡 mod  | 30   | `<arrow>`                         | B component | `src/components/dialog/AssignmentDialog.tsx:343`                             | src/components/dialog/domain/assignment-dialog.domain.ts                                            | 1 CRAP finding (CRAP 30)                              | 2026-06-19        |
| ⬜ todo | 🟡 mod  | 30   | `<arrow>`                         | B component | `src/components/dialog/CourseDialog.tsx:243`                                 | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `buildEventInput`                 | B component | `src/components/dialog/EventDialog.tsx:109`                                  | —                                                                                                   | —                                                     | —                 |
| ✅ done | 🟡 mod  | 30   | `LessonDialog`                    | B component | `src/components/dialog/LessonDialog.tsx:62`                                  | `src/components/dialog/domain/lesson-dialog.domain.ts`                                              | 1 CRAP finding (CRAP 30)                              | 2026-06-20        |
| ✅ done | 🟡 mod  | 30   | `getInitialValues`                | B component | `src/components/dialog/MediaDialog.tsx:69`                                   | `src/components/dialog/media-dialog/media-dialog.domain.ts`                                         | 1 CRAP finding (CRAP 30)                              | 2026-06-20        |
| ✅ done | 🟡 mod  | 30   | `getInitialValues`                | B component | `src/components/dialog/ZoomLinkDialog.tsx:72`                                | `src/components/dialog/domain/zoom-link-dialog.domain.ts`                                           | 1 CRAP finding (CRAP 30)                              | 2026-06-20        |
| ✅ done | 🟡 mod  | 30   | `onSubmit`                        | B component | `src/components/dialog/ZoomLinkDialog.tsx:110`                               | `src/components/dialog/domain/zoom-link-dialog.domain.ts`                                           | 1 CRAP finding (CRAP 30)                              | 2026-06-20        |
| ⬜ todo | 🟡 mod  | 30   | `getGemCardMotionStyle`           | B component | `src/components/landing/lecturers.tsx:355`                                   | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `LandingSectionEyebrow`           | B component | `src/components/landing/primitives.tsx:187`                                  | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `<arrow>`                         | B component | `src/components/landing/primitives.tsx:448`                                  | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `getCardMotionStyle`              | B component | `src/components/landing/testimonials.tsx:130`                                | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `EntityHeaderActions`             | B component | `src/components/layout/entity-header-actions.tsx:129`                        | —                                                                                                   | —                                                     | —                 |
| ✅ done | 🟡 mod  | 30   | `parseYouTubeMessage`             | B component | `src/components/library/YouTubeEmbed.tsx:14`                                 | `src/components/library/youtube-embed.domain.ts` (subsumed by `handleMessage` extraction)           | 1 CRAP finding (CRAP 30)                              | 2026-06-20        |
| ✅ done | 🟡 mod  | 30   | `filteredAssignments`             | B component | `src/components/list/UpcomingAssignmentsList.tsx:18`                         | `src/components/list/domain/upcoming-assignments-list.domain.ts`                                    | 1 CRAP finding (CRAP 30)                              | 2026-06-20        |
| ✅ done | 🟡 mod  | 30   | `buildGroupTitle`                 | B component | `src/components/navigation/NotificationsMenu.tsx:34`                         | `src/components/navigation/domain/notification-row.domain.ts`                                       | 1 CRAP finding (CRAP 30)                              | 2026-06-18        |
| ⬜ todo | 🟡 mod  | 30   | `<arrow>`                         | B component | `src/components/table/DataTable.tsx:214`                                     | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `cell`                            | B component | `src/components/table/EnrollmentsTable.tsx:231`                              | —                                                                                                   | —                                                     | —                 |
| ⬜ todo | 🟡 mod  | 30   | `EnrollmentsTable`                | B component | `src/components/table/EnrollmentsTable.tsx:81`                               | —                                                                                                   | —                                                     | —                 |
| ✅ done | 🟡 mod  | 30   | `createCrudActions`               | A pure      | `src/components/table/functions/createCrudActions.ts:51`                     | `src/components/table/functions/domain/crud-actions.domain.ts`                                      | 1 CRAP finding (CRAP 30)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 30   | `SidebarMenuButton`               | B component | `src/components/ui/sidebar.tsx:508`                                          | `src/components/ui/domain/sidebar-menu-button.domain.ts`                                            | 1 CRAP finding (CRAP 30)                              | 2026-06-18        |
| ✅ done | 🟡 mod  | 30   | `<arrow>` (useCachedData refetch) | A hook      | `src/hooks/useCachedData/index.ts:37`                                        | `src/hooks/useCachedData/domain/cache-refetch.domain.ts`                                            | 1 CRAP finding (CRAP 30)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 30   | `mutate`                          | A hook      | `src/hooks/useMutation.ts:19`                                                | `src/hooks/useMutation/domain/mutation-error.domain.ts`                                             | 1 CRAP finding (CRAP 30)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 30   | `<arrow>` (focus-fetch effect)    | B component | `src/routes/_authed/posts.tsx:137`                                           | `src/utils/post/domain/focus-post.domain.ts`                                                        | 1 CRAP finding (CRAP 30)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 30   | `<arrow>` (focus-scroll effect)   | B component | `src/routes/_authed/posts.tsx:156`                                           | `src/utils/post/domain/focus-post.domain.ts`                                                        | 1 CRAP finding (CRAP 30)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 30   | `deliver`                         | A pure      | `src/utils/notifications/delivery.ts:11`                                     | `src/utils/notifications/domain/notification-rows.domain.ts`                                        | 1 CRAP finding (CRAP 30)                              | 2026-06-16        |
| ✅ done | 🟡 mod  | 30   | `config`                          | A pure      | `vite.config.ts:11`                                                          | `scripts/vite-config.domain.ts`                                                                     | 1 CRAP finding (CRAP 30)                              | 2026-06-16        |

Add a new row per target. Leave the table as the live worklist; do not delete `✅ done` rows —
they are the fix history.

## Alternatives Considered

- **Render/jsdom tests on components to buy coverage** — rejected. They couple to UI structure,
  break on refactor, and `docs/rules/complexity.md` already forbids them; coverage stays scoped
  to logic.
- **`fallow-ignore` suppressions to clear findings** — rejected as a paydown tool. Suppression
  is reserved for genuinely irreducible logic (e.g. exhaustive switches) with a justification;
  using it to dodge testing hides risk instead of removing it.
- **Lower the CRAP threshold / disable the metric** — rejected. CRAP is the signal that churny,
  branchy code is untested; muting it defeats the purpose.
- **Big-bang refactor of all hotspots at once** — rejected. Violates Surgical Changes; large
  untested refactors are exactly the risk CRAP flags. Incremental TDD slices keep each change
  reversible and reviewable.

## Consequences

- A consistent, low-risk paydown method that any contributor or cloud agent applies identically;
  each cleaned target ships with tests, not just a lower number.
- Business/view-model logic migrates into the tested `domain/` layer over time, reinforcing the
  three-layer architecture of ADR 0004 and the coverage strategy of ADR 0003.
- Component shells get thinner and more orchestration-only, improving readability and future
  testability.
- The work is open-ended (138 findings); it proceeds opportunistically in the Phase A → Phase B
  order rather than as one blocking effort. Untouched legacy complexity is paid down only when
  its function is the target — no drive-by refactors.
- The progress ledger + claim protocol let **multiple agents pay down findings in parallel**
  without colliding (claim a row → others skip it) and make the remaining burndown visible at a
  glance.

See also: ADR 0003 (unit-testing strategy), ADR 0004 (three-layer `src/utils/` architecture),
and `docs/rules/complexity.md` (the enforced complexity/CRAP rule).
