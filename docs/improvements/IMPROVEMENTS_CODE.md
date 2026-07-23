# Code Improvement Queue

Append-only proposals for unrelated production and test code improvements. Follow the
[improvement proposal protocol](./IMPROVEMENTS_PROTOCOL.md).

**Entry format:**

```
- [YYYY-MM-DD] target: src/path/file.ts[:symbol] · effort: <0-100>/100 · type: fix|better|refactor · observation: … · suggestion: … · source-rule: docs/rules/<name>.md (optional) · [model]
```

## Entries

<!-- newest first; remove a line only when a focused improvement task handles it -->

- [2026-07-20] target: src/components/course/CourseDetailSections.tsx · effort: 5/100 · type: fix · observation: `tsc` reports unused `role` param (TS6133). · suggestion: remove unused binding or prefix `_role`. · [model]
- [2026-07-20] target: src/components/ui/pagination.tsx · effort: 5/100 · type: fix · observation: `tsc` reports unused `PaginationLink` (TS6133). · suggestion: export/use or remove dead import/local. · [model]
- [2026-07-20] target: src/utils/student/service/student.service.ts:getStudentDetailService · effort: 25/100 · type: better · observation: detail "enrollments" still mirrors all courses with hardcoded `active` status (called out in integration test). · suggestion: wire real course enrollments when product needs it. · [model]
