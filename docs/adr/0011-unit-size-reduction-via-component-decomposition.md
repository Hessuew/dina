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

### Workflow — work locally, never in a separate worktree

Make paydown changes **directly in the local working tree on the current branch**. Do **not**
create or switch into a separate git worktree for this work. The developer reviews the local
changes via code review and puts them forward (commits/PRs) themselves. Run the fast verification
loop locally, update this ledger, and stop.

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
5. If function after changes is over barely over 60 lines extract the prop types to separate type,
   this lowers the function line count easily.

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

- The function no longer appears in `complexity.large_functions`
  (`bunx fallow audit --format json --base main`); body < 61 LOC. Test files are already
  excluded via `.fallowrc.json` `health.ignore`, so the target's own new `*.domain.test.ts`
  `describe` block won't show up looking like leftover work.
- **No sub-component you extracted is over 60 LOC either.** The named target and **every**
  helper/sub-component created while decomposing it must all be under the limit — the changed
  file must contribute **zero** entries to `large_functions`. `fallow audit large_functions`
  uses a raw-LOC count that can read slightly under ESLint's `max-lines-per-function`
  (`skipBlankLines`/`skipComments`); when a freshly extracted sub-component is in the 60–80
  band, treat ESLint's stricter count as the gate and split it further rather than trusting the
  audit's silence.
- `bun run typecheck` clean.
- Any extracted `domain/` logic is covered at 100%.
- **No behaviour change.** Honest limitation: without render tests, behaviour preservation for
  pure-JSX extractions rests on `typecheck` + the mechanical nature of the cut + code review —
  the documented cost of the no-render-test rule. Extracted logic remains test-guarded.

### Verification — the fast loop (don't run the full gate every cycle)

Per project practice, do **not** run the full `bun run quality:gate` as the inner loop. Instead:

1. **Progress metric (cheap):** `bunx fallow audit --format json --base main --production-health` → the target is
   gone from `complexity.large_functions` and the production count dropped. This is the
   burndown number. **Read `large_functions`, not the verdict** (this bit us on `EnrolmentForm`):
   `audit --base main` returns a whole-branch `verdict` (pass/warn/fail) over _every_ changed
   file; on a long-lived paydown branch that `fail` is dominated by unrelated pre-existing
   findings (dead code, other commits) and is **not** your per-target signal. Confirm your
   function left `large_functions`; ignore the global verdict. (Test files are already excluded
   via `.fallowrc.json` `health.ignore`, so the array is production-only without any flag.)
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

**Current open:** 61 (16 very-high / 15 high / 7 med / 23 low)

> Note: claiming a row (todo → in progress) leaves it "open"; only completion decrements the
> count. Baseline 73 → 72 reflects `MediaDialog` completed this session.

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
| 🔨 in progress | 197 | very-high | `StudentDetailComponent`        | `src/routes/_authed/students/$studentId.tsx:27`                                         | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 2026-06-22T12:33Z          |
| ⬜ todo | 193 | very-high | `PostCard`                      | `src/components/post/post-card/PostCard.tsx:447`                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 172 | very-high | `EnrollmentDetailPage`          | `src/routes/_authed/enrollments/$enrollmentId.tsx:62`                                   | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 169 | very-high | `AssignmentDialog`              | `src/components/dialog/assignment-dialog/AssignmentDialog.tsx:288`                      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 152 | very-high | `LandingCourseShowcase`         | `src/components/landing/courses.tsx:111`                                                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 152 | very-high | `CourseDetailComponent`         | `src/routes/_authed/courses/$courseId.tsx:55`                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 151 | very-high | `LandingAboutSection`           | `src/components/landing/about/about.tsx:101`                                            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 143 | very-high | `LandingTestimonialsSection`    | `src/components/landing/testimonials.tsx:177`                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 141 | very-high | `DataTable`                     | `src/components/table/DataTable.tsx:467`                                                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 137 | very-high | `PdfViewer`                     | `src/components/library/PdfViewer.tsx:17`                                               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 133 | very-high | `LessonDialog`                  | `src/components/dialog/lesson-dialog/LessonDialog.tsx:29`                               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ✅ done | 131 | very-high | `<arrow>` (run-loop effect)     | `src/components/animate-ui/icons/icon.tsx:248`                                          | run-loop effect body delegated to `runAnimationLoop` in `icon-animation.domain.ts` (state machine split into small `domain/` helpers, unit-tested at 100%); effect now only builds context + handles cleanup inside `useAnimationRunLoop`                                                                                                                                                                                                                                     | 2026-06-22 |
| ⬜ todo | 130 | very-high | `CalendarView`                  | `src/components/view/CalendarView.tsx:18`                                               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 123 | very-high | `CourseDialog`                  | `src/components/dialog/course-dialog/CourseDialog.tsx:259`                              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 120 | very-high | `render`                        | `src/components/dialog/course-dialog/CourseDialog.tsx:137`                              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 120 | very-high | `LandingMarksSection`           | `src/components/landing/marks.tsx:200`                                                  | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 118 | high      | `CommentItem`                   | `src/components/post/post-card/PostCard.tsx:788`                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 114 | high      | `LessonDetailComponent`         | `src/routes/_authed/lessons/$lessonId.tsx:87`                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 113 | high      | `NotificationsMenu`             | `src/components/navigation/notifications-menu/NotificationsMenu.tsx:223`                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 111 | high      | `LandingOfficialInfo`           | `src/components/landing/official-info.tsx:10`                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 109 | high      | `EventsComponent`               | `src/routes/_authed/events.tsx:66`                                                      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 108 | high      | `PaginationFooter`              | `src/components/table/DataTable.tsx:358`                                                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 103 | high      | `StudentSubmissionForm`         | `src/components/assignment/assignment-detail-sections/AssignmentDetailSections.tsx:189` | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 100 | high      | `SidebarProvider`               | `src/components/ui/sidebar/Sidebar.tsx:60`                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 100 | high      | `Sidebar`                       | `src/components/ui/sidebar/Sidebar.tsx:161`                                             | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| 🔨 in progress | 100 | high      | `<arrow>`                       | `src/routes/_authed/students/$studentId.tsx:109`                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 2026-06-22T12:33Z          |
| ⬜ todo | 99  | high      | `LibraryComponent`              | `src/routes/_authed/library/index.tsx:184`                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 98  | high      | `render`                        | `src/components/dialog/event-dialog/EventDialog.tsx:199`                                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 97  | high      | `AssignmentCard`                | `src/components/view/AssignmentCard.tsx:14`                                             | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 91  | high      | `AssignmentsView`               | `src/components/view/assignments-view/AssignmentsView.tsx:51`                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 90  | high      | `FormDialog`                    | `src/components/ui/form-dialog/FormDialog.tsx:36`                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 86  | med       | `LibraryBody`                   | `src/routes/_authed/library/index.tsx:97`                                               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 85  | med       | `DocumentFileControl`           | `src/components/dialog/media-dialog/MediaDialog.tsx:119`                                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 81  | med       | `render`                        | `src/components/dialog/assignment-dialog/AssignmentDialog.tsx:205`                      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 81  | med       | `CommentComposer`               | `src/components/post/post-card/PostCard.tsx:909`                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 77  | med       | `EventPreviewModal`             | `src/components/dialog/event-preview-modal/EventPreviewModal.tsx:135`                   | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 76  | med       | `IconWrapper`                   | `src/components/animate-ui/icons/icon.tsx:631`                                          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 75  | med       | `PostComposer`                  | `src/routes/_authed/posts.tsx:359`                                                      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 74  | low       | `MaterialsSection`              | `src/components/course/CourseDetailSections.tsx:182`                                    | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ✅ done | 74  | low       | `GemLecturerCard`               | `src/components/landing/lecturers.tsx:256`                                              | `GemCardMedia` (image/initials fallback), `GemCardOverlay` (bottom frosted name/bio/gem panel) — pure-JSX sub-components; claimed alongside `LandingLecturerGemsSection` (same file)                                                                                                                                                                                                                                                                                           | 2026-06-22 |
| ⬜ todo | 74  | low       | `TeachersView`                  | `src/components/view/TeachersView.tsx:10`                                               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 74  | low       | `ZoomComponent`                 | `src/routes/_authed/zoom.tsx:39`                                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 73  | low       | `LandingActiveItemNav`          | `src/components/landing/primitives/primitives.tsx:363`                                  | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 73  | low       | `UpcomingAssignmentRow`         | `src/components/list/upcoming-assignments-list/UpcomingAssignmentRow.tsx:15`            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 72  | low       | `LessonActions`                 | `src/components/course/CourseDetailSections.tsx:257`                                    | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 72  | low       | `TeacherModal`                  | `src/components/dialog/teacher-modal/TeacherModal.tsx:79`                               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 71  | low       | `EnrollmentDetails`             | `src/components/enrollment/enrollment-details/EnrollmentDetails.tsx:45`                 | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 70  | low       | `SignupOtpPanel`                | `src/components/auth/signup-form/signup-form.tsx:501`                                   | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ✅ done | 70  | low       | `NoteEditor`                    | `src/components/enrollment/evaluation-overlay/EvaluationOverlay.tsx:158`                | `useDebouncedNoteSave` hook (debounced ~400ms autosave + unmount flush) extracted; `NoteEditor` shell now only renders the textarea + `SaveStatus`                                                                                                                                                                                                                                                                                                                           | 2026-06-22 |
| ⬜ todo | 70  | low       | `LandingScriptureSectionHeader` | `src/components/landing/primitives/primitives.tsx:292`                                  | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 69  | low       | `CourseCard`                    | `src/components/card/course-card/CourseCard.tsx:266`                                    | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 69  | low       | `LessonsSection`                | `src/components/course/CourseDetailSections.tsx:429`                                    | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 69  | low       | `CommentsSection`               | `src/components/post/post-card/PostCard.tsx:317`                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 68  | low       | `MediaDetailComponent`          | `src/routes/_authed/library/$mediaId.tsx:18`                                            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 67  | low       | `EventViewMode`                 | `src/components/dialog/event-dialog/EventDialog.tsx:129`                                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 67  | low       | `AppSidebar`                    | `src/components/navigation/AppSidebar.tsx:196`                                          | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 66  | low       | `LandingLeadershipSection`      | `src/components/landing/leadership.tsx:132`                                             | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 63  | low       | `ThumbnailControl`              | `src/components/dialog/media-dialog/MediaDialog.tsx:205`                                | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 63  | low       | `LandingQASection`              | `src/components/landing/qa.tsx:161`                                                     | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 63  | low       | `CourseListInternal`            | `src/components/list/CourseList.tsx:48`                                                 | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 62  | low       | `ThumbnailUploadField`          | `src/components/dialog/course-dialog/CourseDialog.tsx:60`                               | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |
| ⬜ todo | 62  | low       | `YouTubeBlockedFallback`        | `src/components/library/YouTubeEmbed.tsx:10`                                            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | —          |

Add a new row per target if a later audit surfaces one. Leave the table as the live worklist;
do not delete `✅ done` rows — they are the fix history.

## Alternatives Considered

- **Render/jsdom `.test.tsx` to "verify" the splits** — rejected. `docs/rules/complexity.md`
  forbids them; they couple to UI structure and break on refactor. Behaviour preservation for
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
