# Hooks

React hooks for data fetching and UI state.

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

- `useMutation` — Generic mutation hook with configurable error handling
- `useEntityMutation` — High-level CRUD mutation hook with toast notifications and router invalidation
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

## Form Hooks

- `useAppForm` — TanStack form hook factory (demo/FormComponents)
