# useDialogState Hook Design

**Date:** 2026-05-09
**Status:** Approved

## Problem

Dialog state across routes uses 3 distinct ad-hoc patterns:

1. Discriminated union `DialogState` (events.tsx, library/index.tsx) — best pattern, but reimplemented per route
2. Mode+item pair (`dialogMode` + `selectedItem`) — lessons/$lessonId, assignments/$assignmentId
3. Multiple separate booleans + data states — courses/$courseId (5 separate `useState` calls)

Extracting into a hook eliminates duplication and standardizes the pattern.

## Hook

**File:** `src/hooks/useDialogState.ts`

```ts
type DialogMode = 'create' | 'edit' | 'delete' | 'view'

interface UseDialogStateReturn<T> {
  isOpen: boolean
  dialogMode: DialogMode
  dialogItem: T | undefined
  openDialog: (mode: DialogMode, item?: T) => void
  closeDialog: () => void
}

export function useDialogState<T>(): UseDialogStateReturn<T>
```

**Internal state:** `{ mode: DialogMode; item?: T } | null` — null = closed.

`dialogMode` falls back to `'create'` when state is null (prevents flash on close animation).
`dialogItem` is `undefined` for `'create'` mode — callsites already handle this.

## Migration

| Route | Before | After |
|---|---|---|
| events.tsx | `dialogState` + 3 derived vars + local `DialogState` type | `useDialogState<CalendarEventRow>()` |
| library/index.tsx | `dialogState` + 3 derived vars + local `DialogState` type | `useDialogState<MediaLibraryRow>()` |
| lessons/$lessonId.tsx | `lessonDialogMode` + `assignmentDialogMode` + `assignmentToAct` | 2× `useDialogState` |
| assignments/$assignmentId.tsx | `dialogMode` + `selectedSubmission` | `useDialogState<SubmissionWithStudent>()` |
| courses/$courseId.tsx | 5 separate states (showEdit, editData, showDelete, lessonMode, selectedLesson) | `courseDialog` + `lessonDialog` (2× hook) |

## Decisions

- **Approach A (simple mode+item)** chosen over discriminated union — matches existing working patterns, simpler migration
- **Two hook calls per page** when page has two dialog subjects (courses/$courseId) — explicit, composable
- **No `isPending` in hook** — mutation state stays in `useEntityMutation`, separate concern
- **No custom modes** beyond the four defined — callers with `'grade'` mode (assignments/$assignmentId) use `'view'` or extend locally if needed
