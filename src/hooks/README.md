# Hooks

React hooks for data fetching and UI state.

## useServerCountdown

Server-anchored 1s countdown for any deadline (`deadlineAt` + `serverNow` skew).
Used by exam take and live attendance timers. Re-anchors when either sample
changes (poll / re-open). Alias: `useExamCountdown`.

## Structure

Simple hooks live as flat files (`useMutation.ts`, `useDialogState.ts`, etc.).
A hook that has extracted domain logic (for CRAP reduction / testability) becomes a folder:

```
src/hooks/
  useMutation.ts                    ← flat: no private domain
  useEntityMutation/
    index.ts                        ← hook implementation (exported as useEntityMutation)
    domain/
      entity-mutation.domain.ts     ← pure domain logic, 100% coverage enforced
      entity-mutation.domain.test.ts
  useEnrollmentReview/
    index.ts
    domain/
      enrollment-review.domain.ts
      enrollment-review.domain.test.ts
  index.ts                          ← barrel: re-exports all public hooks
```

**Rule:** Hook-private domain logic lives in `src/hooks/<hookName>/domain/`, NOT in
`src/utils/`. `src/utils/` is server-function territory. See ADR 0010 for the full placement
rule.

Both `src/hooks/**/domain/**` and `src/utils/**/domain/**` are under the 100% coverage gate in
`vitest.config.ts`.

## useCachedData

Generic data fetching hook with time-based caching.

**Interface:**

```typescript
useCachedData<TResponse, TData>(
  shouldFetch: boolean,
  fetchFn: () => Promise<TResponse>,
  extractFn: (response: TResponse) => Array<TData>,
  cacheDuration?: number // defaults to 5 minutes
): { data, isLoading, error, refetch }
```

**Usage pattern:** Create domain-specific hooks as thin adapters:

```typescript
export function useTeachers(shouldFetch: boolean) {
  const {
    data: teachers,
    isLoading,
    error,
    refetch,
  } = useCachedData(shouldFetch, getTeachers, (result) => result.teachers)
  return { teachers, isLoading, error, refetch }
}
```

**Invariants:**

- Cache duration: 5 minutes default, configurable per hook
- Stale data refetched on mount if cache expired
- Refetch bypasses cache and updates timestamp

## Domain Hooks

- `useTeachers` — Fetches teachers with course assignments (cached 5min)
- `useStudents` — Fetches students with enrollment/assignment stats (cached 5min)
- `useAllTeachers` — Fetches all teachers (simplified type, cached 5min)

## UI Hooks

- `useMutation` — Generic mutation hook with configurable error handling and `isPending` convenience property
- `useEntityMutation` — High-level CRUD mutation hook with toast notifications, router invalidation, and `isAnyPending` convenience property
- `useIsMobile` — Mobile viewport detection (768px breakpoint)

## Error Handling

- `toastErrorHandler` — Default error handler that displays user-friendly toast messages via sonner

**useMutation error handling:**

```typescript
useMutation({
  fn: myMutation,
  onError?: (ctx: { error: TError }) => void // Full control
  errorHandler?: (error: TError) => void // Custom handler
  // If neither provided, defaults to toastErrorHandler
})
```

**Returns:**

```typescript
{
  status: 'idle' | 'pending' | 'success' | 'error'
  variables: TVariables | undefined
  submittedAt: number | undefined
  mutate: (vars: TVariables) => Promise<TData | undefined>
  error: TError | undefined
  data: TData | undefined
  isPending: boolean // Convenience: status === 'pending'
}
```

**Invariants:**

- `onError` takes precedence over `errorHandler`
- `errorHandler` takes precedence over default `toastErrorHandler`
- Default behavior displays user-friendly error messages via toast

## useEntityMutation

High-level mutation hook for CRUD operations. Composes `useMutation` with standard success patterns.

**Interface:**

```typescript
useEntityMutation<
  TCreateData,
  TCreateVars,
  TUpdateData,
  TUpdateVars,
  TDeleteData,
  TDeleteVars
>({
  createFn?: (vars: TCreateVars) => Promise<TCreateData>
  updateFn?: (vars: TUpdateVars) => Promise<TUpdateData>
  deleteFn?: (vars: TDeleteVars) => Promise<TDeleteData>
  onSuccessMessage?: (mode: 'create' | 'update' | 'delete') => string
  onSuccess?: (ctx: { mode: 'create' | 'update' | 'delete'; data: TCreateData | TUpdateData | TDeleteData }) => void | Promise<void>
  invalidateRouter?: boolean // defaults to true
}): {
  createMutation: { mutate: (vars: TCreateVars) => void; isPending: boolean }
  updateMutation: { mutate: (vars: TUpdateVars) => void; isPending: boolean }
  deleteMutation: { mutate: (vars: TDeleteVars) => void; isPending: boolean }
  isAnyPending: boolean // Convenience: true if any mutation is pending
}
```

**Usage:**

```typescript
const { createMutation, updateMutation, deleteMutation } = useEntityMutation({
  createFn: createCourse,
  updateFn: updateCourse,
  deleteFn: deleteCourse,
  onSuccessMessage: (mode) => `Course ${mode}d successfully!`,
  onSuccess: async ({ mode, data }) => {
    if (mode === 'create') {
      await handleThumbnailUpload(data.course.id)
    }
  },
})
```

**Invariants:**

- Mutation functions are optional; unprovided mutations throw when called
- Default success messages: "Created successfully", "Updated successfully", "Deleted successfully"
- Router invalidation happens automatically unless `invalidateRouter: false`
- Error handling delegated to composed `useMutation` (uses `toastErrorHandler` by default)

## useDialogState

Manages dialog open/closed state, mode (create/edit/delete/view), and optional dialog item.

**Interface:**

```typescript
useDialogState<T = unknown>(): {
  isOpen: boolean
  dialogMode: 'create' | 'edit' | 'delete' | 'view'
  dialogItem: T | undefined
  openDialog: (mode: DialogMode, item?: T) => void
  closeDialog: () => void
}
```

**Usage:**

```typescript
const { isOpen, dialogMode, dialogItem, openDialog, closeDialog } = useDialogState<Course>()

// Open create dialog
<Button onClick={() => openDialog('create')}>New Course</Button>

// Open edit dialog with item
<Button onClick={() => openDialog('edit', course)}>Edit</Button>

// Close dialog
<Button onClick={closeDialog}>Cancel</Button>

// Use state in dialog
{isOpen && <CourseDialog mode={dialogMode} item={dialogItem} onClose={closeDialog} />}
```

**Invariants:**

- `dialogMode` defaults to `'create'` when dialog is closed (prevents visual flash during close animation)
- `dialogItem` is `undefined` for create/delete modes (only set for edit/view with explicit item)
- `isOpen` is `true` when `closeDialog` has not been called, `false` otherwise

## useFileUpload

Manages file selection, base64 conversion, and upload state for file uploads.

**Interface:**

```typescript
useFileUpload(): {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  isUploading: boolean
  fileData: string | null  // base64 string
  fileObject: File | null  // original File object
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  clearFile: () => void
  setUploading: (isUploading: boolean) => void
}
```

**Usage:**

```typescript
const { fileInputRef, isUploading, fileData, fileObject, handleFileChange, clearFile, setUploading } = useFileUpload()

// In JSX
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  onChange={handleFileChange}
  className="hidden"
/>

// Upload when ready
const handleUpload = async () => {
  if (!fileObject) return
  setUploading(true)
  await uploadFunction({ data: { fileData, fileName: fileObject.name, fileType: fileObject.type, fileSize: fileObject.size } })
  setUploading(false)
}

// Clear file
<Button onClick={clearFile}>Remove</Button>
```

**Invariants:**

- No client-side validation (server is single source of truth)
- Base64 conversion handled internally via `fileToBase64`
- Consumer orchestrates upload timing (before or after entity creation)
- Consumer builds UI (hook is logic-only)
- Old file deletion handled by server functions

## Form Hooks

- `useAppForm` — TanStack form hook factory (demo/FormComponents)
