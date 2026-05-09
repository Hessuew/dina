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
- `useIsMobile` — Mobile viewport detection (768px breakpoint)
- `useIsInView` — Intersection observer wrapper for motion/react

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

## Form Hooks

- `useAppForm` — TanStack form hook factory (demo/FormComponents)
