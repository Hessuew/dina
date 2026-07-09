# ADR 0011 — Unit-Size Reduction via Component Decomposition

**Status:** Accepted  
**Date:** 2026-06-20

## Context

The next quality axis is **unit size** —
functions whose body exceeds **60 lines of code**. `docs/rules/complexity.md` already names
"Body ≤ 60 lines" as a target and `docs/rules/README.md` lists **unit-size** as a candidate
rule; this ADR promotes it to an enforced rule and provides the paydown playbook, exactly as
ADR 0010 did for CRAP. It is binding like the rules in `docs/rules/complexity.md`.

Fallow surfaces unit size through `bunx fallow audit` (**not** `health`):

- **`complexity.large_functions`** — a whole-repo list (`functions_analyzed: 2124`) of every
  function over 60 LOC as `{ path, name, line, line_count }`. This is the worklist.
- **`vital_signs.unit_size_profile`** — the score: `low_risk 75.1 / medium_risk 13 /
high_risk 7.1 / very_high_risk 4.8`, plus `functions_over_60_loc_per_k: 47.6`.

**Baseline (2026-06-20): 75 large functionS.** Sizes run
443 → 62 LOC. Only **9 of the 75 overlap a CRAP finding**; the other ~66 are **size-only**, so
this is largely fresh work, not a rehash of ADR 0010.

Unit size only falls via **decomposition**: most oversized functions are long because of **JSX/markup**, which
cannot be domain-extracted or unit-tested (`docs/rules/complexity.md` forbids `.test.tsx`
render tests). The canonical example is `EnrolmentForm`
(`src/components/auth/enrolment-form/enrolment-form.tsx`, **443 LOC**): its logic was already
extracted to `enrolment-form.domain.ts` for CRAP, yet it is still 443 lines — entirely from
the `renderedFields` JSX map, `pageShell`, and step-rendering markup. Coverage cannot shrink
it; only pulling the JSX into named sub-components can. It is now **done** via the canonical
form pattern below — six per-step `withForm` sections dispatched by a thin body (see
[Form targets](#form-targets--decompose-into-per-stepper-section-withform-components-canonical)).

## Rules

The state of this document is the current state of the work, and should be followed as the
source of truth. No external origin/main checkups should be done. no git diff, git stats etc calls.

Run minimal bash calls to verify the changes:

- `bunx fallow audit --production-health` to verify the changes after all changes.
- typecheck only once after all changes, not multiple times as it is slow, ask user to verify.
- no prettier or eslint runs

For component and utils lookup use Haiku 4.5 subagent to summarize the needed context.

### Workflow — coordinate by ledger, regardless of checkout

ADR11 paydown may run in either a direct human/local checkout or a firstmate-managed isolated
worktree.

- **firstmate/crew agents** should use the normal firstmate isolated worktree flow.
- **Direct human/local sessions** may work in their current checkout when appropriate.
- **The claim ledger remains the coordination source of truth.** Each worker must claim the row
  before touching code.
- **Branch or worktree location does not confer ownership of a row.** Only the live ledger claim
  does.
- **Completed rows must update the ledger before the task is considered done.** Flip the row to
  `✅ done`, replace `Claimed at` with the completion date, fill in the extracted
  sub-components, and decrement **Current open**.

## Decision

Pay down unit size by **decomposing oversized functions into smaller named sub-components and
helpers, extracted in the same file**, until each function body drops under 60 LOC. Where a
function also carries **branchy logic**, push that logic into the feature's tested `domain/`
layer; but the bulk of the work is **presentational JSX
extraction**, which is not unit-tested. We do **not** add `.test.tsx` render tests, and we do
**not** raise the 60-LOC limit or blanket-suppress findings to avoid the work.

If multiple ledgers are in the same file, claim the both or all.

### Method — extract sub-components in-file, route logic to `domain/`

1. **Identify the bulk** — the long region is almost always a JSX subtree (a `.map(...)`
   render, a panel, a section, a repeated row). Extract it into a **named sub-component
   function in the same file** (`function FooSection(props) { … }`). ESLint counts size
   per-function, so an in-file named function satisfies the rule; new sibling files are **not**
   required (per the placement decision for this ADR).
2. **Route branchy logic to `domain/`** — if the function holds non-trivial logic (initial-
   value/input builders, validation, mode/branch derivation), extract it into the appropriate
   `domain/` layer and unit-test it at 100%:
   - `src/utils/<feature>/domain/` — server-function / shared-backend logic.
   - `src/hooks/<hook>/domain/` — logic owned by a single hook.
   - `src/components/<area>/.../<name>.domain.ts` — component-layer logic, colocated with its
     owner. (Many CRAP targets already have such a file; reuse it.)
3. **Repeat until the body < 61 LOC** and the function leaves `complexity.large_functions`.
4. **Every extracted sub-component must itself pass the 60-LOC test** — decomposition is
   **recursive**, not one-and-done. A common failure is to cut one 250-LOC body into four
   80-LOC sub-components: the original target leaves `large_functions`, but you have just
   created **new** oversized functions that the enforced rule rejects. After extracting, check
   the LOC of **each new function** (shell _and_ every sub-component) and keep splitting any
   that is still > 60 (extract a nested track/panel/row, deduplicate repeated rows into one
   shared component, or hoist large static data — scripture arrays, option lists — to a module
   const). The done condition is **zero** functions in the changed file over 60 LOC, not just
   the named target.
5. **Barely-over check (do this first for small overshoots):** if a function is only a few
   lines over 60 — whether before starting or after a split — check whether a mechanical,
   zero-risk trim alone gets it under: extract the inline props annotation to a named `type`,
   hoist static data (option lists, class-name strings) to module consts, or collapse a
   trivially inlined wrapper. If that alone fixes it, stop there — no sub-component
   extraction needed for that function.

Behaviour must be preserved: a JSX extraction is a mechanical cut (move markup into a function,
pass the props it reads). Any extracted **logic** stays covered at 100% via its `domain/`, test
coverage roots in `vitest.config.ts`.

### Form targets — decompose into per-step/per-section `withForm` components (canonical)

Multi-field forms built on the repo's TanStack Form hook (`useAppForm` / `withForm` from
`src/hooks/form.ts`) are the largest unit-size targets, and a flat JSX extraction (one big
`render` arrow) does **not** reduce the count — it just relocates the bulk. The **canonical**
decomposition for form targets is **per-step (or per-section) `withForm` components**, one
small typed section per logical group of fields, matching the established repo convention in
`EventDialog`/`CourseDialog`:

```tsx
const IdentityStepFields = withForm({
  defaultValues: ENROLMENT_DEFAULT_VALUES,
  render: ({ form }) => (
    /* only this step's <form.AppField> markup */
  ),
})
// …one per step: Contact, Location, Church, Story, Roof
```

The shell renders the active section by dispatching on the step/section id:

```tsx
{
  stepConfig.id === 'identity' && <IdentityStepFields form={form} />
}
{
  stepConfig.id === 'contact' && <ContactStepFields form={form} />
}
// …
```

Rules for this pattern:

- **One `withForm` component per step/section**, each well under 60 LOC. Dispatch them from a
  thin body component (itself a `withForm` wrapper) on the step/section id.
- **Do not** add `'use no memo'` to these sections — `withForm` owns the form reactivity, so
  they are **not** stable-ref consumers in the `react-compiler-memo` sense (the existing
  `withForm` components in the repo carry no directive). The pitfall below applies only to
  hand-rolled sub-components that receive a stable mutable instance (e.g. a TanStack `table`).
- **Route the submission/derivation logic to `domain/`** — the value→payload builder (e.g.
  `buildEnrolmentSubmissionData`), key-navigation resolution, and success effects go into the
  colocated `*.domain.ts` and are unit-tested at 100%; the shell only orchestrates.
- The reference implementation is `EnrolmentForm`
  (`src/components/auth/enrolment-form/enrolment-form.tsx`): six per-step `withForm` sections
  (`IdentityStepFields` … `RoofStepFields`) dispatched by `EnrolmentFormBody`, with
  `useEnrolmentStepNavigation` owning step state and `enrolment-form.domain.ts` owning the
  logic. Apply the same shape to the other form targets in the ledger (`SignupForm`,
  `ResetPasswordForm`, dialog forms, etc.).

### React Compiler pitfall — stable-ref consumers

This is the dominant risk of this ADR, because the work is almost entirely **sub-component
extraction**. When an extracted sub-component receives a prop whose _identity_ is stable but
whose internal state changes (a **stable-ref consumer** — e.g. a TanStack `useReactTable`
instance), the React Compiler memoizes the new component on the stable ref and it silently
goes stale. The fix is `'use no memo'` as the first statement of the function body, with a
comment naming the prop. This is a binding rule — see `docs/rules/react-compiler-memo.md`. The
`DataTable.tsx` targets (`DataTable`, `PaginationFooter`) are the highest-exposure cases:
every sub-component receiving the `table` instance needs the directive.

### Enforcement — ESLint error + native bulk suppressions

Unit size is now an **enforced rule** (`docs/rules/unit-size.md`), wired so the existing 75
functions are grandfathered while any **newly introduced** oversized function fails — the size
analogue of fallow's `introduced` flag, with near-zero custom code:

- `eslint.config.js`: `max-lines-per-function` is set to **`error`** (`max: 60`,
  `skipBlankLines`, `skipComments`) for production `src/**/*.{ts,tsx}`, with an **override
  disabling it for test files** (`**/*.test.ts`, `**/*.test.tsx`, `**/*.integration.test.ts`).
- The quality gate runs ESLint, so a new oversized function errors while suppressed ones pass.

> **Test files are excluded from complexity analysis at the config level** — no per-run flag
> needed. `.fallowrc.json` `health.ignore` carries `**/*.test.ts`, `**/*.test.tsx`, and
> `**/*.integration.test.ts` (schema: _"Glob patterns to exclude from complexity analysis"_),
> so `complexity.large_functions` already omits test files for every `fallow audit` / `fallow
health` run. This is the durable mirror of `--production-health`. **Why it matters:** a
> `describe(...)` callback wrapping a dozen `it(...)` cases legitimately exceeds 60 LOC, so
> without this exclusion the new `*.domain.test.ts` you add when decomposing a component shows
> up in the raw array at the same path prefix and reads like an unfinished target. Concretely:
> before the exclusion, a plain audit reported 105 `large_functions` (32 in test files); after,
> 73, none in test files — the real production signal. (Passing `--production-health` still
> works and is equivalent for this metric; the config just makes it the default.)

### Definition of done (per target)

- The function no longer trips ESLint's `max-lines-per-function` (max 60): run
  `npx eslint <changed-file>` and confirm **zero** `max-lines-per-function` findings; body < 61
  LOC. (See the **2026-07-05 tooling note** under Verification — `fallow` no longer emits
  `complexity.large_functions`, so ESLint is now the authoritative per-target check.)
- **No sub-component you extracted is over 60 LOC either.** The named target and **every**
  helper/sub-component created while decomposing it must all be under the limit — `npx eslint
  <changed-file>` must report **zero** `max-lines-per-function` findings across **every** function
  in the file. ESLint's count uses `skipBlankLines`/`skipComments`, so a freshly extracted
  sub-component in the 60–80 band that a raw line count reads as "fine" must still be split until
  ESLint is clean.
- `bun run typecheck` clean.
- Any extracted `domain/` logic is covered at 100%.
- **No behaviour change.** Honest limitation: without render tests, behaviour preservation for
  pure-JSX extractions rests on `typecheck` + the mechanical nature of the cut + code review —
  the documented cost of the no-render-test rule. Extracted logic remains test-guarded.

### Verification — the fast loop (don't run the full gate every cycle)

> **Tooling update (2026-07-05): verify with scoped ESLint, not `fallow`.** As of `fallow`
> 2.93.0 the audit JSON **no longer emits `complexity.large_functions`** — its
> `complexity.findings` array is complexity/CRAP-triggered only (`exceeded` ∈
> `all`/`crap`/`cognitive_crap`), so the pure-JSX size targets in this ledger never appear in it.
> The old `bunx fallow audit … | filter large_functions` check now returns an empty list for
> **every** file regardless of state — a **false green**; do not use it. The authoritative
> per-target check is now **scoped ESLint** (`max-lines-per-function`, the enforced rule this ADR
> added). `fallow` remains useful only for the repo-wide burndown aggregate
> (`complexity.vital_signs.unit_size_profile` / `functions_over_60_loc_per_k`), not per-function.
>
> **Stale ledger paths:** some `File / site` paths predate a folder reorg (e.g. a row may read
> `.../view/CalendarView.tsx` when the file now lives at
> `.../view/calendar-view/CalendarView.tsx`). Resolve the real path (glob/find on the function or
> file name) before working, and correct the row's path as you close it.

Per project practice, do **not** run the full `bun run quality:gate` as the inner loop. Instead:

1. **Progress metric (per target):** `npx eslint <changed-file>` → confirm **zero**
   `max-lines-per-function` findings across every function in the changed file. That is the pass
   signal (the target and every extracted sub-component are under 60). ESLint skips
   blank/comment lines, so it is the stricter, authoritative count. (For the repo-wide burndown
   number, read `functions_over_60_loc_per_k` from `bunx fallow audit --production-health`.)
2. **Coverage of any new domain file:** scoped `vitest run` on its `*.domain.test.ts`.
3. **`bun run typecheck`** clean.

Leave the full gate run and the commit/PR to the developer.

### Sequencing & batching

- Order by **`line_count` descending** (very-high → low). The ledger is pre-sorted.
- **Batch 2–5 same-feature targets per session/commit.** Never batch across features in one
  commit — lost context produces shallow splits. Many targets cluster by file (`PostCard.tsx`,
  `MediaDialog.tsx`, `CourseDialog.tsx`, `DataTable.tsx`, `EvaluationOverlay.tsx`), so a
  natural batch is the multiple oversized functions inside one component file.

### Tracking & the progress ledger

Progress is the production `large_functions` count; baseline **75 (29 very-high / 15 high / 7
med / 24 low)** as of 2026-06-20. The enforced rule prevents regressions, so the count only
moves down.

#### Protocol — claim before you work (safe for parallel agents)

> **Fast path — pure table read.** Pick the top `⬜ todo` row by the selection rule (LOC desc),
> flip it to `🔨 in progress`, and start. **Do not** run `git status`/`log`/`branch`/`diff` or
> inspect prior commits, the branch name, or the working tree to decide what to pick. No git
> operations are needed for claiming.

> **Reserve first, unconditionally** — flip the row to `🔨 in progress` with a UTC timestamp
> (ISO-8601, e.g. `2026-06-20T10:23Z`) in `Claimed at` **before touching any code**. No row
> flip = do not start.

> **A `🔨 in progress` row is hands-off unless you wrote its timestamp earlier in the live
> session you are running right now.** A branch name mentioning the target, a prior commit, or
> a complete-looking working tree do **not** confer ownership. A pre-existing claim is never a
> task to "implement" — skip it and pick the next `⬜ todo` row. A `🔨` row with a `Claimed at`
> older than 24h is abandoned: flip it back to `⬜ todo`, clear the timestamp, and re-claim it.

On completion: flip to `✅ done`, replace `Claimed at` with the completion date, fill in the
sub-components extracted, and decrement **Current open** below. Release an abandoned claim by
flipping back to `⬜ todo` and clearing `Claimed at` to `—`.

**Current open:** 0 (0 very-high / 0 high / 0 med / 0 low)

> Note: claiming a row (todo → in progress) leaves it "open"; only completion decrements the
> count. Reconciled 2026-07-05 to the actual `⬜ todo` row count (the header had drifted from
> the table); the entire very-high tier is now cleared.

#### Ledger

Pre-populated from the `bunx fallow audit` snapshot (2026-06-20), production functions only
(test files excluded), sorted by LOC descending. Pick the top `⬜ todo` row; flip statuses as
you work. `LOC` and `Tier` are the snapshot line count and size band. `File / site` is
`path:line`.

| Status  | LOC | Tier      | Target (function)               | File / site                                                                             | Sub-components extracted                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Claimed at |
| ------- | --- | --------- | ------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| ✅ done | 443 | very-high | `EnrolmentForm`                 | `src/components/auth/enrolment-form/enrolment-form.tsx:128`                             | `IdentityStepFields`, `ContactStepFields`, `LocationStepFields`, `ChurchStepFields`, `StoryStepFields`, `RoofStepFields` (per-step `withForm` sections), `EnrolmentFormBody`, `EnrolmentPageFrame`, `EnrolmentSubmittedPanel`, `EnrolmentStepHeader`, `EnrolmentFooterNav`, `useEnrolmentStepNavigation` hook, `buildEnrolmentSubmissionData` domain                                                                                                                          | 2026-06-21 |
| ✅ done | 395 | very-high | `SignupForm`                    | `src/components/auth/signup-form/signup-form.tsx:51`                                    | `SignupPageFrame`, `SignupCredentialsForm` + `SignupAccountFields` + `SignupSecurityFields` (`withForm` sections), `SignupEmailField`, `SignupPasswordField` + `PasswordStrengthMeter`, `SignupConfirmPasswordField`, `SignupSubmitSection`, `SignupOtpPanel` + `OtpPanelHeader` + `OtpCodeInput` + `OtpResendButton`, `useSignupForm` + `useInvitationState` + `useResendCooldown` + `useSignupSubmit` + `useSignupInvitation` + `useOtpVerification` + `useOtpResend` hooks | 2026-06-22 |
| ✅ done | 355 | very-high | `ProfileModal`                  | `src/components/dialog/profile-modal/ProfileModal.tsx:51`                               | `ProfileModalHeader`, `ProfileAvatarPanel`, `PasswordFields` + `PasswordSection` (`withForm`), `ProfileFields` + `ProfileSection` (`withForm`), `ProfileRightColumn`, `useAvatarUpload`, `useProfileForm`, `usePasswordForm`, `useProfileModal` hooks                                                                                                                                                                                                                         | 2026-06-22 |
| ✅ done | 324 | very-high | `AnimateIcon`                   | `src/components/animate-ui/icons/icon.tsx:129`                                          | `useAnimateIcon` master hook composed of `useAnimateIconState`, `useAnimateIconCallbacks`, `useAnimateIconEffects`, `useIconViewTrigger`, `useAnimationRunLoop`; `splitAnimateIconProps`, `buildIconContextValue`, `buildIconPointerHandlers`, `createIconRefs` helpers; run-loop state machine extracted to `icon-animation.domain.ts` (`runAnimationLoop` + helpers, 100% covered)                                                                                          | 2026-06-22 |
| ✅ done | 296 | very-high | `MediaDialog`                   | `src/components/dialog/media-dialog/MediaDialog.tsx:269`                                | `MediaTitleCategoryFields`, `MediaKindField`, `MediaYoutubeUrlField`, `MediaDocumentFields`, `MediaYoutubeExtraFields` (per-section `withForm`), `MediaFormFields` (composer), `useMediaUploads` + `useMediaDialog` hooks, `submitMediaForm` helper                                                                                                                                                                                                                           | 2026-06-22 |
| ✅ done | 268 | very-high | `PostsComponent`                | `src/routes/_authed/posts.tsx:81`                                                       | `ChannelSidebar`, `PostsPageHeader` + `MobileChannelDropdown`, `PostsList`, `LoadMoreButton` (JSX sub-components); `usePostsFeed` + `usePostsState` + `useChannelPostsEffect` + `useFocusPostEffect` hooks (effects reuse existing `focus-post.domain`/`posts-view.domain` helpers)                                                                                                                                                                                           | 2026-06-22 |
| ✅ done | 267 | very-high | `LandingLecturerGemsSection`    | `src/components/landing/lecturers.tsx:405`                                              | `GemsSectionHeader` + `GemsFeaturePanel`; `GemsMobileCarousel` + `GemsMobileTrack`; `GemsDesktopCarousel` + `GemsDesktopTrack`; shared `PairThemeButtons`; `GemsAnthem` — pure-JSX sub-components dispatched by a thin shell, recursively split so every one is < 60 LOC; `Carousel` prop type extracted from `useCarousel` return                                                                                                                                              | 2026-06-22 |
| ✅ done | 255 | very-high | `EvaluationOverlay`             | `src/components/enrollment/evaluation-overlay/EvaluationOverlay.tsx:327`                | `EvaluationOverlayHeader`, `EvaluationControlStrip` + `ScoreCategoryColumn` + `TotalScoreColumn` (JSX sub-components); `useEvaluationOverlay` master hook composed of `useEvaluationMutations` + `useEvaluationActions` + `useLockBodyScroll`; reuses existing `evaluation-overlay.domain` (`deriveEvaluationView`/`buildScorePatch`/`toggleScoreValue`)                                                                                                                       | 2026-06-22 |
| ✅ done | 246 | very-high | `ZoomLinkDialog`                | `src/components/dialog/zoom-link-dialog/ZoomLinkDialog.tsx:54`                          | `ZoomSectionField`, `ZoomCourseField`, `ZoomMeetingFields`, `ZoomAccessFields`, `ZoomNoteFields` (per-section `withForm`), `ZoomLinkFields` (composer), `ZoomLinkHeader`, `ZoomLinkFooter` (JSX sub-components), `useZoomLinkDialog` hook (orchestration; reuses existing `zoom-link-dialog.domain` helpers)                                                                                                                                                                     | 2026-06-22 |
| ✅ done | 214 | very-high | `ResetPasswordForm`             | `src/components/auth/reset-password-form.tsx:33`                                        | `ResetPasswordFields` (`withForm` composer) → `ResetNewPasswordField` + `ResetConfirmPasswordField` (per-field `withForm`) + `ResetSubmitSection`; `PasswordStrengthMeter`, `ResetPasswordInvalidState` (JSX sub-components); `useResetPasswordForm` composed of `useResetTokenValidation` + `useResetPasswordMutation` hooks (reuses existing `reset-password-form.domain` helpers)                                                                                          | 2026-06-22 |
| ✅ done | 208 | very-high | `CalendarComponent`             | `src/routes/_authed/calendar.tsx:75`                                                    | `CalendarPageHeader` + `CalendarTypeFilter` + `CalendarCourseFilter` (filter JSX), `CalendarEventSidebar` + `SpecialEventBadge` (sidebar JSX), `useCalendarPage` hook (state/handlers); pure derivations routed to `calendar.domain.ts` (`deriveCalendarCourses`, `filterCalendarEvents`, `deriveUpcomingSpecials`, `deriveUpcomingEvents`, 100% covered); `CalendarFilterProps` type extracted                                                                                  | 2026-06-22 |
| ✅ done | 208 | very-high | `EnrollmentsPage`               | `src/routes/_authed/enrollments/index.tsx:63`                                           | `EnrollmentsPageHeader`, `EnrollmentsTableSection`, `EnrollmentSubstitutionDialogs`, `EnrollmentReviewOverlay` (JSX sub-components); `useEnrollmentsPageController` master hook composed of `useEnrollmentsNavigation` (navigate/search-debounce/list-loading + effects) and `useEnrollmentsActions` (distribute/view-all/refresh + dialog state); reuses existing `enrollments-page.domain` / `enrollments-navigation.domain` helpers; prop types extracted | 2026-06-22 |
| ✅ done | 198 | very-high | `AssignmentDetailComponent`     | `src/routes/_authed/assignments/$assignmentId.tsx:96`                                   | `AssignmentDetailHeader` + `AssignmentDueMetadata`, `AssignmentDetailDialogs` (JSX sub-components); `buildSubmissionsColumns` column builder; `useAssignmentDetail` master hook composed of `useAssignmentNavigation` (goBack/delete-nav) and `useSubmissionForm` (form state + save mutation); reuses existing `assignment-detail.domain` helpers; `AssignmentData`/`AssignmentDetailData` types extracted | 2026-06-22          |
| ✅ done | 197 | very-high | `StudentDetailComponent`        | `src/routes/_authed/students/$studentId.tsx:27`                                         | `StudentInfoCard`, `AssignmentRow`, `CourseAssignmentPanel`, `EmptyAssignmentsState` (JSX sub-components); shell orchestrates loader data + navigation only; pure derivations already in `student-detail-view.domain` (`groupAssignmentsByCourse`, `computeCourseAverageGrade`, `getAssignmentRowStatus`, formatters)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 2026-07-04 |
| ✅ done | 193 | very-high | `PostCard`                      | `src/components/post/post-card/PostCard.tsx:447`                                        | `usePostReactions` + `usePostComments` (composed of `useCommentsPagination`) + `usePostEditing` hooks; `PostCardComments` wiring sub-component; `PostCardProps`/`UsePostEditingArgs` types extracted; pure logic routed to colocated `post-card.domain.ts` (`toggleReactionInList`, `appendToPreview`, `removeCommentById`, `replaceComment`, `isEditedTimestamps`, 100% covered)                                                                                                | 2026-07-04 |
| ✅ done | 172 | very-high | `EnrollmentDetailPage`          | `src/routes/_authed/enrollments/$enrollmentId.tsx:62`                                   | `useEnrollmentDetailPage` hook (mutations + dialog state), `EnrollmentHeaderActions`, `EnrollmentStatusSelect`, `SendInvitationDialog` + `SendInvitationDialogFooter`, `EnrollmentAdminDialogs` (JSX sub-components); `EnrollmentDetail` / `EnrollmentPageController` types extracted                                                                                                                                                                                          | 2026-07-04 |
| ✅ done | 169 | very-high | `AssignmentDialog`              | `src/components/dialog/assignment-dialog/AssignmentDialog.tsx:288`                      | `AssignmentCoreFields` + `AssignmentFormFields` (per-section `withForm`); `useAssignmentDialog` composed of `useAssignmentMutations` + `useAssignmentForms` hooks; shell is mode dispatch only (reuses existing `assignment-dialog.domain` helpers, no new logic)                                                                                                                                                                                                              | 2026-07-05 |
| ✅ done | 152 | very-high | `LandingCourseShowcase`         | `src/components/landing/courses.tsx:111`                                                | `CourseShowcaseSidebar` + `CourseGridItem` (header/nav/grid JSX), `CourseFeatureCard` → `CoursePanelHero` + `CourseLessonAnchors` (panel JSX); shell keeps carousel state + section frame only; `CourseShowcaseSidebarProps` type extracted; pure-JSX cut, no new logic                                                                                                                                                                                                        | 2026-07-05 |
| ✅ done | 152 | very-high | `CourseDetailComponent`         | `src/routes/_authed/courses/$courseId.tsx:63`                                           | `CourseDetailHeader` (PageHeader + teachers metadata + `EntityHeaderActions`), `CourseSections` (`CourseDetailSections` wiring + dialog-open callbacks), `CourseEditDeleteDialogs`, `LessonMaterialDialogs` (JSX sub-components); shell holds only dialog state + delete mutation; `CourseDetailData`/dialog-state types extracted (reuses existing `course-detail.domain` helpers, no new logic)                                                                              | 2026-07-05 |
| ✅ done | 151 | very-high | `LandingAboutSection`           | `src/components/landing/about/about.tsx:101`                                            | `AboutOverviewHeader`, `ProgramStatsGrid`, `AdditionalCurriculum`, `ExcellenceAwards` (left column), `AboutTimelinePanel` → `TimelinePanelHeader` + `TimelineEventRow` (timeline panel); pure-JSX mechanical cut, no new logic; shell is grid orchestration only                                                                                                                                                                                                              | 2026-07-05 |
| ✅ done | 143 | very-high | `LandingTestimonialsSection`    | `src/components/landing/testimonials.tsx:177`                                           | `TestimonialsHeader` (eyebrow/title/nav), `TestimonialCardTrack` → `TestimonialCard` (single carousel card), `TestimonialIndicators` → `TestimonialIndicatorButton` (deduped both indicator rows into one shared button); shell keeps carousel state + section frame only; `TestimonialsNavProps`/`TestimonialsCarouselProps` types extracted; pure-JSX mechanical cut, no new logic                                                                                          | 2026-07-05 |
| ✅ done | 141 | very-high | `DataTable`                     | `src/components/table/DataTable.tsx:467`                                                | `DataTableFrame` (search/content/pagination JSX shell, `'use no memo'` — forwards stable `table`); `useDataTableState` composed of `useDataTableSyncedState` (state + prop-sync effects) + `useDataTableChangeHandlers` (sorting/pagination/filter handlers), now also builds the `useReactTable` instance; `derivePaginationInfo` helper (plain derivation, not a memoization target); `PaginationDisplayInfo`/`UseDataTableStateArgs`/`DataTableFrameProps` types extracted | 2026-07-05 |
| ✅ done | 137 | very-high | `PdfViewer`                     | `src/components/library/PdfViewer.tsx:17`                                               | usePdfDocument, useViewerSize, usePdfPageRender (extracted effect-owning hooks), PdfPaginationControls (JSX sub-component); pure-JSX/effect mechanical cut, no branchy logic warranting a domain/ file | 2026-07-05 |
| ✅ done | 133 | very-high | `LessonDialog`                  | `src/components/dialog/lesson-dialog/LessonDialog.tsx:29`                               | `LessonFormFields` (single `withForm` section: title/scheduledTime/duration/content/isPublished fields), `LessonDeleteDialog` (JSX sub-component wrapping `DeleteConfirmDialog`), `useLessonDialogForm` hook (mutations + form + reset effect); shell now only dispatches delete vs. form-dialog rendering (reuses existing `lesson-dialog.domain` helpers, no new logic)                                                                                                | 2026-07-05 |
| ✅ done | 131 | very-high | `<arrow>` (run-loop effect)     | `src/components/animate-ui/icons/icon.tsx:248`                                          | run-loop effect body delegated to `runAnimationLoop` in `icon-animation.domain.ts` (state machine split into small `domain/` helpers, unit-tested at 100%); effect now only builds context + handles cleanup inside `useAnimationRunLoop`                                                                                                                                                                                                                                     | 2026-06-22 |
| ✅ done | 130 | very-high | `CalendarView`                  | `src/components/view/calendar-view/CalendarView.tsx:18`                                 | `CalendarHeader` (month label + prev/today/next buttons), `CalendarWeekdayHeader` (static Sun–Sat row, `WEEKDAY_LABELS` hoisted), `CalendarDayGrid` (day-cell map), `CalendarDayCellView` (single day cell, wraps existing `buildCalendarDayCell` domain helper) — pure-JSX mechanical cut, no new logic, reuses existing `calendar-view.domain` helpers                                                                                                                    | 2026-07-05 |
| ✅ done | 123 | very-high | `CourseDialog`                  | `src/components/dialog/course-dialog/CourseDialog.tsx:259`                              | `useCourseThumbnail` (file upload + thumbnail state + upload handler), `useCourseMutations` (create/update mutation wiring), `useCourseForm` (useAppForm + reset effect), `useCourseDialog` master hook composing the three plus teachers fetch; shell now only calls the hook and renders `FormDialog` + `CourseFormFieldsContent` (reuses existing `course-dialog.domain` helpers, no new logic)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 2026-07-05 |
| ✅ done | 120 | very-high | `render`                        | `src/components/dialog/course-dialog/CourseDialog.tsx:137`                              | `CourseTeacherFields` (teacher1/teacher2 `withForm` section), `CourseCoreFields` (title/orderIndex + teacher dispatch, `withForm` section), `CourseDetailFields` (description + thumbnail + isPublished, `withForm` section); `CourseFormFieldsContent` now a thin composer dispatching the three sections                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 2026-07-05 |
| ✅ done | 120 | very-high | `LandingMarksSection`           | `src/components/landing/marks.tsx:200`                                                  |  `MarksSidebar` (left column: scripture header + active-mark nav), `MarksPanelHeader` (right panel title/quote/quote2/description), `MarksPanelBody` (video vs. testimony dispatch) — pure-JSX mechanical cut, no new logic                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 2026-07-05          |
| ✅ done | 118 | high      | `CommentItem`                   | `src/components/post/post-card/PostCard.tsx:788`                                        | `useCommentEditing` + `useCommentReactions` hooks (reaction toggling via shared `toggleReactionInList` domain helper); shell is pure JSX orchestration                                                                                                                                                                                                                                                                                                                          | 2026-07-04 |
| ✅ done | 114 | high      | `LessonDetailComponent`         | `src/routes/_authed/lessons/$lessonId.tsx:87`                                           | `LessonPageHeader`, `LessonAssignmentsPanel`, `LessonAssignmentDialog`, `LessonEditDialog`, `LessonDetailView` (JSX sub-components); `LessonDetailViewProps` type extracted (barely-over trim); delete-assignment handler threaded through as a prop, no logic reimplemented; pure-JSX cut, no domain file                                                                                                                                                                                                                                                                                                                                                | 2026-07-05 |
| ✅ done | 113 | high      | `NotificationsMenu`             | `src/components/navigation/notifications-menu/NotificationsMenu.tsx:223`                | `useNotificationGroups` (polling state + effects + displayUnreadCount memo) and `useMarkNotificationsRead` (mark-all/mark-group handlers) hooks; shell keeps dropdown-open state + JSX, reusing existing `NotificationTriggerButton`/`NotificationMenuHeader`/`NotificationsList`; no domain file needed                                                                                                                                                                                                                                                                                                                                                | 2026-07-05 |
| ✅ done | 111 | high      | `LandingOfficialInfo`           | `src/components/landing/official-info.tsx:10`                                           | `OfficialInfoCard` (shared card shell, deduped 4 near-identical blocks), `OfficialInfoCards` (4-card grid), `OfficialInfoQuote` (closing scripture block); `CARD_CLASSNAME` hoisted to module const; pure static JSX, no domain file                                                                                                                                                                                                                                                                                                                                                | 2026-07-05 |
| ✅ done | 109 | high      | `EventsComponent`               | `src/routes/_authed/events.tsx:66`                                                      | `EventCategoryCell` (category-chip cell JSX), `useEventColumns` hook (builds the `ColumnDef` array, parameterized on `openDialog`), `EventsPageHeader`, `EventsTableSection` (empty-state vs `DataTable` branch); `OpenEventDialog` type extracted; pure-JSX cut, no domain file                                                                                                                                                                                                                                                                                                                                                                | 2026-07-05 |
| ✅ done | 108 | high      | `PaginationFooter`              | `src/components/table/DataTable.tsx:358`                                                | `PaginationSummaryRow` (start/end/total + per-page select) and `PaginationNavRow` (prev/page-window/next), both `'use no memo'`; `PaginationFooter` itself now a thin composer of the two, claimed alongside `DataTable` (same file)                                                                                                                                                                                                                                          | 2026-07-05 |
| ✅ done | 103 | high      | `StudentSubmissionForm`         | `src/components/assignment/assignment-detail-sections/AssignmentDetailSections.tsx:189` | `SubmissionContentField`, `SubmissionFileUrlField`, `SubmissionFormActions` (JSX sub-components); shell now a thin dispatcher composing the three plus existing `SubmissionStatusCard`. Plain parent-controlled prop-drilled form (not TanStack `withForm`), no domain file, no `'use no memo'` needed                                                                                                                                                                                                                                                                                                                                       | 2026-07-05 |
| ✅ done | 100 | high      | `SidebarProvider`               | `src/components/ui/sidebar/Sidebar.tsx:60`                                              | `useSidebarOpenState` (controlled/uncontrolled open state + cookie persistence), `useSidebarKeyboardShortcut` (keydown effect), `useSidebarProviderState` (composes the two + `toggleSidebar`/`state`/memoized `contextValue`) hooks; `SidebarProviderProps` type extracted; shell is thin. Claimed alongside `Sidebar` (same file)                                                                                                                                                                                                                                                                                                        | 2026-07-05 |
| ✅ done | 100 | high      | `Sidebar`                       | `src/components/ui/sidebar/Sidebar.tsx:161`                                             | `SidebarStatic` (`collapsible='none'` branch), `SidebarMobile` (Sheet branch), `SidebarDesktop` (fixed-gap/container branch) → `SidebarGap` (JSX sub-components); `SidebarProps` type extracted; markup/data-attrs/CSS-vars preserved verbatim, no `'use no memo'` needed (sub-components take only primitives/callbacks/children). Claimed alongside `SidebarProvider` (same file)                                                                                                                                                                                                                                                          | 2026-07-05 |
| ✅ done | 100 | high      | `<arrow>`                       | `src/routes/_authed/students/$studentId.tsx:109`                                        | arrow inlined into named `AssignmentRow` sub-component (< 60 LOC); overdue/grade branching via `student-detail-view.domain` helpers                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 2026-07-04 |
| ✅ done | 99  | high      | `LibraryComponent`              | `src/routes/_authed/library/index.tsx:184`                                              | `buildLibraryColumns(viewer, openDialog)` (TanStack column defs; JSX cell renderers so not domain-eligible, not a hook), `LibraryHeader` (page header/title/Add-Media button); pure-JSX cut, no domain file, no `'use no memo'`                                                                                                                                                                                                                                                | 2026-07-05 |
| ✅ done | 98  | high      | `render`                        | `src/components/dialog/event-dialog/EventDialog.tsx:199`                                | `EventScheduleFields` (title/startTime/endTime), `EventDetailFields` (category/location/zoomLink/description); per-section `withForm` components, no `'use no memo'`; pure-JSX cut, no domain file                                                                                                                                                                                                                                                                              | 2026-07-05 |
| ✅ done | 97  | high      | `AssignmentCard`                | `src/components/view/AssignmentCard.tsx:14`                                             | `AssignmentCardHeader`, `AssignmentCardDueRow`, `AssignmentCardFooterSummary`, `AssignmentCardActionRow`; view-model derivation already in existing `assignments-view.domain.ts`; pure-JSX cut, no new domain file, no `'use no memo'`                                                                                                                                                                                                                                          | 2026-07-05 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | —          |
| ✅ done | 91  | high      | `AssignmentsView` | `src/components/view/assignments-view/AssignmentsView.tsx:51` | `AssignmentsHeader` (title/subtitle + course-filter Select), `CourseGroup` (per-course heading + `AssignmentCard` grid, empty-group guard moved inside), `AssignmentsEmptyState` — pure-JSX same-file cut; branchy logic already in `assignments-view.domain.ts`; no `'use no memo'` needed | 2026-07-07 |
| ✅ done | 90  | high      | `FormDialog` | `src/components/ui/form-dialog/FormDialog.tsx:36` | `FormDialogHeader` (mode eyebrow + title + description), `FormDialogDefaultFooter` (cancel + conditional submit) JSX sub-components; `FORM_DIALOG_BACKGROUND_STYLE` hoisted to module const; external props API and markup unchanged; logic already in `form-dialog.domain.ts` | 2026-07-07 |
| ✅ done | 86  | med       | `LibraryBody`                   | `src/routes/_authed/library/index.tsx:97`                                               | `LibraryShelves` (shelf-topics map; `canCreate` now an explicit prop), `LibraryManageSection` (Manage DataTable); types `OpenLibraryDialog`, `LibraryShelvesProps`, `LibraryManageSectionProps`, `LibraryBodyProps`; pure-JSX cut, no domain file                                                                                                                                                                                                                              | 2026-07-05 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | —          |
| ✅ done | 85  | med      | `DocumentFileControl` | `src/components/dialog/media-dialog/MediaDialog.tsx:119` | Stale row — already decomposed by prior wave (`DocumentFilePicked`/`DocumentFileExisting`/`DocumentFileEmpty`/`DocumentFileVariant` sub-components + `media-dialog.domain.ts` helpers); verified body ≤ 60, eslint clean, domain 100% covered | 2026-07-07 |
| ✅ done | 81  | med       | `render`                        | `src/components/dialog/assignment-dialog/AssignmentDialog.tsx:205`                      | `GradeFormFields` (`withForm` section: grade + feedback), `GradeDialogFooter` (JSX sub-component); `GradeSubmissionDialog` render keeps only the dialog scaffold + `SubmissionPreview`                                                                                                                                                                                                                                                                                        | 2026-07-05 |
| ✅ done | 81  | med      | `CommentComposer` | `src/components/post/post-card/PostCard.tsx:909` | Stale row — already decomposed (`CommentAvatar` sub-component + mutation-based handlers); verified body ~57 lines, eslint clean | 2026-07-07 |
| ✅ done | 77  | med      | `EventPreviewModal` | `src/components/dialog/event-preview-modal/EventPreviewModal.tsx:135` | `EventPreviewHeader` (DialogHeader: title/chip/course name), `EventPreviewFooter` (Close / View Details buttons) — pure-JSX same-file cut; body 71 → ~40; logic already in `event-preview-modal.domain.ts`; no `'use no memo'` needed | 2026-07-07 |
| ✅ done | 76  | med      | `IconWrapper` | `src/components/animate-ui/icons/icon.tsx:631` | Stale row — already a thin dispatcher (~46 counted lines) over prior extractions `renderIconComponent`/`renderIconWithOverrides`/`renderInheritedIcon`/`renderStandaloneAnimatedIcon` + predicates; eslint clean, no changes | 2026-07-07 |
| ✅ done | 75  | med      | `PostComposer` | `src/routes/_authed/posts.tsx:359` | `ComposerAvatar` (avatar image / initials fallback + `initials` derivation) — pure-JSX same-file cut; body 71 → < 60; no hook/domain extraction warranted; no `'use no memo'` needed | 2026-07-07 |
| ✅ done | 74  | low      | `MaterialsSection` | `src/components/course/CourseDetailSections.tsx:182` | `MaterialCardItem` (per-material MediaCard + hover EntityHeaderActions overlay) + `MaterialsSectionProps` type — pure-JSX cut; claimed alongside `LessonActions`/`LessonsSection` (same file) | 2026-07-07 |
| ✅ done | 74  | low       | `GemLecturerCard`               | `src/components/landing/lecturers.tsx:256`                                              | `GemCardMedia` (image/initials fallback), `GemCardOverlay` (bottom frosted name/bio/gem panel) — pure-JSX sub-components; claimed alongside `LandingLecturerGemsSection` (same file)                                                                                                                                                                                                                                                                                           | 2026-06-22 |
| ✅ done | 74  | low      | `TeachersView` | `src/components/view/TeachersView.tsx:10` | `TeachersHeader` (header block that was duplicated verbatim in empty-state and populated branches) — pure-JSX cut, dedup as side effect; body 67 → < 60 | 2026-07-07 |
| ✅ done | 74  | low      | `ZoomComponent` | `src/routes/_authed/zoom.tsx:39` | `ZoomPageHeader` (page-header JSX, `canEdit`/`onAdd` props) — pure-JSX cut; body 70 → < 60; no `'use no memo'` needed | 2026-07-07 |
| ✅ done | 73  | low      | `LandingActiveItemNav` | `src/components/landing/primitives/primitives.tsx:363` | `LandingActiveItemNavButton` (deduped prev/next buttons) + handler if-wrappers collapsed to `() => onPrevious?.()` one-liners; body 70 → < 60; exports/markup unchanged | 2026-07-07 |
| ✅ done | 73  | low      | `UpcomingAssignmentRow` | `src/components/list/upcoming-assignments-list/UpcomingAssignmentRow.tsx:15` | `AssignmentStatusBadge` (status chip) + `AssignmentRowMeta` (due-date + teacher-stats row) — pure-JSX cut; `LucideIcon` type import added; logic already in `upcoming-assignments-list.domain.ts` | 2026-07-07 |
| ✅ done | 72  | low      | `LessonActions` | `src/components/course/CourseDetailSections.tsx:257` | `LessonManageButtons` (edit/delete icon-button pair under `view.canManage`) + `LessonActionsProps` type — pure-JSX cut; branch derivation already in `lesson-actions.domain.ts` | 2026-07-07 |
| ✅ done | 72  | low      | `TeacherModal` | `src/components/dialog/teacher-modal/TeacherModal.tsx:79` | Stale row — already decomposed (`TeacherAvatarPanel`/`TeacherBioPanel` + `teacher-modal.domain.ts` view model); body ~44 counted lines, eslint clean, no changes | 2026-07-07 |
| ✅ done | 71  | low      | `EnrollmentDetails` | `src/components/enrollment/enrollment-details/EnrollmentDetails.tsx:45` | Stale row — already decomposed (`FieldLabel`/`Field`/`LongField` helpers + `enrollment-details.domain.ts`); body ~48 counted lines, eslint clean, no changes | 2026-07-07 |
| ✅ done | 70  | low      | `SignupOtpPanel` | `src/components/auth/signup-form/signup-form.tsx:501` | Stale row — already ≤ 60 (~45 lines) from prior extraction (composes existing `OtpPanelHeader`/`OtpCodeInput`/`OtpResendButton`); eslint clean, no changes | 2026-07-07 |
| ✅ done | 70  | low       | `NoteEditor`                    | `src/components/enrollment/evaluation-overlay/EvaluationOverlay.tsx:158`                | `useDebouncedNoteSave` hook (debounced ~400ms autosave + unmount flush) extracted; `NoteEditor` shell now only renders the textarea + `SaveStatus`                                                                                                                                                                                                                                                                                                                           | 2026-06-22 |
| ✅ done | 70  | low      | `LandingScriptureSectionHeader` | `src/components/landing/primitives/primitives.tsx:292` | `LandingScriptureSectionHeaderBody` (scripture body `<p>` sub-tree, `ScriptureLine[]` prop from existing domain file) — pure-JSX cut; body 67 → < 60; markup unchanged | 2026-07-07 |
| ✅ done | 69  | low      | `CourseCard` | `src/components/card/course-card/CourseCard.tsx:266` | `CourseDescription` (`description`/`theme` props, description `<p>` block) — pure-JSX cut; body 64 → ~57; no `'use no memo'` needed | 2026-07-07 |
| ✅ done | 69  | low      | `LessonsSection` | `src/components/course/CourseDetailSections.tsx:429` | Barely-over trim: inline `Pick<...>` props annotation extracted to named `LessonsSectionProps` — drops the body under 60; no sub-component needed | 2026-07-07 |
| ✅ done | 69  | low      | `CommentsSection` | `src/components/post/post-card/PostCard.tsx:317` | Stale row — already decomposed (`buildCommentsSectionViewModel` domain + `CommentsCountHeader`/`CommentItemsList`); uncovered branch in `post-card.domain.ts` closed with one added test (100% restored) | 2026-07-07 |
| ✅ done | 68  | low      | `MediaDetailComponent` | `src/routes/_authed/library/$mediaId.tsx:18` | `MediaDetailMetadata` (PageHeader metadata: `category`/`isPublished`/`showStatus` plain props) — pure-JSX cut; body 65 → < 60; no `'use no memo'` needed | 2026-07-07 |
| ✅ done | 67  | low       | `EventViewMode`                 | `src/components/dialog/event-dialog/EventDialog.tsx:129`                                | Barely-over trim (no sub-component extraction): inline props annotation extracted to named `EventViewModeProps` and destructure collapsed to one line — drops the body under 60                                                                                                                                                                                                                                                                                                | 2026-07-05 |
| ✅ done | 67  | low      | `AppSidebar` | `src/components/navigation/AppSidebar.tsx:196` | `BrandHeader` (static brand/logo SidebarHeader subtree, no props) — pure-JSX cut; body 64 → ~35 | 2026-07-07 |
| ✅ done | 66  | low      | `LandingLeadershipSection` | `src/components/landing/leadership.tsx:132` | `LeadershipGroup` (`label`/`members` props, deduped two identical label+divider+grid blocks) — pure-JSX cut; body 63 → < 60; markup byte-identical | 2026-07-07 |
| ✅ done | 63  | low      | `ThumbnailControl` | `src/components/dialog/media-dialog/MediaDialog.tsx:205` | Stale row — already decomposed alongside `DocumentFileControl` (same prior wave); verified body ~52 lines, eslint clean | 2026-07-07 |
| ✅ done | 63  | low      | `LandingQASection` | `src/components/landing/qa.tsx:161` | Stale row — already ≤ 60 under ESLint counting; eslint clean, no changes | 2026-07-07 |
| ✅ done | 63  | low      | `CourseListInternal` | `src/components/list/CourseList.tsx:48` | Stale row — already ≤ 60 (view model already in `domain/course-list.domain.ts`); eslint clean, no changes | 2026-07-07 |
| ✅ done | 62  | low       | `ThumbnailUploadField`          | `src/components/dialog/course-dialog/CourseDialog.tsx:60`                               | Barely-over trim (no sub-component extraction): inline props annotation extracted to named `ThumbnailUploadFieldProps` — drops the body under 60                                                                                                                                                                                                                                                                                                                               | 2026-07-05 |
| ✅ done | 62  | low       | `YouTubeBlockedFallback`        | `src/components/library/YouTubeEmbed.tsx:10`                                            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |

Add a new row per target if a later audit surfaces one. Leave the table as the live worklist;
do not delete `✅ done` rows — they are the fix history.

## Alternatives Considered

- **Render/jsdom `.test.tsx` to "verify" the splits** — rejected. `docs/rules/complexity.md`
  forbids them; they couple to UI structure and break on refactor. Behaviour preservation **for**
  JSX extraction rests on typecheck + review instead.
- **Per-function `eslint-disable max-lines-per-function`** — rejected as a paydown tool. It
  hides the work rather than removing it. Reserved as a justified escape hatch for genuinely
  irreducible bodies only (see `docs/rules/unit-size.md`).
- **Raise the 60-LOC limit / disable the rule** — rejected. The limit is the signal that a
  function is doing too much; muting it defeats the purpose.
- **Custom base-diff gate code for "introduced" oversize** — rejected as unnecessary. ESLint 9
  bulk suppressions grandfather the existing set natively, so new violations fail with no
  bespoke gate logic.
- **Big-bang decomposition of all hotspots at once** — rejected. Violates Surgical Changes;
  large untested refactors are exactly the risk the metric flags. Incremental same-feature
  batches keep each change reversible and reviewable.

## Consequences

- A consistent, low-risk decomposition method applied identically by every contributor and
  cloud agent; component shells become thin orchestration over named sub-components.
- The `unit_size_profile` improves over time; the enforced rule + suppressions baseline stop
  the pile from regrowing.
- Unlike ADR 0010, most extractions add **no new tests** (pure JSX); coverage is unchanged for
  those, and only genuinely branchy logic migrates into the tested `domain/` layer.
- The work is open-ended (75 targets); it proceeds opportunistically in LOC-descending order
  rather than as one blocking effort. Untouched functions are decomposed only when targeted.
- The ledger + claim protocol let multiple agents work in parallel without colliding.

See also: ADR 0010 (CRAP reduction via domain extraction), ADR 0004 (three-layer `src/utils/`
architecture), ADR 0003 (unit-testing strategy), `docs/rules/unit-size.md` (the enforced
rule), `docs/rules/complexity.md`, and `docs/rules/react-compiler-memo.md`.
