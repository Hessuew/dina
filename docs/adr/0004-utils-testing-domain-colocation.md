# ADR 0004 — Three-Layer Architecture and Testing for src/utils/

**Status:** Planned  
**Date:** 2026-05-18

## Context

ADR 0003 established 100% unit test coverage on `src/domain/`. The next layer to test is `src/utils/`, which holds all backend server functions. Currently, each feature file mixes three concerns: DB queries (Drizzle), pure business logic, and TanStack Start server function orchestration. This makes the code hard to test and hard to reason about.

## Decision

### Three-layer structure per feature

Each feature subfolder in `src/utils/` is split into three layers:

```
src/utils/student/
  students.ts                      ← service: thin orchestrator, no direct DB calls
  repository/
    student.repository.ts          ← all Drizzle/DB calls — /* v8 ignore start/end */
  domain/
    student.domain.ts              ← pure business logic, no IO
    student.domain.test.ts         ← 100% coverage enforced
```

**Service (`students.ts`):** calls repository functions and domain functions only. Contains `createServerFn` wrappers. No direct Drizzle imports. Marked `/* v8 ignore */` where needed.

**Repository (`repository/<feature>.repository.ts`):** all DB queries and mutations. All functions are async and DB-touching. Wrapped with `/* v8 ignore start/end */`. No business logic.

**Domain (`domain/<feature>.domain.ts`):** pure functions — synchronous, no IO, deterministic. Receives data already fetched by the repository. Fully tested at 100% coverage.

### No new files in root src/domain/

The existing `src/domain/` at root (grade, assignment, post, student services) stays as-is. New per-feature logic belongs inside the feature's own `domain/` subfolder.

### Coverage expansion

`vitest.config.ts` coverage include expands to:

```ts
include: ['src/domain/**', 'src/utils/**/domain/**'],
exclude: ['src/domain/index.ts'],
```

100% thresholds apply to all files in `src/utils/**/domain/`.

## Example: getStudents after refactor

```ts
// students.ts — service layer
import {
  findAllStudents,
  findAllCourses,
  findAllAssignments,
  findStudentSubmissions,
} from './repository/student.repository'
import { buildStudentWithStats } from './domain/student.domain'

export const getStudents = createServerFn({ method: 'POST' }).handler(
  async () => {
    const [students, courses, assignments] = await Promise.all([
      findAllStudents(),
      findAllCourses(),
      findAllAssignments(),
    ])

    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const submissions = await findStudentSubmissions(student.id)
        return buildStudentWithStats(student, submissions, courses, assignments)
      }),
    )

    return { students: studentsWithStats }
  },
)
```

The service reads like a spec. The DB details live in the repository. The business rules live in the domain.

## Implementation order

### Phase 1: Student domain (start here)

Refactor `src/utils/student/students.ts` into the three-layer structure.

**Repository functions to extract:**

- `findAllStudents()` — profiles where role = 'student'
- `findAllCourses()` — all courses
- `findAllAssignments()` — assignments joined with lessons and courses
- `findStudentSubmissions(studentId)` — submissions for one student with nested assignment
- `findStudentById(studentId)` — single student profile
- `findStudentAssignmentsWithSubmissions(studentId, assignmentIds)` — for detail view

**Domain functions to extract:**

- `buildStudentWithStats(student, submissions, courses, assignments)` — builds `StudentWithStats` shape
- `buildAssignmentsWithSubmissions(assignments, submissions)` — Map-join for student detail view

**Test cases for domain functions:**

`buildAssignmentsWithSubmissions`:

- Empty assignments → `[]`
- Assignment with no matching submission → excluded
- Matched assignment → all fields map correctly, submission nested
- Multiple assignments, partial match → only matched returned

`buildStudentWithStats`:

- Student with no submissions → zero counts, empty grade breakdown
- Student with graded submission → correct averageGrade per course
- Student with draft submission → not counted as submitted

### Phase 2: Standalone pure utils (no structural change needed)

These files are already pure — add co-located `.test.ts` only.

| File                             | Function(s)                                | Key test cases                                                                                                                   |
| -------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/authz/permissions.ts` | `calculateEntityPermissions`               | admin always isCourseTeacher; teacher matching teacher1Id or teacher2Id; non-matching teacher canManage=false; student all false |
| `src/utils/password.ts`          | `calculatePasswordStrength`                | score boundaries 0–5; label names; max 2 suggestions                                                                             |
| `src/utils/errors.ts`            | Error classes, `isAppError`, `toUserError` | status codes per class; isAppError true for subclasses; toUserError all paths                                                    |

These do not live in a `domain/` subfolder so they are NOT under the coverage gate. Tests run via `bun run test` and fail if broken.

### Phase 3+: Remaining feature domains

Apply the same three-layer pattern to each remaining feature in `src/utils/`:
courses, assignments, posts, enrolment, invitation, teachers, library, notifications, etc.

Each follows: extract repository → extract domain → write domain tests → verify coverage.

## Files to Create / Modify (Phase 1)

| Action | File                                                                                      |
| ------ | ----------------------------------------------------------------------------------------- |
| CREATE | `src/utils/student/repository/student.repository.ts`                                      |
| CREATE | `src/utils/student/domain/student.domain.ts`                                              |
| CREATE | `src/utils/student/domain/student.domain.test.ts`                                         |
| MODIFY | `src/utils/student/students.ts` — import from repository + domain, remove direct DB calls |
| MODIFY | `vitest.config.ts` — expand coverage include                                              |
| CREATE | `src/utils/authz/permissions.test.ts`                                                     |
| CREATE | `src/utils/password.test.ts`                                                              |
| CREATE | `src/utils/errors.test.ts`                                                                |

## Consequences

- Every utils feature domain gets a clear home for each concern: no more mixed-responsibility files
- `domain/` functions are 100% tested and act as the source of truth for business rules
- `repository/` functions are isolated and swappable (e.g. for integration tests later)
- Service files stay readable — they describe WHAT happens, not HOW the DB is queried
- The three-layer pattern must be applied consistently; partial refactors leave the folder misleading
