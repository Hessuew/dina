# Unit Testing Plan

## Goal

Trustworthy tests that act as a release signal: if `bun run test` passes, the business logic is correct.

## Commands

```bash
bun run test           # run all tests (CI gate)
bun run test:coverage  # run with 100% coverage check on domain layers
```

## Layer architecture (per feature in src/utils/)

Each feature in `src/utils/` is split into three layers. Only the domain layer is tested:

```
src/utils/student/
  students.ts                    ← service: thin orchestrator (createServerFn, no direct DB)
  repository/
    student.repository.ts        ← all DB/Drizzle calls — /* v8 ignore start/end */
  domain/
    student.domain.ts            ← pure business logic, no IO
    student.domain.test.ts       ← 100% coverage enforced ← TESTS LIVE HERE
```

Cross-cutting root domain (grade, assignment, post, student services) stays in `src/domain/` as-is.

## Utils refactor order

Each row = one cycle of: extract repository → extract domain → write tests → verify coverage.
Update status as each folder is completed.

| #   | Folder           | Status | Domain functions extracted                                                                                                                                                                                                                            |
| --- | ---------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅  | `student`        | DONE   | `buildStudentWithStats`, `buildAverageGradeByCourse`, `buildAssignmentsWithSubmissions`                                                                                                                                                               |
| 1   | `calendar`       | DONE   | `buildCalendarEvents(lessons, assignments, specialEvents)`                                                                                                                                                                                            |
| 2   | `enrolment`      | DONE   | `generateSecureToken()`, `generateInvitationExpiry()`, `isInvitationResendable(invitation)`                                                                                                                                                           |
| 3   | `event`          | N/A    | _(pure CRUD, no domain logic — repository split skipped)_                                                                                                                                                                                             |
| 4   | `profile`        | DONE   | `checkEmailChangeRateLimit(lastRequestAt, now)`, `generateEmailChangeToken()`, `calculateTokenExpiry()`, `validateEmailChangeToken(record, now)`                                                                                                      |
| 5   | `teachers`       | DONE   | `sortTeachers(teachers)` — fixes `orderIndex === 0` bug, grouped sort                                                                                                                                                                                 |
| 6   | `zoomLink`       | N/A    | _(pure CRUD, no domain logic — repository split skipped)_                                                                                                                                                                                             |
| 7   | `courses`        | DONE   | `buildAssignmentStats(courseAssignments, studentSubmissions)`, `extractTeacherIds(courseTeachers)`, `validateSameTeacher(teacher1Id, teacher2Id)`, `validateTeacherRoles(teachers, teacher1Id, teacher2Id, allowAdmin)` — `lesson.ts` N/A (pure CRUD) |
| 8   | `library`        | DONE   | `toFileType(kind)`, `buildMediaListItems(rows)`, `canManageMedia(role, userId, uploaderId)`, `validatePdfUpload(fileSize, fileType)`, `extractPdfFilePath(fileUrl)`                                                                                   |
| 9   | `invitation`     | DONE   | `generateSecureToken()`, `calculateInvitationExpiry(now)`, `validateInvitationActive(invitation, now)`                                                                                                                                                |
| 10  | `assignments`    | DONE   | Domain already in `src/domain/assignment.service.ts` — repository + service layer added                                                                                                                                                               |
| 11  | `password-reset` | DONE   | `generatePasswordResetToken()`, `calculatePasswordResetExpiry(now)`, `checkPasswordResetCooldown(last, now)`, `checkPasswordResetTokenValid(record, now)`                                                                                             |
| 12  | `signup`         | DONE   | `generateOTP()`, `hashValue(v)`, `calculateOtpExpiry(now)`, `checkOtpResendCooldown(exp, now)`, `validateOtpRecord(record, now)`, `validateSignupInvitation(inv, email, now)`                                                                         |

Folders marked N/A have no extractable domain logic. Repository split is only worth doing when a domain layer follows.

## What to test (priority order)

1. **`src/domain/`** — Root cross-cutting pure logic. Done. 100% covered.
2. **`src/utils/**/domain/`\*\* — Per-feature pure logic. See refactor order above.
3. **`src/utils/authz/permissions.ts`** — Done. Role/permission combinations.
4. **`src/utils/password.ts`** — Done. Password strength boundary cases.
5. **`src/utils/errors.ts`** — Done. Error class hierarchy and transformations.
6. **`src/schemas/`** — Zod schema valid/invalid parsing
7. **`src/hooks/`** — Custom hooks (needs jsdom + @testing-library/react)
8. **`src/components/`** — Only critical interactive widgets

## What NOT to test

- Repository functions — all DB-touching. Wrap with `/* v8 ignore start/end */`.
- Service files (`createServerFn` orchestrators) — framework glue. Mark with `/* v8 ignore */`.
- Barrel `index.ts` re-export files.

## Per-feature refactor checklist

When adding tests to a new utils feature, do this first:

1. **Extract repository** — move all Drizzle queries to `repository/<feature>.repository.ts`, add `/* v8 ignore start/end */`
2. **Extract domain** — move pure logic to `domain/<feature>.domain.ts`
3. **Slim down service** — update `<feature>.ts` to call only repository + domain functions, no direct DB imports
4. **Write tests** — co-located `domain/<feature>.domain.test.ts`
5. **Verify coverage** — `bun run test:coverage` must stay at 100%

## Test file patterns

### Factory helpers (avoids repetition, hides irrelevant fields)

```ts
const makeAssignment = (overrides: Partial<...> = {}): Assignment =>
  ({ id: 'a-1', status: 'published', dueDate: new Date('2099-01-01'), ...overrides }) as Assignment
```

Use `as Type` to cast partial objects — TypeScript structural typing means only used fields matter.

### Arrange-Act-Assert in one `it` block

```ts
it('returns 0 for empty array', () => {
  expect(calculateAverageGrade([])).toBe(0)
})
```

One assertion per test when possible. Multiple only when they form a single logical unit.

### Error assertions

```ts
expect(() => validateSubmissionWindow(assignment, now)).toThrow(
  'Assignment is not open for submissions',
)
```

## Coverage thresholds (vitest.config.ts)

```ts
coverage: {
  provider: 'v8',
  include: ['src/domain/**', 'src/utils/**/domain/**'],
  exclude: ['src/domain/index.ts'],
  thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
}
```

## Expanding scope later

When adding hooks or component tests:

1. Add `environment: 'jsdom'` or per-file `@vitest-environment jsdom` annotation
2. Add `include` patterns for the new scope
3. Write a new ADR updating scope and any new conventions
