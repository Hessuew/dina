# Implement Top 5 Reusable Patterns

Extract and implement the highest-priority reusable component and function patterns identified in the analysis to reduce code duplication and improve maintainability.

## Approach Assumptions

- **Migration strategy:** Create new components/hooks first, migrate existing code incrementally in follow-up work
- **Dialog Structure:** Render-prop based component for flexibility
- **Mutation Pattern:** Single generic hook handling create/update/delete operations
- **PR strategy:** Single PR implementing all 5 patterns
- **Naming:** Use names from analysis (PageLayout, useDialogState, useEntityMutation, etc.)

## Implementation Plan

### 1. Dialog Structure Pattern (95/100)

**File:** `src/components/ui/form-dialog.tsx` (new)

Create a reusable `<FormDialog>` component that encapsulates the common dialog structure:

```tsx
interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  modeLabel?: string
  children: React.ReactNode
  footer?: React.ReactNode
  onSubmit?: () => void
  submitLabel?: string
  isSubmitting?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}
```

**Features:**

- Standard dialog styling (background image, gradient overlay)
- Dialog header with gold line, mode label, title, description
- DialogBody with scroll support
- DialogFooter with Cancel and Submit buttons
- Render-prop pattern for flexible form content

**Migration path:** Update existing dialogs (CourseDialog, LessonDialog, AssignmentDialog, EventDialog, MediaDialog) to use FormDialog in follow-up work.

---

### 2. Delete Confirmation Pattern (92/100)

**File:** `src/components/ui/delete-confirm-dialog.tsx` (new)

Create a dedicated `<DeleteConfirmDialog>` component:

```tsx
interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityName: string
  itemName: string
  onConfirm: () => void
  isDeleting?: boolean
}
```

**Features:**

- Standard delete confirmation UI
- Entity type and item name display
- "This action cannot be undone" warning
- Cancel and Delete buttons with loading state

**Migration path:** Replace inline delete dialogs in CourseDialog, LessonDialog, AssignmentDialog, EventDialog, and enrollments/$enrollmentId.

---

### 3. Page Layout Wrapper (90/100)

**File:** `src/components/layout/page-layout.tsx` (new)

Create a `<PageLayout>` component for consistent page structure:

```tsx
interface PageLayoutProps {
  children: React.ReactNode
  className?: string
}
```

**Features:**

- Faculty background image with gradient overlay
- Radial gradient effects
- Max-width container with responsive padding
- Consistent spacing

**Migration path:** Update all route pages (courses/$courseId, lessons/$lessonId, assignments/$assignmentId, enrollments/$enrollmentId, library/index, students/index, students/$studentId, events.tsx) to use PageLayout.

---

### 4. Mutation Pattern (85/100)

**File:** `src/hooks/useEntityMutation.ts` (new)

Create a generic `useEntityMutation` hook:

```tsx
interface UseEntityMutationOptions<TData, TVariables> {
  createFn?: (data: TVariables) => Promise<TData>
  updateFn?: (data: TVariables) => Promise<TData>
  deleteFn?: (data: TVariables) => Promise<TData>
  onSuccessMessage?: (mode: 'create' | 'update' | 'delete') => string
  onSuccess?: () => void | Promise<void>
}

interface UseEntityMutationReturn<TVariables> {
  createMutation: { mutate: (data: TVariables) => void; isPending: boolean }
  updateMutation: { mutate: (data: TVariables) => void; isPending: boolean }
  deleteMutation: { mutate: (data: TVariables) => void; isPending: boolean }
  isPending: boolean
}
```

**Features:**

- Single hook providing create/update/delete mutations
- Automatic toast notifications with customizable messages
- Router invalidation on success
- Consolidated pending state

**Migration path:** Update all dialog components and route handlers to use useEntityMutation.

---

### 5. Dialog State Management (82/100)

**File:** `src/hooks/useDialogState.ts` (new)

Create a `useDialogState` hook for consistent dialog state:

```tsx
interface UseDialogStateOptions<T> {
  initialMode?: 'create' | 'edit' | 'delete' | 'view'
}

interface UseDialogStateReturn<T> {
  dialogState: { mode: DialogMode | null; item?: T }
  isOpen: boolean
  dialogMode: DialogMode
  dialogItem: T | undefined
  openDialog: (mode: DialogMode, item?: T) => void
  closeDialog: () => void
}

type DialogMode = 'create' | 'edit' | 'delete' | 'view'
```

**Features:**

- Standardized dialog state management
- Type-safe item handling
- Helper methods for opening/closing dialogs
- Automatic null handling

**Migration path:** Update all routes with dialog state (courses/$courseId, lessons/$lessonId, assignments/$assignmentId, library/index, events.tsx) to use useDialogState.

---

## Implementation Order

1. **PageLayout** - Simplest, foundational component
2. **useDialogState** - Hook, no dependencies
3. **DeleteConfirmDialog** - Simple dialog, uses PageLayout pattern
4. **FormDialog** - More complex, builds on dialog patterns
5. **useEntityMutation** - Hook, integrates with dialogs

## Files to Create

- `src/components/layout/page-layout.tsx`
- `src/components/ui/form-dialog.tsx`
- `src/components/ui/delete-confirm-dialog.tsx`
- `src/hooks/useDialogState.ts`
- `src/hooks/useEntityMutation.ts`

## Documentation Updates

- Update `src/components/README.md` with new components
- Update `src/hooks/README.md` with new hooks
- Update `documentation/DESIGN_SYSTEM.md` if needed for PageLayout

## Testing Considerations

- PageLayout: Verify background rendering and responsive padding
- FormDialog: Test with different maxWidth values and form content
- DeleteConfirmDialog: Test delete confirmation flow
- useDialogState: Test mode transitions and item handling
- useEntityMutation: Test mutation flows and error handling
