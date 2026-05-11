# Migrate Dialogs to TanStack Form

Refactor the dialog form state in `LessonDialog`, then apply the proven pattern to `EventDialog` and `CourseDialog` without changing dialog layout, visual design, or server mutation behavior.

## Linear Context

- **Project**: TanStack Form Migration
- **Primary issue**: `CHR-45` — Migrate dialogs to TanStack Form
- **Follow-up issue**: `CHR-46` — Migrate auth forms to TanStack Form
- **Priority**: Medium
- **Labels intent**: refactor, forms

## Current Findings

- `LessonDialog`, `EventDialog`, and `CourseDialog` use manual `useState` for `formData` plus manual `fieldErrors`.
- Existing Zod schemas live in `src/schemas/*.schema.ts` and are already authoritative for server payload validation.
- `src/components/ui/form-field.tsx` contains reusable controlled field components that match the design system.
- `src/components/ui/form-dialog.tsx` owns dialog shell, footer, and visual styling; it should remain stable.
- `src/hooks/form.js` currently references missing demo files and should not be used as-is.
- TanStack Form v1 already has Standard Schema support in installed package output, so Zod v4 schemas can likely be used directly. Do not add `@tanstack/zod-form-adapter` unless implementation proves it is required.

## Recommended Migration Strategy

### 1. Repair app-level `useAppForm` first

Create real field components and wire them into `createFormHook` before touching dialogs.

**Files to create/modify:**

- `src/hooks/form-context.ts` — replace the existing `.js` file with typed version
- `src/hooks/form.ts` — new typed app form hook that registers DINA field components
- `src/components/ui/app-form-fields.tsx` — new field components using `useFieldContext()`
- Delete `src/hooks/form.js` and `src/hooks/form-context.js` (broken demo files)

**Field components to create:**

- `TextField` — wraps `FormFieldInput` with TanStack Field integration
- `NumberField` — wraps `FormFieldNumberInput` with TanStack Field integration
- `TextAreaField` — wraps `FormFieldTextarea` with TanStack Field integration
- `SelectField` — wraps `FormFieldSelect` with TanStack Field integration
- `SwitchField` — wraps `Switch` with TanStack Field integration

Each component uses `useFieldContext()` internally to access field state and handlers.

Acceptance:

- no missing demo imports remain
- field components use existing DINA styling
- app form hook is typed
- no behavior change in dialogs yet

### 2. Migrate `LessonDialog` as proof of pattern

Use `useAppForm` instead of direct `useForm`.

Why first:

- smallest dialog surface
- clear create/edit/delete split
- exercises text, datetime, number, textarea, and switch fields
- lower risk than `CourseDialog` upload state and `EventDialog` view mode

Acceptance:

- create lesson still enforces max 3 lessons
- edit lesson preserves initial values on open
- delete flow unchanged
- submit payload matches existing `createLesson` / `updateLesson` server functions
- validation errors display beside correct fields

### 3. Keep form values UI-shaped, convert at submit boundary

Dialog inputs should keep browser-friendly values:

- `scheduledTime`: `string` for `datetime-local`
- `duration`: string or number depending on final `NumberField` API, converted before schema/server payload
- optional text fields: empty string in UI, `undefined` in payload
- booleans: boolean throughout
- select empty state: UI-friendly empty string, payload `undefined`

Reason: UI state and server payload are different concepts. Keep conversion explicit at submit boundary.

### 4. Validate with existing Zod schemas at submit boundary first

Preferred first implementation:

- `useAppForm({ defaultValues, onSubmit })`
- build payload inside `onSubmit`
- run existing schema `.safeParse(payload)` before mutation
- surface errors through a small submit-error bridge only for the first proof-of-concept if TanStack's schema error mapping is not clean enough

Avoid:

- duplicating Zod rules in component validators
- moving schema responsibility into field components
- installing adapter before need is proven

After LessonDialog works, decide whether to move schema validation into `validators.onSubmit` directly.

### 5. Migrate `EventDialog` second

Key risks:

- has `view`, `create`, `edit`, and `delete` modes
- `category` UI type currently includes `''` but schema allows only `exam | chapel | personal`
- UI currently renders `Other`, but schema does not allow `other`; resolve mismatch instead of preserving invalid state
- `endTime > startTime` is custom validation outside schema today

Acceptance:

- view mode unchanged
- create/edit submit same payload shape as today
- invalid end time shows field-level error
- category values match schema, or schema/domain docs are intentionally updated if `other` is real domain value

### 6. Migrate `CourseDialog` third

Key risks:

- file upload state lives outside form via `useFileUpload`
- thumbnail preview uses both uploaded file data and persisted URL
- teacher uniqueness validation is custom
- `teacher1Id` / `teacher2Id` use `null` in UI but schema expects optional UUID

Acceptance:

- upload/clear thumbnail behavior unchanged
- teacher filtering still prevents duplicate teacher selection
- create/update payloads unchanged
- `resetForm` behavior still clears file state when appropriate

## Documentation Updates

- Update `src/components/README.md` if TanStack Form becomes the standard for feature forms/dialogs.
- Add `src/components/dialog/README.md` only if dialog-specific invariants become non-obvious after migration.
- ADR is optional and probably unnecessary unless the team commits to TanStack Form as the repository-wide form standard.

## Verification

Run after each migrated dialog:

- `bun run lint`
- `bun run test` if relevant tests exist
- manual smoke test for create/edit/delete dialog flows

Check specifically:

- initial values reset when dialog opens
- validation errors display next to correct fields
- submit buttons still respect pending mutation state
- no design-system regression: sharp corners, existing colors, existing `FormDialog` shell

## Stop Conditions

Stop and reassess if:

- TanStack Form cannot cleanly accept Zod v4 schemas without adapter
- error mapping requires invasive hacks
- shared wrappers become more complex than local field render props
- migration changes server payload semantics
