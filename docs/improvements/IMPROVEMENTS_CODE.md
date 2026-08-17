# Code Improvement Queue

Append-only proposals for unrelated production and test code improvements. Follow the
[improvement proposal protocol](./IMPROVEMENTS_PROTOCOL.md).

**Entry format:**

```
- [YYYY-MM-DD] target: src/path/file.ts[:symbol] · effort: <0-100>/100 · type: fix|better|refactor · observation: … · suggestion: … · source-rule: docs/rules/<name>.md (optional) · [model]
```

## Entries

<!-- newest first; remove a line only when a focused improvement task handles it -->

- [2026-08-17] target: src/utils/assignments/service/assignments.service.ts · effort: 20/100 · type: refactor · observation: Fallow flags a 12-line duplicated block at lines 225, 495, and 517. Unrelated to Staff Privileges. · suggestion: extract the shared block once in a later assignments-only change. · source-rule: docs/rules/complexity.md · [model]
- [2026-08-17] target: src/utils/enrolment/service/enrolment.service.ts:getEnrollmentsService · effort: 25/100 · type: refactor · observation: ESLint `max-lines-per-function` warns at 95 lines (cap 60). New `canExportContacts` flag made the already-oversized list service worse. · suggestion: extract page-assembly (assignment enrichment + peer map + row projection) into domain/helpers without changing list behaviour. · source-rule: docs/rules/complexity.md · [model]
- [2026-08-17] target: src/routes/_authed/enrollments/index.tsx:EnrollmentsPage · effort: 20/100 · type: refactor · observation: Fallow CRAP finding persists on the page body (pre-existing). Extracting dialogs into a new function introduced a blocking CRAP finding because the extract had no coverage. · suggestion: add a page-level render test or finish decomposition under tests so future header/dialog work does not trip introduced-complexity. · source-rule: docs/rules/complexity.md · [model]
- [2026-07-25] target: scripts/seed-development.ts:findUserByEmail · effort: 15/100 · type: fix · observation: `bun run db:seed:development` missed an existing auth user, attempted `createUser`, and failed with Supabase `email_exists`, leaving canonical development credentials stale. · suggestion: make user pagination/lookup reliably find existing emails and cover the duplicate-user reconciliation path with a focused test. · [model]
- [2026-07-20] target: src/components/course/CourseDetailSections.tsx · effort: 5/100 · type: fix · observation: `tsc` reports unused `role` param (TS6133). · suggestion: remove unused binding or prefix `_role`. · [model]
- [2026-07-20] target: src/components/ui/pagination.tsx · effort: 5/100 · type: fix · observation: `tsc` reports unused `PaginationLink` (TS6133). · suggestion: export/use or remove dead import/local. · [model]
- [2026-07-20] target: src/utils/student/service/student.service.ts:getStudentDetailService · effort: 25/100 · type: better · observation: detail "enrollments" still mirrors all courses with hardcoded `active` status (called out in integration test). · suggestion: wire real course enrollments when product needs it. · [model]
