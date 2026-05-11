# Auth & Enrolment Forms — TanStack Form Migration Design

**Date:** 2026-05-10
**Linear issue:** CHR-46

## Goal

Migrate `login-form.tsx`, `signup-form.tsx`, and `enrolment-form.tsx` to use `useAppForm` (the project's `createFormHook`-based wrapper), consistent with the completed dialog migrations (CHR-45).

## Out of Scope

- OTP verification step in `SignupForm` — stays as standalone `useState` UI
- Visual design changes — no styling modifications
- New form validation rules — existing validators are preserved as-is

## Architecture

All three forms follow the dialog migration pattern:

- `useAppForm({ defaultValues, onSubmit })` replaces `useForm` / native form state
- `form.AppField` + registered components for straightforward fields
- `form.Field` render props for fields needing custom UI
- Submit payload built inside `onSubmit`; mutations called from there

### Shared component change

`TextField`'s `type` prop is extended from `'text' | 'datetime-local'` to also accept `'email' | 'password' | 'tel' | 'number'`.

Files:
- `src/components/ui/app-form-fields.tsx` — `TextFieldProps.type`
- `src/components/ui/form-field.tsx` — `FormFieldTextInputProps.type`

## Per-Form Design

### LoginForm (`src/components/auth/login-form.tsx`)

**Current state:** Native `<form>` with `FormData` extraction in `handleSubmit`.

**Changes:**
- `useAppForm({ defaultValues: { email: '', password: '' }, onSubmit })` where `onSubmit` calls `loginMutation.mutate`
- Both fields → `form.AppField` with `TextField` (types `email` and `password`)
- Native `handleSubmit` and `FormData` removed
- Form element: `<form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit() }}>`

### SignupForm (`src/components/auth/signup-form.tsx`)

**Current state:** Mix of `useState` for email/password + native form submit. OTP step is separate.

**Changes:**
- `useAppForm({ defaultValues: { email: '', name: '', password: '', confirmPassword: '' }, onSubmit })` where `onSubmit` builds payload and calls `signupMutation.mutate`
- `email` → `form.Field` render prop (needs `onBlur` invitation check, loading spinner, disabled-when-valid, invitation feedback)
- `name` → `form.AppField` with `TextField`
- `password` → `form.Field` render prop (needs password strength meter)
- `confirmPassword` → `form.Field` render prop (needs cross-field validation against `password`)
- `invitationValid`, `invitationError`, `invitationRole`, all OTP state stay as external `useState`
- Hidden token stays as plain `<input type="hidden">` outside form; token passed directly in `onSubmit`
- `useState` for `email` and `password` removed — values read from `form.state.values` where needed (e.g. passing `password` to `verifyOtpMutation`)

### EnrolmentForm (`src/components/auth/enrolment-form.tsx`)

**Current state:** Already uses `useForm` from `@tanstack/react-form` with `form.Field` render props.

**Changes:**
- `useForm` → `useAppForm` (same `defaultValues` and `onSubmit`)
- Simple text fields → `form.AppField` with `TextField`:
  `fullLegalName`, `preferredName`, `email`, `phoneWhatsApp`, `yearOfBirth`, `nationalityCitizenship`, `currentCity`, `currentCountry`, `churchAffiliations`
- `gender` → `form.AppField` with `SelectField`
- `aboutYourself`, `expectationsAlignment` → stay as `form.Field` render props (word-count display)
- Step validation: replace manual `attemptedFields` + `getVisibleError`/`getManualError` + `StableFieldError` with `form.validateField(fieldName, 'change')` called for all fields in the current step before advancing
- `attemptedFields` state, `StableFieldError` component, `getManualError`, `getVisibleError`, `FIELD_VALIDATORS` map all removed — `FormFieldInput`/`FormFieldSelect` display errors from `meta.errors` automatically
- Field-level `validators` on `form.Field` for the two remaining textarea fields are preserved

## Verification

After each migrated form: `bun lint`
