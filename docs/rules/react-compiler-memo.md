---
name: react-compiler-memo
scope: src/components/**, src/routes/**
enforced-by: review
---

# Stable-ref consumers must opt out of React Compiler memoization

## Rule

A **stable-ref consumer** — any extracted sub-component that receives a prop whose
*identity* is stable but whose *internal state* changes — must add `'use no memo'` as its
first statement, with an inline comment naming which prop is the stable ref and why.

```tsx
function DataTableRows<TData>({ table, ... }: { table: TanstackTable<TData>; ... }) {
  // React Compiler must not memoize this: it reads live `table` state
  // (getRowModel) off a stable `table` ref that never changes identity.
  'use no memo'
  // ...
}
```

The `'use no memo'` directive must sit at the very top of the function body, before any
other statements, so it is immediately visible in code review.

## Why

The React Compiler (`babel-plugin-react-compiler`) memoizes components automatically by
tracking prop identity. When a prop's reference is stable — such as a TanStack
`useReactTable` instance, a Zustand store slice, or a class instance with mutable fields —
the compiler sees no change and skips the re-render. The component goes stale silently: no
TypeScript error, no test failure, wrong output.

The DataTable modularization surfaced this: extracting `DataTableRows`, `DataTableHead`,
`DataTableContent`, and `PaginationFooter` as named sub-components worked correctly while
they lived inline (compiler sees the full expression), but the moment they became separate
components the compiler memoized them on the stable `table` ref and pagination changes
stopped rendering.

## How to comply

1. **Identify** whether any prop is a stable-ref: an object whose reference never changes
   but whose observable output (methods like `getRowModel()`, `getCanNextPage()`, etc.) does
   change over the component's lifetime.
2. **Add** `'use no memo'` as the first line of the function body.
3. **Comment** which prop is the stable ref and what live state it reads, e.g.:
   ```tsx
   // React Compiler must not memoize this: it reads live `table` state
   // (getRowModel/getCanNextPage) off a stable `table` ref that never changes identity.
   'use no memo'
   ```

Known stable-ref types in this codebase:
- `TanstackTable<TData>` (from `useReactTable`) — all sub-components receiving this prop.

## Enforcement

Code review. There is no automated gate for this pattern. When reviewing a component
extraction (Phase B in ADR 0010), explicitly check whether any prop is a stable ref.

## Escape hatch

None. The rule applies only to stable-ref consumers — sub-components where at least one
prop is a stable identity wrapping mutable state. If all props are plain values (strings,
numbers, booleans, objects derived from React state) that the compiler can track normally,
simply omit `'use no memo'`. Do not add it as a blanket safety net.
