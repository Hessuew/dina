---
name: db-types
scope: src/**
enforced-by: review
---

# Derive DB enum types from Drizzle schema — never re-declare

## Rule

TypeScript types for columns that correspond to a Postgres enum (or any DB column whose
values are constrained by the schema) **must** be derived from Drizzle's inferred types.
Never write a manual string-literal union that duplicates the enum values.

**Correct:**

```ts
// Single column — nullable admitted
type AdmissionCategory =
  (typeof enrollmentEvaluations.$inferSelect)['admissionCategory']

// Full row type
type EnrollmentRow = typeof enrollments.$inferSelect

// Enum values as a union (when you need the non-null variant only)
type AdmissionCategoryValue =
  (typeof enrollmentAdmissionCategoryEnum.enumValues)[number]
```

**Wrong:**

```ts
// ❌ manual re-declaration
type AdmissionCategory = 'new' | 'emerging' | 'established' | null
```

## Why

Duplicated string-literal unions drift silently when enum values are added, renamed, or
removed via a Drizzle migration. The compiler will not catch the mismatch because the
manual union stays valid TypeScript even after the DB schema changes. A single
`$inferSelect` derivation means the type is always in sync with the source of truth.

## How to comply

1. Import the table or enum from `@/db/schema`.
2. Use `(typeof table.$inferSelect)['columnName']` for individual column types.
3. Use `(typeof pgEnumInstance.enumValues)[number]` when you need the non-null union of
   allowed values (e.g. for a discriminated switch).
4. Never write the values as string literals anywhere outside the schema file itself.

## Enforcement

No automated gate today — enforced by **review**. Violations will be caught during PR
review. Candidate for an ESLint rule (`@typescript-eslint/no-restricted-syntax` matching
union literals that shadow a known enum).

## Escape hatch

The only sanctioned place to write the raw string literals is inside
`src/db/schema/enums.schema.ts` itself (the `pgEnum` call). Nowhere else.
