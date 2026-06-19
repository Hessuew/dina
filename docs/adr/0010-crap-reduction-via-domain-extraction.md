# ADR 0010 — CRAP Reduction via Domain Extraction

**Status:** Accepted  
**Date:** 2026-06-15

## Context

`fallow health` reports **138 CRAP findings** (21 critical, 46 high, 71 moderate). Every one is
`exceeded: "crap"` — none breach the cyclomatic (≤20) or cognitive (≤15) limits. The code
already passes those gates; the problem is **untested complexity**: branchy functions with
`coverage_tier: "none"`, so `CRAP = CC² · (1 − cov)³ + CC` stays high.

The quality gate (`bun run quality:gate` → `fallow audit --base main`) already blocks _newly
introduced_ CRAP via fallow's `introduced` flag, so the pile cannot regrow. What is missing is
a single, durable method for **paying down the existing 138** that every contributor (and every
cloud agent) follows the same way. This ADR is that playbook; it is binding like the rules in
`docs/rules/complexity.md`, which it operationalizes.

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
`src/utils/**/domain/**`, `src/hooks/**/domain/**`, `src/components/**/domain/**` — are gated at
100% in `vitest.config.ts`, so a colocated component `domain/` folder is covered automatically.

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

All of `src/utils/**/domain/**`, `src/hooks/**/domain/**`, and `src/components/**/domain/**` are
in `vitest.config.ts` coverage at 100% lines/branches/functions/statements, so extracted domain
files in any of these layers are gated automatically.

### Sequencing

- **Phase A — pure functions / hooks**, then **Phase B — components**.
- Within each phase, work **critical → high → moderate**.
- **Prefer duplicated targets first within a tier.** Run `bunx fallow dupes --format json`; a
  helper that exists in N files is an N-for-one win — a single extraction clears every copy's
  CRAP finding _and_ removes the fallow duplicate. (The first target cleared two copies; a
  later sweep found a third.)
- **Within a tier, prioritize hooks/functions over components.** When selecting targets from a
  severity tier (critical/high/moderate), choose hooks, functions, or similar non-component
  targets first; choose components last. This front-loads the cheaper extractions and defers
  the heavier component view-model work.
- **When components must be chosen, take from the bottom of the list.** When the only remaining
  targets in a tier are components, select from the bottom of the fallow health output (i.e.,
  the least severe/moderate ones first) to build momentum before tackling the harder cases.

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
- `bun run quality:gate` and `bun run typecheck` clean.
- **No behavior change** (tests bound to the public interface stay green across the swap), or a
  deliberate **broadening** noted per "Reconciling divergent near-duplicates".

### Verification — the fast loop (don't run the full gate every cycle)

The full `bun run quality:gate` re-runs the entire unit + integration suites **and**
`fallow audit --base main`, which lists every _pre-existing_ branch-vs-`main` finding. That
noise is irrelevant to a paydown target and the suites are slow, so don't use it as the inner
loop. Instead:

1. **Progress metric (cheap, no test run):** `bunx fallow health --format json --quiet` — the
   target finding is gone and the total dropped. This _is_ the burndown number.
2. **Coverage of the new domain file:** `bun run test:coverage` (or a scoped `vitest run` on the
   `*.domain.test.ts` during red→green).
3. **Isolate _introduced_ complexity, not the whole branch:** the gate only blocks on fallow's
   `introduced` flag, but `--base main` computes that against the whole branch diff. Scope it to
   _your_ change by pointing the base at the commit immediately before the target —
   `QUALITY_BASE=<pre-change-ref> bun run quality:gate` (e.g. `QUALITY_BASE=HEAD` to check
   working-tree changes before committing). The verdict then reflects only what this target
   introduced, not unrelated pre-existing findings.
4. **Full `bun run quality:gate` once** before the commit, as the final pre-flight.

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
moderate)** as of 2026-06-15, now **132 (16 critical / 46 high / 70 moderate)** open — the full
worklist below is pre-populated from this snapshot. The gate prevents regressions, so the count
only moves down. Latest: **123** open (14 critical / 45 high / 64 moderate) after extracting
`createCrudActions` into `src/components/table/functions/domain/crud-actions.domain.ts` (pure CRUD
button-config builder, colocated with its component-layer use site; the original file now
re-exports it). Prior: **124** open (14 critical / 45 high / 65
moderate) after extracting
`goNext`/`goPrev` orchestration into `navigateForward`/`navigateBackward` (DI side effects) in
`enrollment-review.domain.ts`, collapsing both hook callbacks to CC-1 wrappers. Prior: **126**
open (14 critical / 45 high / 67 moderate) after the
`createEvent`/`updateEvent` input-builder extraction (`event-input.domain.ts`); **128**
open after `requestPasswordResetService` and `resetPasswordService` (extracted into
`password-reset-flow.domain.ts`); **130** after `useEntityMutation` and `useEnrollmentReview`.

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
> earlier agents' work — none of that changes the next target and it burns calls for nothing. The
> only git you need is the reservation commit (step 2) and, **when parallel agents may be active**,
> the `origin/main` refresh in step 1. A row someone else already finished is their problem; you
> just take the next `⬜ todo`.

> **Reserve first, unconditionally — flip the row to `🔨 in progress` before touching any code.**
> This is the always-first step for **every** agent, including a single agent on a purely local
> Graphite stack. The `origin/main` landing requirement below is an _additional_ safeguard for
> parallel agents; its non-applicability (e.g. the ADR not yet being on `origin/main`) is **never**
> a reason to skip the reservation itself. No reservation commit = do not start. If you find
> yourself writing domain/test code before the row reads `🔨 in progress` with your id, stop and
> reserve first.

> **A claim only counts once it's on `origin/main`.** A claim on your feature branch alone is
> invisible to agents on other branches — each branched from `main` before yours merged, so both
> can claim the same row and only collide at integration. This has already caused a double-claim.

> **A `🔨 in progress` row you didn't set is hands-off.** Never start, continue, verify, or finish
> it — even if the working tree already holds a complete-looking implementation (that is another
> agent's uncommitted work, not an invitation to finish it). Only the agent who flipped a row may
> complete it.

So multiple agents (local or cloud) can pay down findings at once without colliding:

1. **Refresh from `origin/main` _only when parallel agents may be active_.** In that case
   `git fetch origin` and read the ledger as it stands on `origin/main`
   (`git show origin/main:docs/adr/0010-crap-reduction-via-domain-extraction.md`) so you don't
   pick from a stale local copy. **If you are the only agent on a local stack — or the ADR isn't
   on `origin/main` yet — skip this entirely** and read the local file; there is no remote copy to
   be stale against, so the fetch/show is pure wasted work.
2. **Pick a `⬜ todo` row and flip it to `🔨 in progress` first — before any code.** Set your id
   and the date in a doc-only commit (2–3 same-feature targets allowed:
   `gt c -m "chore(crap): claim <t1>, <t2>"`). This reservation commit is **mandatory in every
   case**. _When other agents may be active_, additionally **land it on `origin/main` before
   starting work** and create the implementation branch only after the claim is up; when you are
   the only agent on a local stack, the doc-only commit alone is the reservation — but it must
   still exist before any domain/test code.
3. **If the push is rejected, someone claimed first** — rebase, re-read the ledger, and take
   another `⬜ todo` row. A merge conflict on this table is the same signal: yield.
4. **On completion, flip the row to `✅ done`** with the date, the domain file, and the
   finding(s)/duplicate(s) cleared, and drop the new `fallow health` total in the count above.
5. **Release if you abandon it** — flip the row back to `⬜ todo` so it isn't stranded as
   permanently "in progress".

#### Ledger

The worklist below is **pre-populated with every open finding** from a single
`bunx fallow health` snapshot (baseline 2026-06-15) so you do **not** re-run fallow to pick a
target — pick the top `⬜ todo` row by **Sev** then **CRAP** (critical → high → moderate, CRAP
desc; the table is already in that order). The `Sev`/`CRAP` columns are the finding's severity
and CRAP score at snapshot time; `Files / sites` is the declaration site (`path:line`). Only
flip statuses (`⬜ todo` → `🔨 in progress` → `✅ done`) as you work — no fallow run is needed
to choose work, only to confirm `Done` per the verification loop above. New findings the gate
might surface later are appended as fresh `⬜ todo` rows.

| Status  | Sev     | CRAP | Target (function)               | Kind        | Files / sites                                                                | Domain file                                                     | Cleared                         | Agent / date         |
| ------- | ------- | ---- | ------------------------------- | ----------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------- | -------------------- |
| ✅ done | —       | —    | `getYoutubeVideoId`             | A pure      | `MediaCard.tsx`, `routes/_authed/library/index.tsx`, `MediaDetailViewer.tsx` | `src/utils/library/domain/youtube.domain.ts`                    | 3 CRAP findings + 1 fallow dupe | hessuew / 2026-06-15 |
| ✅ done | —       | —    | `getUserFriendlyError`          | A pure      | `components/auth/login-form.tsx`                                             | `src/utils/auth/domain/login-error.domain.ts`                   | 1 CRAP finding (CRAP 156)       | hessuew / 2026-06-15 |
| ✅ done | —       | —    | `handleKeyDown`                 | A hook      | `src/hooks/useEvaluationKeyboard.ts`                                         | `src/utils/enrolment/domain/evaluation-keyboard.domain.ts`      | 1 CRAP finding (CRAP 156)       | hessuew / 2026-06-15 |
| ⬜ todo | 🔴 crit | 210  | `EvaluationOverlay`             | B component | `src/components/enrollment/EvaluationOverlay.tsx:245`                        | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 210  | `<arrow>`                       | B component | `src/components/view/AssignmentsView.tsx:137`                                | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 156  | `LessonRow`                     | B component | `src/components/course/CourseDetailSections.tsx:323`                         | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 156  | `MediaCard`                     | B component | `src/components/library/MediaCard.tsx:75`                                    | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 156  | `AssignmentDetailComponent`     | B component | `src/routes/_authed/assignments/$assignmentId.tsx:86`                        | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 132  | `SignupForm`                    | B component | `src/components/auth/signup-form.tsx:90`                                     | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 132  | `NotificationRow`               | B component | `src/components/navigation/NotificationsMenu.tsx:181`                        | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 132  | `navigate`                      | B component | `src/routes/_authed/enrollments/index.tsx:129`                               | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 110  | `renderIconWithOverrides`       | B component | `src/components/animate-ui/icons/icon.tsx:545`                               | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 110  | `CourseDialog`                  | B component | `src/components/dialog/CourseDialog.tsx:154`                                 | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 110  | `CommentsSection`               | B component | `src/components/post/PostCard.tsx:315`                                       | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 110  | `EmptyState`                    | B component | `src/components/ui/empty-state.tsx:19`                                       | —                                                               | —                               | —                    |
| ✅ done | 🔴 crit | 110  | `useEntityMutation`             | A hook      | `src/hooks/useEntityMutation.ts:58`                                          | `src/utils/mutation/domain/entity-mutation.domain.ts`           | 1 CRAP finding (CRAP 110)       | hessuew / 2026-06-16 |
| ⬜ todo | 🔴 crit | 110  | `CourseDetailComponent`         | B component | `src/routes/_authed/courses/$courseId.tsx:46`                                | —                                                               | —                               | —                    |
| ✅ done | 🔴 crit | 110  | `validateSearch`                | A pure      | `src/routes/_authed/enrollments/index.tsx:18`                                | `src/utils/enrolment/domain/enrollments-search.domain.ts`       | 1 CRAP finding (CRAP 110)       | hessuew / 2026-06-15 |
| ⬜ todo | 🔴 crit | 110  | `LessonDetailComponent`         | B component | `src/routes/_authed/lessons/$lessonId.tsx:52`                                | —                                                               | —                               | —                    |
| ⬜ todo | 🔴 crit | 110  | `PostsComponent`                | B component | `src/routes/_authed/posts.tsx:62`                                            | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 90   | `<arrow>`                       | B component | `src/components/auth/signup-form.tsx:386`                                    | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 90   | `TeacherCard`                   | B component | `src/components/card/TeacherCard.tsx:26`                                     | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 90   | `EventDetailsSection`           | B component | `src/components/dialog/EventPreviewModal.tsx:124`                            | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 90   | `ProfileModal`                  | B component | `src/components/dialog/ProfileModal.tsx:63`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 90   | `EnrollmentDetails`             | B component | `src/components/enrollment/EnrollmentDetails.tsx:45`                         | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 90   | `getYoutubeVideoId`             | B component | `src/components/library/MediaDetailViewer.tsx:21`                            | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 90   | `MediaContent`                  | B component | `src/components/library/MediaDetailViewer.tsx:128`                           | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 90   | `AssignmentsView`               | B component | `src/components/view/AssignmentsView.tsx:49`                                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `CourseCard`                    | B component | `src/components/card/CourseCard.tsx:271`                                     | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `AssignmentDialog`              | B component | `src/components/dialog/AssignmentDialog.tsx:202`                             | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `getDefaultValues`              | B component | `src/components/dialog/EventDialog.tsx:83`                                   | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `EventViewMode`                 | B component | `src/components/dialog/EventDialog.tsx:125`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `<arrow>`                       | B component | `src/components/dialog/MediaDialog.tsx:381`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `MediaDialog`                   | B component | `src/components/dialog/MediaDialog.tsx:140`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `<arrow>`                       | B component | `src/components/list/UpcomingAssignmentsList.tsx:69`                         | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `NotificationTriggerButton`     | B component | `src/components/navigation/NotificationsMenu.tsx:56`                         | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `FormDialog`                    | B component | `src/components/ui/form-dialog.tsx:63`                                       | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `Sidebar`                       | B component | `src/components/ui/sidebar.tsx:158`                                          | —                                                               | —                               | —                    |
| ✅ done | 🟠 high | 72   | `useEnrollmentReview`           | A hook      | `src/hooks/useEnrollmentReview.ts:57`                                        | `src/utils/enrolment/domain/enrollment-review.domain.ts`        | 1 CRAP finding (CRAP 72)        | hessuew / 2026-06-16 |
| ⬜ todo | 🟠 high | 72   | `<arrow>`                       | B component | `src/routes/__root.tsx:26`                                                   | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `<arrow>`                       | B component | `src/routes/_authed/courses/$courseId.tsx:93`                                | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `EnrollmentsPage`               | B component | `src/routes/_authed/enrollments/index.tsx:65`                                | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `LibraryComponent`              | B component | `src/routes/_authed/library/index.tsx:33`                                    | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 72   | `<arrow>`                       | B component | `src/routes/_authed/students/$studentId.tsx:160`                             | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `run`                           | B component | `src/components/animate-ui/icons/icon.tsx:345`                               | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `SubmissionStatusCard`          | B component | `src/components/assignment/AssignmentDetailSections.tsx:136`                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `handleKeyDown`                 | B component | `src/components/auth/enrolment-form.tsx:220`                                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `<arrow>`                       | B component | `src/components/dialog/EventPreviewModal.tsx:85`                             | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `getInitialValues`              | B component | `src/components/dialog/LessonDialog.tsx:45`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `onSubmit`                      | B component | `src/components/dialog/LessonDialog.tsx:80`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `resolveDocumentUrl`            | B component | `src/components/dialog/MediaDialog.tsx:100`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `<arrow>`                       | B component | `src/components/dialog/MediaDialog.tsx:228`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `TeacherModal`                  | B component | `src/components/dialog/TeacherModal.tsx:25`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `ZoomLinkDialog`                | B component | `src/components/dialog/ZoomLinkDialog.tsx:89`                                | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `AwardRow`                      | B component | `src/components/landing/about.tsx:52`                                        | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `LandingScriptureSectionHeader` | B component | `src/components/landing/primitives.tsx:291`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `handleMessage`                 | B component | `src/components/library/YouTubeEmbed.tsx:97`                                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `CourseListInternal`            | B component | `src/components/list/CourseList.tsx:47`                                      | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `UserText`                      | B component | `src/components/navigation/nav-user.tsx:90`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `NavUserMenuContent`            | B component | `src/components/navigation/nav-user.tsx:187`                                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `NotificationMenuHeader`        | B component | `src/components/navigation/NotificationsMenu.tsx:120`                        | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `getFirstError`                 | B component | `src/components/ui/app-form-fields.tsx:66`                                   | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `FormFieldNumberInput`          | B component | `src/components/ui/form-field.tsx:92`                                        | —                                                               | —                               | —                    |
| ⬜ todo | 🟠 high | 56   | `<arrow>`                       | B component | `src/components/view/CalendarView.tsx:152`                                   | —                                                               | —                               | —                    |
| ✅ done | 🟠 high | 56   | `requestPasswordResetService`   | A pure      | `src/utils/password-reset/service/password-reset.service.ts:22`              | `src/utils/password-reset/domain/password-reset-flow.domain.ts` | 1 CRAP finding (CRAP 56)        | hessuew / 2026-06-16 |
| ✅ done | 🟠 high | 56   | `resetPasswordService`          | A pure      | `src/utils/password-reset/service/password-reset.service.ts:111`             | `src/utils/password-reset/domain/password-reset-flow.domain.ts` | 1 CRAP finding (CRAP 56)        | hessuew / 2026-06-16 |
| ⬜ todo | 🟡 mod  | 42   | `continueLoop`                  | B component | `src/components/animate-ui/icons/icon.tsx:334`                               | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `getVariants`                   | B component | `src/components/animate-ui/icons/icon.tsx:734`                               | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `validYear`                     | B component | `src/components/auth/enrolment-form.tsx:55`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `<arrow>`                       | B component | `src/components/auth/enrolment-form.tsx:135`                                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `ResetPasswordForm`             | B component | `src/components/auth/reset-password-form.tsx:25`                             | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `LessonActions`                 | B component | `src/components/course/CourseDetailSections.tsx:254`                         | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `onSubmit`                      | B component | `src/components/dialog/AssignmentDialog.tsx:240`                             | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `onSubmit`                      | B component | `src/components/dialog/CourseDialog.tsx:217`                                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `EventDialog`                   | B component | `src/components/dialog/EventDialog.tsx:397`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `EventPreviewModal`             | B component | `src/components/dialog/EventPreviewModal.tsx:183`                            | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `onSubmit`                      | B component | `src/components/dialog/MediaDialog.tsx:184`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `GemLecturerCard`               | B component | `src/components/landing/lecturers.tsx:242`                                   | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `resolveMediaTypeConfig`        | B component | `src/components/library/MediaCard.tsx:62`                                    | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `Header`                        | B component | `src/components/navigation/Header.tsx:52`                                    | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `PostHeader`                    | B component | `src/components/post/PostCard.tsx:95`                                        | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `CommentHeader`                 | B component | `src/components/post/PostCard.tsx:596`                                       | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `handlePaginationChange`        | B component | `src/components/table/DataTable.tsx:514`                                     | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `DataTable`                     | B component | `src/components/table/DataTable.tsx:455`                                     | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `FormFieldInput`                | B component | `src/components/ui/form-field.tsx:37`                                        | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `FormFieldTextarea`             | B component | `src/components/ui/form-field.tsx:149`                                       | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `FormFieldSelect`               | B component | `src/components/ui/form-field.tsx:201`                                       | —                                                               | —                               | —                    |
| ✅ done | 🟡 mod  | 42   | `goNext`                        | A hook      | `src/hooks/useEnrollmentReview.ts:156`                                       | `src/utils/enrolment/domain/enrollment-review.domain.ts`        | 1 CRAP finding (CRAP 42)        | hessuew / 2026-06-16 |
| ✅ done | 🟡 mod  | 42   | `goPrev`                        | A hook      | `src/hooks/useEnrollmentReview.ts:176`                                       | `src/utils/enrolment/domain/enrollment-review.domain.ts`        | 1 CRAP finding (CRAP 42)        | hessuew / 2026-06-16 |
| ⬜ todo | 🟡 mod  | 42   | `CalendarComponent`             | B component | `src/routes/_authed/calendar.tsx:75`                                         | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `EnrollmentDetailPage`          | B component | `src/routes/_authed/enrollments/$enrollmentId.tsx:62`                        | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `MediaDetailComponent`          | B component | `src/routes/_authed/library/$mediaId.tsx:18`                                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `StudentDetailComponent`        | B component | `src/routes/_authed/students/$studentId.tsx:18`                              | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 42   | `VerifyEmailChangeComp`         | B component | `src/routes/verify-email-change.tsx:19`                                      | —                                                               | —                               | —                    |
| ✅ done | 🟡 mod  | 42   | `<arrow>` (createEvent)         | A pure      | `src/utils/event/events.ts:59`                                               | `src/utils/event/domain/event-input.domain.ts`                  | 1 CRAP finding (CRAP 42)        | hessuew / 2026-06-16 |
| ✅ done | 🟡 mod  | 42   | `<arrow>` (updateEvent)         | A pure      | `src/utils/event/events.ts:80`                                               | `src/utils/event/domain/event-input.domain.ts`                  | 1 CRAP finding (CRAP 42)        | hessuew / 2026-06-16 |
| 🔨 in progress | 🟡 mod  | 30   | `runCheck`                      | A pure      | `scripts/quality-fix.mjs:17`                                                 | `scripts/quality-fix.domain.mjs`                                | —                               | hessuew / 2026-06-16 |
| ⬜ todo | 🟡 mod  | 30   | `runInheritedCheck`             | A pure      | `scripts/quality-gate.mjs:62`                                                | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `extractJson`                   | A pure      | `scripts/quality-gate.mjs:92`                                                | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `reportFallowOutcome`           | A pure      | `scripts/quality-gate.mjs:239`                                               | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `completeStoppedAnimation`      | B component | `src/components/animate-ui/icons/icon.tsx:269`                               | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `AnimateIcon`                   | B component | `src/components/animate-ui/icons/icon.tsx:124`                               | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `mergeProps`                    | B component | `src/components/animate-ui/primitives/animate/slot.tsx:38`                   | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `SubmissionHeader`              | B component | `src/components/assignment/AssignmentDetailSections.tsx:105`                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `EnrolmentForm`                 | B component | `src/components/auth/enrolment-form.tsx:130`                                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `ForgotPasswordForm`            | B component | `src/components/auth/forgot-password-form.tsx:17`                            | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `LoginForm`                     | B component | `src/components/auth/login-form.tsx:20`                                      | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `CourseProgressCard`            | B component | `src/components/course/CourseDetailSections.tsx:96`                          | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `LessonsSection`                | B component | `src/components/course/CourseDetailSections.tsx:412`                         | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `getAssignmentInitialValues`    | B component | `src/components/dialog/AssignmentDialog.tsx:85`                              | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `SubmissionPreview`             | B component | `src/components/dialog/AssignmentDialog.tsx:166`                             | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `<arrow>`                       | B component | `src/components/dialog/AssignmentDialog.tsx:343`                             | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `<arrow>`                       | B component | `src/components/dialog/CourseDialog.tsx:243`                                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `buildEventInput`               | B component | `src/components/dialog/EventDialog.tsx:109`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `LessonDialog`                  | B component | `src/components/dialog/LessonDialog.tsx:62`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `getInitialValues`              | B component | `src/components/dialog/MediaDialog.tsx:69`                                   | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `getInitialValues`              | B component | `src/components/dialog/ZoomLinkDialog.tsx:72`                                | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `onSubmit`                      | B component | `src/components/dialog/ZoomLinkDialog.tsx:110`                               | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `getGemCardMotionStyle`         | B component | `src/components/landing/lecturers.tsx:355`                                   | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `LandingSectionEyebrow`         | B component | `src/components/landing/primitives.tsx:187`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `<arrow>`                       | B component | `src/components/landing/primitives.tsx:448`                                  | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `getCardMotionStyle`            | B component | `src/components/landing/testimonials.tsx:130`                                | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `EntityHeaderActions`           | B component | `src/components/layout/entity-header-actions.tsx:129`                        | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `parseYouTubeMessage`           | B component | `src/components/library/YouTubeEmbed.tsx:14`                                 | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `filteredAssignments`           | B component | `src/components/list/UpcomingAssignmentsList.tsx:18`                         | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `buildGroupTitle`               | B component | `src/components/navigation/NotificationsMenu.tsx:34`                         | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `<arrow>`                       | B component | `src/components/table/DataTable.tsx:214`                                     | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `cell`                          | B component | `src/components/table/EnrollmentsTable.tsx:231`                              | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `EnrollmentsTable`              | B component | `src/components/table/EnrollmentsTable.tsx:81`                               | —                                                               | —                               | —                    |
| ✅ done | 🟡 mod  | 30   | `createCrudActions`             | A pure      | `src/components/table/functions/createCrudActions.ts:51`                     | `src/components/table/functions/domain/crud-actions.domain.ts`  | 1 CRAP finding (CRAP 30)        | hessuew / 2026-06-16 |
| ⬜ todo | 🟡 mod  | 30   | `SidebarMenuButton`             | B component | `src/components/ui/sidebar.tsx:508`                                          | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `<arrow>`                       | A hook      | `src/hooks/useCachedData.ts:37`                                              | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `mutate`                        | A hook      | `src/hooks/useMutation.ts:19`                                                | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `<arrow>`                       | B component | `src/routes/_authed/posts.tsx:137`                                           | —                                                               | —                               | —                    |
| ⬜ todo | 🟡 mod  | 30   | `<arrow>`                       | B component | `src/routes/_authed/posts.tsx:156`                                           | —                                                               | —                               | —                    |
| ✅ done | 🟡 mod  | 30   | `deliver`                       | A pure      | `src/utils/notifications/delivery.ts:11`                                     | `src/utils/notifications/domain/notification-rows.domain.ts`    | 1 CRAP finding (CRAP 30)        | hessuew / 2026-06-16 |
| ⬜ todo | 🟡 mod  | 30   | `config`                        | A pure      | `vite.config.ts:11`                                                          | —                                                               | —                               | —                    |

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
