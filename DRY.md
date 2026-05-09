# Reusable Components and Functions Analysis

Identify and score similar component and function patterns across the codebase for courseId, lessonId, assignmentId, enrollmentId, library, students, events, and related modules.

## UI/Layout Patterns

### 1. Page Layout Wrapper Pattern - Score: 90

**Locations:** courses/$courseId, lessons/$lessonId, assignments/$assignmentId, enrollments/$enrollmentId, library/index, students/index, students/$studentId, events.tsx

**Pattern:**

```tsx
<div
  className="relative isolate min-h-screen overflow-hidden"
  style={{
    backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${facultyBackground})`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
  }}
>
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />
  <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
    {/* Content */}
  </div>
</div>
```

**Reusability Score:** 90/100

- Very high duplication across 8+ route files
- Consistent structure with slight variations in padding
- Could be extracted as `<PageLayout>` component
- Background image and gradients are design system constants

---

### 2. Page Header Pattern - Score: 85

**Locations:** courses/$courseId, lessons/$lessonId, assignments/$assignmentId, students/$studentId, enrollments/$enrollmentId

**Pattern:**

```tsx
<div className="mb-10">
  <Button
    variant="ghost"
    theme="light"
    size="sm"
    className="mb-6 gap-1"
    onClick={goBack}
  >
    <ChevronLeft className="size-3.5" />
    Back
  </Button>
  <div className="flex items-start justify-between gap-6">
    <div>
      <div className="h-px w-10 bg-[#C5A059]/50" />
      <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
        {title}
      </h1>
      <div className="mt-3 flex items-center gap-4 text-[0.68rem] text-[#9B8C7C]">
        {/* Metadata */}
      </div>
    </div>
    <div className="flex items-center gap-3 pt-4">{/* Action buttons */}</div>
  </div>
</div>
```

**Reusability Score:** 85/100

- Consistent structure across detail pages
- Back button, gold line, serif title, metadata, actions
- Could be `<PageHeader>` component with slots for metadata and actions
- Some variation in metadata content

---

### 3. Empty State Pattern - Score: 88

**Locations:** courses/$courseId (lessons), lessons/$lessonId (assignments), library/index, events.tsx

**Pattern:**

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="mb-4 size-10 text-[#C5A059]/30" />
  <p className="text-sm text-[#AFA28F]">No items yet</p>
  {canCreate && (
    <Button theme="dark" className="mt-4" onClick={onCreate}>
      <PlusIcon className="size-3.5" />
      Create First Item
    </Button>
  )}
</div>
```

**Reusability Score:** 88/100

- Very consistent across 4+ locations
- Icon, message, CTA button pattern
- Could be `<EmptyState>` component with icon, message, action props
- High reusability with minimal variation

---

### 4. Dark Card/Panel Pattern - Score: 75

**Locations:** courses/$courseId, lessons/$lessonId, assignments/$assignmentId, students/$studentId

**Pattern:**

```tsx
<div className="border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
  <div className="bg-[#151515]/88 px-6 py-6">
    <div className="h-px w-8 bg-[#C5A059]/40" />
    <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
      {label}
    </div>
    {/* Content */}
  </div>
</div>
```

**Reusability Score:** 75/100

- Consistent dark card styling
- Gold accent line, uppercase label
- Some variation in internal structure
- Could be `<DarkCard>` or `<Panel>` component

---

### 5. Status Badge/Chip Pattern - Score: 70

**Locations:** courses/$courseId, lessons/$lessonId, assignments/$assignmentId, events.tsx, library/index

**Pattern:**

```tsx
<span
  className={cn(
    'border px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.18em] uppercase',
    status === 'published'
      ? 'border-[#C5A059]/40 text-[#9B7A41]'
      : status === 'draft'
        ? 'border-white/12 text-[#8E816D]'
        : 'border-red-400/50 text-red-400',
  )}
>
  {label}
</span>
```

**Reusability Score:** 70/100

- Similar structure but different color schemes per entity
- Could be `<StatusChip>` component with status type prop
- Some variation in color mappings
- Moderate reusability benefit

---

## Dialog Patterns

### 6. Dialog Structure Pattern - Score: 95

**Locations:** CourseDialog, LessonDialog, AssignmentDialog, EventDialog, MediaDialog

**Pattern:**

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]"
    style={{
      backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
    showCloseButton={false}
  >
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
    <div className="relative flex min-h-0 flex-1 flex-col">
      <DialogHeader>
        <div className="mb-1">
          <div className="h-px w-8 bg-[#C5A059]/40" />
          <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
            {modeLabel}
          </div>
        </div>
        <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
          {title}
        </DialogTitle>
        <DialogDescription className="text-[#AFA28F]">
          {description}
        </DialogDescription>
      </DialogHeader>
      <DialogBody>{/* Form content */}</DialogBody>
      <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
        <Button variant="outline" theme="dark" onClick={onCancel}>
          Cancel
        </Button>
        <Button theme="dark" onClick={onSubmit}>
          {actionLabel}
        </Button>
      </DialogFooter>
    </div>
  </DialogContent>
</Dialog>
```

**Reusability Score:** 95/100

- Extremely high duplication across 5+ dialogs
- Identical structure with only content variation
- Could be base `<FormDialog>` component with render props or slots
- Highest priority for extraction

---

### 7. Delete Confirmation Dialog Pattern - Score: 92

**Locations:** CourseDialog (inline), LessonDialog, AssignmentDialog, EventDialog, enrollments/$enrollmentId

**Pattern:**

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]"
    style={dialogStyle}
    showCloseButton={false}
  >
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
    <div className="relative">
      <DialogHeader>
        <div className="mb-1">
          <div className="h-px w-8 bg-[#C5A059]/40" />
          <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
            Confirm action
          </div>
        </div>
        <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
          Delete {entityType}
        </DialogTitle>
        <DialogDescription className="text-[#AFA28F]">
          Are you sure you want to delete "{itemName}"? This action cannot be
          undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
        <Button variant="outline" theme="dark" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          className="rounded-none"
          onClick={onDelete}
          disabled={isPending}
        >
          {isPending ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogFooter>
    </div>
  </DialogContent>
</Dialog>
```

**Reusability Score:** 92/100

- Nearly identical across 5+ locations
- Could be `<DeleteConfirmDialog>` component
- Very high reusability benefit

---

## Form Patterns

### 8. Form Field Pattern - Score: 80

**Locations:** CourseDialog, LessonDialog, AssignmentDialog, EventDialog, MediaDialog

**Pattern:**

```tsx
<Field>
  <FieldLabel
    htmlFor={id}
    className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
  >
    {label} {required && <span className="text-[#C5A059]">*</span>}
  </FieldLabel>
  <Input
    id={id}
    value={formData[field]}
    className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50${fieldErrors[field] ? 'border-red-500/60' : ''}`}
    onChange={(e) => {
      setFormData({ ...formData, [field]: e.target.value })
      if (fieldErrors[field]) setFieldErrors({ ...fieldErrors, [field]: '' })
    }}
  />
  {fieldErrors[field] && (
    <p className="text-[0.68rem] text-red-400">{fieldErrors[field]}</p>
  )}
</Field>
```

**Reusability Score:** 80/100

- Consistent pattern across all dialogs
- Could be `<FormField>` component with validation handling
- Reduces boilerplate significantly
- Some variation in input types (text, number, datetime-local)

---

### 9. Form Validation Pattern - Score: 75

**Locations:** CourseDialog, LessonDialog, AssignmentDialog, EventDialog, MediaDialog

**Pattern:**

```tsx
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

const handleSubmit = () => {
  const parseResult = schema.safeParse(formData)
  if (!parseResult.success) {
    const errors: Record<string, string> = {}
    for (const issue of parseResult.error.issues) {
      const key = issue.path[0] as string
      if (!errors[key]) errors[key] = issue.message
    }
    setFieldErrors(errors)
    return
  }
  setFieldErrors({})
  // Submit mutation
}
```

**Reusability Score:** 75/100

- Identical validation logic across dialogs
- Could be custom hook `useFormValidation`
- Moderate reusability benefit
- Some variation in schema selection

---

### 10. Mutation Pattern - Score: 85

**Locations:** CourseDialog, LessonDialog, AssignmentDialog, EventDialog, MediaDialog, enrollments/$enrollmentId

**Pattern:**

```tsx
const createMutation = useMutation({
  fn: createFunction,
  onSuccess: async () => {
    toast.success('Entity created successfully!')
    onOpenChange(false)
    await router.invalidate()
  },
})

const updateMutation = useMutation({
  fn: updateFunction,
  onSuccess: async () => {
    toast.success('Entity updated successfully!')
    onOpenChange(false)
    await router.invalidate()
  },
})

const deleteMutation = useMutation({
  fn: deleteFunction,
  onSuccess: async () => {
    toast.success('Entity deleted successfully!')
    onOpenChange(false)
    await router.invalidate()
  },
})
```

**Reusability Score:** 85/100

- Very consistent pattern across all CRUD operations
- Could be custom hook `useCrudMutations` or `useEntityMutation`
- High reusability benefit
- Some variation in success messages and navigation

---

### 11. File Upload Pattern - Score: 72

**Locations:** CourseDialog, MediaDialog

**Pattern:**

```tsx
const fileInputRef = useRef<HTMLInputElement>(null)
const [isUploading, setIsUploading] = useState(false)

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > maxSize) {
    toast.error('File size must be less than {maxSize}MB')
    return
  }
  const fileData = await fileToBase64(file)
  setFormData({ ...formData, fileField: fileData, fileObject: file })
}

// Upload on submit
if (formData.fileObject) {
  setIsUploading(true)
  await uploadFunction({ data: { fileData, fileName, fileType, fileSize } })
  setIsUploading(false)
}
```

**Reusability Score:** 72/100

- Similar structure in 2 dialogs
- Could be `useFileUpload` hook
- Moderate reusability benefit
- Some variation in upload functions

---

## Table/Data Patterns

### 12. DataTable with Actions Pattern - Score: 78

**Locations:** StudentsView, library/index, events.tsx

**Pattern:**

```tsx
const columns: Array<ColumnDef<T, any>> = [
  columnHelper.accessor('field', {
    cell: (info) => <span className="text-[#F8F4EC]">{info.getValue()}</span>,
    header: 'Label',
  }),
  createButtonColumn([
    {
      icon: EyeIcon,
      label: 'View',
      onClick: (row) => navigate({ to: '/path/$id', params: { id: row.id } }),
    },
    {
      icon: PencilIcon,
      label: 'Edit',
      onClick: (row) => setDialogState({ mode: 'edit', item: row }),
    },
    {
      icon: Trash2Icon,
      label: 'Delete',
      onClick: (row) => setDialogState({ mode: 'delete', item: row }),
    },
  ]),
]
```

**Reusability Score:** 78/100

- Consistent pattern across 3+ views
- `createButtonColumn` already exists but action patterns repeat
- Could be enhanced with standard action handlers
- Moderate to high reusability

---

### 13. Loading State Pattern - Score: 65

**Locations:** All dialogs and mutation handlers

**Pattern:**

```tsx
const isPending = createMutation.status === 'pending' || updateMutation.status === 'pending' || deleteMutation.status === 'pending'

<Button disabled={isPending}>
  {isPending ? 'Saving...' : 'Save'}
</Button>
```

**Reusability Score:** 65/100

- Simple pattern but repeated everywhere
- Could be consolidated with mutation hooks
- Low complexity but high frequency
- Minor reusability benefit

---

## Logic/State Patterns

### 14. Permission Check Pattern - Score: 68

**Locations:** courses/$courseId, lessons/$lessonId, assignments/$assignmentId, students/index, events.tsx

**Pattern:**

```tsx
const isAdmin = role === 'admin'
const isCourseTeacher = isUserCourseTeacher(entity, user.id) || role === 'admin'
const canEdit = role === 'teacher' || role === 'admin'
const canManage = canEdit && isCourseTeacher
```

**Reusability Score:** 68/100

- Repeated permission logic across routes
- Could be custom hook `usePermissions` or `useEntityPermissions`
- Some variation per entity type
- Moderate reusability benefit

---

### 15. Dialog State Management Pattern - Score: 82

**Locations:** courses/$courseId, lessons/$lessonId, assignments/$assignmentId, library/index, events.tsx

**Pattern:**

```tsx
const [dialogState, setDialogState] = useState<{ mode: 'create' | 'edit' | 'delete' | null, item?: T }>(null)

const isOpen = dialogState !== null
const dialogMode = dialogState?.mode ?? 'create'
const dialogItem = dialogState && dialogState.mode !== 'create' ? dialogState.item : undefined

<DialogComponent
  open={isOpen}
  onOpenChange={(open) => !open && setDialogState(null)}
  mode={dialogMode}
  item={dialogItem}
/>
```

**Reusability Score:** 82/100

- Very consistent pattern across 5+ routes
- Could be custom hook `useDialogState`
- High reusability benefit
- Clean abstraction opportunity

---

## Summary by Priority

### High Priority (Score 85+)

1. ✅ **Dialog Structure Pattern** - 95/100 - Extract to `<FormDialog>` base component
2. ✅ **Delete Confirmation Pattern** - 92/100 - Extract to `<DeleteConfirmDialog>`
3. ✅ **Page Layout Wrapper** - 90/100 - Extract to `<PageLayout>` component
4. ✅ **Mutation Pattern** - 85/100 - Extract to `useEntityMutation` hook
5. ✅ **Dialog State Management** - 82/100 - Extract to `useDialogState` hook

### Medium Priority (Score 70-84)

6. **Empty State Pattern** - 88/100 - Extract to `<EmptyState>` component
7. **Page Header Pattern** - 85/100 - Extract to `<PageHeader>` component
8. **DataTable with Actions** - 78/100 - Enhance `createButtonColumn` with standard handlers
9. **Form Field Pattern** - 80/100 - Extract to `<FormField>` component
10. ❌ **Form Validation Pattern** - 75/100 - Extract to `useFormValidation` hook
11. ✅ **Dark Card Pattern** - 75/100 - Extract to `<DarkCard>` component
12. ✅ **File Upload Pattern** - 72/100 - Extract to `useFileUpload` hook

### Lower Priority (Score 65-69)

13. ✅ **Status Badge Pattern** - 70/100 - Extract to `<StatusChip>` component
14. **Permission Check Pattern** - 68/100 - Extract to `usePermissions` hook
15. ✅ **Loading State Pattern** - 65/100 - Already implemented in `useEntityMutation` hook (dialogs migrated to use `isAnyPending`)

## Total Estimated Impact

- **Files affected:** 20+ route and component files
- **Lines of code reduction:** ~1500-2000 lines through component extraction
- **Consistency improvement:** Significant - unified patterns across all CRUD operations
- **Maintenance burden:** Reduced - single source of truth for common patterns
