# useDialogState Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `useDialogState<T>` hook and migrate all routes that manage dialog open/mode/item state.

**Architecture:** Single hook wrapping `useState<{ mode: DialogMode; item?: T } | null>`, returning `isOpen`, `dialogMode`, `dialogItem`, `openDialog`, `closeDialog`. Routes call it once per dialog subject. No external dependencies.

**Tech Stack:** React `useState`, TypeScript generics. No test infrastructure in project — skip test steps.

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `src/hooks/useDialogState.ts` | The hook |
| Modify | `src/routes/_authed/events.tsx` | Replace local `DialogState` + 3 derived vars |
| Modify | `src/routes/_authed/library/index.tsx` | Replace local `DialogState` + 3 derived vars |
| Modify | `src/routes/_authed/assignments/$assignmentId.tsx` | Replace `dialogMode` + `selectedSubmission` with 2× hook |
| Modify | `src/routes/_authed/lessons/$lessonId.tsx` | Replace `lessonDialogMode` + `assignmentDialogMode` + `assignmentToAct` with 2× hook |
| Modify | `src/routes/_authed/courses/$courseId.tsx` | Replace 5 separate states with 2× hook |

---

## Task 1: Create `useDialogState` hook

**Files:**
- Create: `src/hooks/useDialogState.ts`

- [ ] **Write the hook**

```ts
import { useState } from 'react'

export type DialogMode = 'create' | 'edit' | 'delete' | 'view'

interface UseDialogStateReturn<T> {
  isOpen: boolean
  dialogMode: DialogMode
  dialogItem: T | undefined
  openDialog: (mode: DialogMode, item?: T) => void
  closeDialog: () => void
}

export function useDialogState<T = unknown>(): UseDialogStateReturn<T> {
  const [state, setState] = useState<{ mode: DialogMode; item?: T } | null>(
    null,
  )

  return {
    isOpen: state !== null,
    dialogMode: state?.mode ?? 'create',
    dialogItem: state?.item,
    openDialog: (mode, item) => setState({ mode, item }),
    closeDialog: () => setState(null),
  }
}
```

- [ ] **Commit**

```bash
git add src/hooks/useDialogState.ts
gt c -m "feat: add useDialogState hook"
```

---

## Task 2: Migrate `events.tsx`

**Files:**
- Modify: `src/routes/_authed/events.tsx`

**Before** (lines 65–81):
```ts
type DialogState =
  | { mode: 'create' }
  | { mode: 'view'; event: CalendarEventRow }
  | { mode: 'edit'; event: CalendarEventRow }
  | { mode: 'delete'; event: CalendarEventRow }
  | null

// inside component:
const [dialogState, setDialogState] = useState<DialogState>(null)
const isOpen = dialogState !== null
const dialogMode = dialogState?.mode ?? 'create'
const dialogEvent =
  dialogState && dialogState.mode !== 'create' ? dialogState.event : undefined
```

- [ ] **Add import, remove local type and 4 lines of state, add hook call**

Add to imports:
```ts
import { useDialogState } from '@/hooks/useDialogState'
```

Delete the `type DialogState = ...` block and the four `const` lines (`dialogState`, `isOpen`, `dialogMode`, `dialogEvent`). Replace with:
```ts
const { isOpen, dialogMode, dialogItem: dialogEvent, openDialog, closeDialog } =
  useDialogState<CalendarEventRow>()
```

- [ ] **Replace all `setDialogState` calls**

Find and replace:
| Old | New |
|---|---|
| `setDialogState({ mode: 'view', event })` | `openDialog('view', event)` |
| `setDialogState({ mode: 'edit', event })` | `openDialog('edit', event)` |
| `setDialogState({ mode: 'delete', event })` | `openDialog('delete', event)` |
| `setDialogState({ mode: 'create' })` | `openDialog('create')` |
| `!open && setDialogState(null)` | `!open && closeDialog()` |

- [ ] **Remove unused `useState` import if no other useState calls remain**

Check: `grep -n "useState" src/routes/_authed/events.tsx` — remove import if count is 0.

- [ ] **Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to events.tsx.

- [ ] **Commit**

```bash
git add src/routes/_authed/events.tsx
gt c -m "refactor: migrate events.tsx to useDialogState"
```

---

## Task 3: Migrate `library/index.tsx`

**Files:**
- Modify: `src/routes/_authed/library/index.tsx`

**Before** (lines 28–32, 83–88):
```ts
type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; media: MediaLibraryRow }
  | { mode: 'delete'; media: MediaLibraryRow }
  | null

// inside component:
const [dialogState, setDialogState] = useState<DialogState>(null)
const isOpen = dialogState !== null
const dialogMode = dialogState?.mode ?? 'create'
const dialogMedia =
  dialogState && dialogState.mode !== 'create' ? dialogState.media : undefined
```

- [ ] **Add import, remove local type and state lines, add hook call**

Add to imports:
```ts
import { useDialogState } from '@/hooks/useDialogState'
```

Delete the `type DialogState = ...` block and the four `const` lines. Replace with:
```ts
const { isOpen, dialogMode, dialogItem: dialogMedia, openDialog, closeDialog } =
  useDialogState<MediaLibraryRow>()
```

- [ ] **Replace all `setDialogState` calls**

| Old | New |
|---|---|
| `setDialogState({ mode: 'edit', media: row })` | `openDialog('edit', row)` |
| `setDialogState({ mode: 'delete', media: row })` | `openDialog('delete', row)` |
| `setDialogState({ mode: 'create' })` | `openDialog('create')` |
| `!open && setDialogState(null)` | `!open && closeDialog()` |

- [ ] **Remove unused `useState` import if no other useState calls remain**

```bash
grep -n "useState" src/routes/_authed/library/index.tsx
```

- [ ] **Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/routes/_authed/library/index.tsx
gt c -m "refactor: migrate library/index.tsx to useDialogState"
```

---

## Task 4: Migrate `assignments/$assignmentId.tsx`

**Files:**
- Modify: `src/routes/_authed/assignments/$assignmentId.tsx`

This route has two dialog subjects sharing one state (`dialogMode` + `selectedSubmission`). Split into two hook calls.

**Before** (lines 101–105):
```ts
const [dialogMode, setDialogMode] = useState<
  'edit' | 'delete' | 'grade' | null
>(null)
const [selectedSubmission, setSelectedSubmission] =
  useState<SubmissionWithStudent | null>(null)
```

**After:** Two hook calls — one for the assignment (edit/delete), one for grading:
```ts
const assignmentDialog = useDialogState()
const gradeDialog = useDialogState<SubmissionWithStudent>()
```

- [ ] **Add import, replace state declarations**

Add to imports:
```ts
import { useDialogState } from '@/hooks/useDialogState'
```

Replace the two `useState` lines with:
```ts
const assignmentDialog = useDialogState()
const gradeDialog = useDialogState<SubmissionWithStudent>()
```

- [ ] **Update assignment dialog render (line 521)**

Before:
```tsx
{(dialogMode === 'edit' || dialogMode === 'delete') && (
  <AssignmentDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) setDialogMode(null)
    }}
    mode={dialogMode}
    assignment={assignment}
    onDeleteSuccess={() => {
```

After:
```tsx
{(assignmentDialog.dialogMode === 'edit' || assignmentDialog.dialogMode === 'delete') &&
  assignmentDialog.isOpen && (
  <AssignmentDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) assignmentDialog.closeDialog()
    }}
    mode={assignmentDialog.dialogMode as 'edit' | 'delete'}
    assignment={assignment}
    onDeleteSuccess={() => {
```

- [ ] **Update grade dialog render (line 543)**

Before:
```tsx
{dialogMode === 'grade' && selectedSubmission && (
  <AssignmentDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) {
        setDialogMode(null)
        setSelectedSubmission(null)
      }
    }}
    mode="grade"
    assignment={assignment}
    submission={selectedSubmission}
  />
)}
```

After:
```tsx
{gradeDialog.isOpen && gradeDialog.dialogItem && (
  <AssignmentDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) gradeDialog.closeDialog()
    }}
    mode="grade"
    assignment={assignment}
    submission={gradeDialog.dialogItem}
  />
)}
```

- [ ] **Find and replace all remaining `setDialogMode` / `setSelectedSubmission` callsites**

Search: `grep -n "setDialogMode\|setSelectedSubmission" src/routes/_authed/assignments/\$assignmentId.tsx`

For each `setDialogMode('edit')` or `setDialogMode('delete')`:
→ `assignmentDialog.openDialog('edit')` or `assignmentDialog.openDialog('delete')`

For each callsite that sets both `setSelectedSubmission(sub)` + `setDialogMode('grade')`:
→ `gradeDialog.openDialog('edit', sub)` (use 'edit' as the mode since 'grade' isn't a standard DialogMode)

- [ ] **Remove unused `useState` import if applicable**

```bash
grep -n "useState" src/routes/_authed/assignments/\$assignmentId.tsx
```

- [ ] **Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/routes/_authed/assignments/\$assignmentId.tsx
gt c -m "refactor: migrate assignments/\$assignmentId.tsx to useDialogState"
```

---

## Task 5: Migrate `lessons/$lessonId.tsx`

**Files:**
- Modify: `src/routes/_authed/lessons/$lessonId.tsx`

Two dialog subjects: lesson (edit/delete, item from loaderData) + assignment (create/edit/delete, item tracked).

**Before** (lines 63–71):
```ts
const [lessonDialogMode, setLessonDialogMode] = useState<
  'edit' | 'delete' | null
>(null)
const [assignmentDialogMode, setAssignmentDialogMode] = useState<
  'create' | 'edit' | 'delete' | null
>(null)
const [assignmentToAct, setAssignmentToAct] = useState<Assignment | null>(null)
```

**After:**
```ts
const lessonDialog = useDialogState()
const assignmentDialog = useDialogState<Assignment>()
```

- [ ] **Add import, replace three state declarations**

Add to imports:
```ts
import { useDialogState } from '@/hooks/useDialogState'
```

Replace the three `useState` lines with:
```ts
const lessonDialog = useDialogState()
const assignmentDialog = useDialogState<Assignment>()
```

- [ ] **Update `handleDeleteAssignmentClick`**

Before:
```ts
const handleDeleteAssignmentClick = async (assignment: Assignment) => {
  setAssignmentToAct(assignment)
  try {
    const result = await getAssignmentSubmissionCount({
      data: { assignmentId: assignment.id },
    })
    setSubmissionCount(result.count)
    setAssignmentDialogMode('delete')
  } catch (error: any) {
    toast.error(error.message || 'Failed to check submissions')
  }
}
```

After:
```ts
const handleDeleteAssignmentClick = async (assignment: Assignment) => {
  try {
    const result = await getAssignmentSubmissionCount({
      data: { assignmentId: assignment.id },
    })
    setSubmissionCount(result.count)
    assignmentDialog.openDialog('delete', assignment)
  } catch (error: any) {
    toast.error(error.message || 'Failed to check submissions')
  }
}
```

- [ ] **Replace lesson dialog open/close calls**

| Old | New |
|---|---|
| `setLessonDialogMode('edit')` | `lessonDialog.openDialog('edit')` |
| `setLessonDialogMode('delete')` | `lessonDialog.openDialog('delete')` |
| `setLessonDialogMode(null)` | `lessonDialog.closeDialog()` |

- [ ] **Replace assignment dialog open/close calls**

| Old | New |
|---|---|
| `setAssignmentDialogMode('create')` | `assignmentDialog.openDialog('create')` |
| `setAssignmentToAct(assignment); setAssignmentDialogMode('edit')` | `assignmentDialog.openDialog('edit', assignment)` |
| `setAssignmentDialogMode(null); setAssignmentToAct(null)` | `assignmentDialog.closeDialog()` |

- [ ] **Update assignment dialog render (line 371)**

Before:
```tsx
{assignmentDialogMode !== null && (
  <AssignmentDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) {
        setAssignmentDialogMode(null)
        setAssignmentToAct(null)
        setSubmissionCount(0)
      }
    }}
    mode={assignmentDialogMode}
    lessonId={lesson.id}
    assignment={assignmentToAct ?? undefined}
    submissionCount={submissionCount}
  />
)}
```

After:
```tsx
{assignmentDialog.isOpen && (
  <AssignmentDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) {
        assignmentDialog.closeDialog()
        setSubmissionCount(0)
      }
    }}
    mode={assignmentDialog.dialogMode as 'create' | 'edit' | 'delete'}
    lessonId={lesson.id}
    assignment={assignmentDialog.dialogItem}
    submissionCount={submissionCount}
  />
)}
```

- [ ] **Update lesson dialog render (line 389)**

Before:
```tsx
{lessonDialogMode !== null && (
  <LessonDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) setLessonDialogMode(null)
    }}
    mode={lessonDialogMode}
    ...
  />
)}
```

After:
```tsx
{lessonDialog.isOpen && (
  <LessonDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) lessonDialog.closeDialog()
    }}
    mode={lessonDialog.dialogMode as 'edit' | 'delete'}
    ...
  />
)}
```

- [ ] **Remove unused `useState` import if applicable**

```bash
grep -n "useState" src/routes/_authed/lessons/\$lessonId.tsx
```

- [ ] **Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/routes/_authed/lessons/\$lessonId.tsx
gt c -m "refactor: migrate lessons/\$lessonId.tsx to useDialogState"
```

---

## Task 6: Migrate `courses/$courseId.tsx`

**Files:**
- Modify: `src/routes/_authed/courses/$courseId.tsx`

Five separate states → two hook calls: one for course (edit/delete with `CourseEditData`), one for lesson.

**Before** (lines 48–66):
```ts
const [showEditCourseDialog, setShowEditCourseDialog] = useState(false)
const [editCourseInitialData, setEditCourseInitialData] = useState<
  | { courseId: string; title: string; description: string; thumbnailUrl: string | null;
      isPublished: boolean; teacher1Id: string | null; teacher2Id: string | null; orderIndex: number }
  | undefined
>(undefined)
const [showDeleteCourseDialog, setShowDeleteCourseDialog] = useState(false)
const [lessonDialogMode, setLessonDialogMode] = useState<
  'create' | 'edit' | 'delete' | null
>(null)
const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
```

- [ ] **Add import and local type, replace five state declarations**

Add to imports:
```ts
import { useDialogState } from '@/hooks/useDialogState'
```

Add local type above the component function (after existing imports):
```ts
type CourseEditData = {
  courseId: string
  title: string
  description: string
  thumbnailUrl: string | null
  isPublished: boolean
  teacher1Id: string | null
  teacher2Id: string | null
  orderIndex: number
}
```

Replace the five `useState` lines with:
```ts
const courseDialog = useDialogState<CourseEditData>()
const lessonDialog = useDialogState<Lesson>()
```

- [ ] **Remove the `openLessonDialog` / `closeLessonDialog` helper functions (lines 82–90)**

These are replaced by `lessonDialog.openDialog` / `lessonDialog.closeDialog` directly.

- [ ] **Update edit course button onClick (line 146)**

Before:
```ts
onClick={() => {
  setEditCourseInitialData({
    courseId: course.id,
    title: course.title,
    description: course.description || '',
    thumbnailUrl: course.thumbnailUrl,
    isPublished: course.isPublished ?? false,
    teacher1Id: courseTeachersData[0]?.teacher?.id || null,
    teacher2Id: courseTeachersData[1]?.teacher?.id || null,
    orderIndex: course.orderIndex ?? 0,
  })
  setShowEditCourseDialog(true)
}}
```

After:
```ts
onClick={() => {
  courseDialog.openDialog('edit', {
    courseId: course.id,
    title: course.title,
    description: course.description || '',
    thumbnailUrl: course.thumbnailUrl,
    isPublished: course.isPublished ?? false,
    teacher1Id: courseTeachersData[0]?.teacher?.id || null,
    teacher2Id: courseTeachersData[1]?.teacher?.id || null,
    orderIndex: course.orderIndex ?? 0,
  })
}}
```

- [ ] **Update delete course button onClick (line 166)**

Before: `onClick={() => setShowDeleteCourseDialog(true)}`
After: `onClick={() => courseDialog.openDialog('delete')}`

- [ ] **Replace all `openLessonDialog` / `closeLessonDialog` callsites**

| Old | New |
|---|---|
| `openLessonDialog('create')` | `lessonDialog.openDialog('create')` |
| `openLessonDialog('edit', lesson)` | `lessonDialog.openDialog('edit', lesson)` |
| `openLessonDialog('delete', lesson)` | `lessonDialog.openDialog('delete', lesson)` |
| `closeLessonDialog()` | `lessonDialog.closeDialog()` |

- [ ] **Update CourseDialog render (line 434)**

Before:
```tsx
<CourseDialog
  open={showEditCourseDialog}
  onOpenChange={setShowEditCourseDialog}
  mode="edit"
  isAdmin={isAdmin}
  initialData={editCourseInitialData}
/>
```

After:
```tsx
<CourseDialog
  open={courseDialog.isOpen && courseDialog.dialogMode === 'edit'}
  onOpenChange={(open) => !open && courseDialog.closeDialog()}
  mode="edit"
  isAdmin={isAdmin}
  initialData={courseDialog.dialogItem}
/>
```

- [ ] **Update DeleteConfirmDialog render (line 443)**

Before:
```tsx
<DeleteConfirmDialog
  open={showDeleteCourseDialog}
  onOpenChange={setShowDeleteCourseDialog}
  ...
/>
```

After:
```tsx
<DeleteConfirmDialog
  open={courseDialog.isOpen && courseDialog.dialogMode === 'delete'}
  onOpenChange={(open) => !open && courseDialog.closeDialog()}
  ...
/>
```

- [ ] **Update LessonDialog render (line 457)**

Before:
```tsx
{lessonDialogMode !== null && (
  <LessonDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) closeLessonDialog()
    }}
    mode={lessonDialogMode}
    courseId={course.id}
    lessonCount={course.lessons.length}
    initialData={
      selectedLesson
        ? { ...selectedLesson, lessonId: selectedLesson.id }
        : undefined
    }
  />
)}
```

After:
```tsx
{lessonDialog.isOpen && (
  <LessonDialog
    open={true}
    onOpenChange={(open) => {
      if (!open) lessonDialog.closeDialog()
    }}
    mode={lessonDialog.dialogMode as 'create' | 'edit' | 'delete'}
    courseId={course.id}
    lessonCount={course.lessons.length}
    initialData={
      lessonDialog.dialogItem
        ? { ...lessonDialog.dialogItem, lessonId: lessonDialog.dialogItem.id }
        : undefined
    }
  />
)}
```

- [ ] **Remove unused `useState` import if applicable**

```bash
grep -n "useState" src/routes/_authed/courses/\$courseId.tsx
```

- [ ] **Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add src/routes/_authed/courses/\$courseId.tsx
gt c -m "refactor: migrate courses/\$courseId.tsx to useDialogState"
```

---

## Task 7: Update hooks README

**Files:**
- Modify: `src/hooks/README.md`

- [ ] **Add `useDialogState` entry to README**

Open `src/hooks/README.md` and add a section for the new hook describing its signature and usage pattern. Follow the existing style in the file.

- [ ] **Commit**

```bash
git add src/hooks/README.md
gt c -m "docs: document useDialogState in hooks README"
```
