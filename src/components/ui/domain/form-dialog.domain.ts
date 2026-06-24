export type FormDialogMode = 'create' | 'edit' | 'view'
export type FormDialogMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

const modeLabels: Record<FormDialogMode, string> = {
  create: 'New',
  edit: 'Edit',
  view: 'View',
}

const defaultSubmitLabels: Record<FormDialogMode, string | null> = {
  create: 'Create',
  edit: 'Save Changes',
  view: null,
}

const loadingLabels: Record<FormDialogMode, string> = {
  create: 'Creating...',
  edit: 'Saving...',
  view: '',
}

const maxWidthClasses: Record<FormDialogMaxWidth, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
}

export interface FormDialogViewModelInput {
  mode: FormDialogMode
  maxWidth: FormDialogMaxWidth
  hasSubmitHandler: boolean
  isSubmitting: boolean
  submitLabel?: string
  loadingLabel?: string
}

export interface FormDialogViewModel {
  modeLabel: string
  maxWidthClass: string
  showSubmitButton: boolean
  submitButtonLabel: string
}

/**
 * Derive the presentational view-model for a {@link FormDialog} from its mode
 * and submission state: the eyebrow label, the max-width class, whether the
 * submit button renders, and the resolved submit/loading label.
 *
 * The submit button only shows when a handler is wired and the mode has a
 * default action label (`view` has none). An explicit `submitLabel` /
 * `loadingLabel` overrides the per-mode default.
 */
export function buildFormDialogViewModel(
  input: FormDialogViewModelInput,
): FormDialogViewModel {
  const defaultSubmitLabel = defaultSubmitLabels[input.mode]

  const submitButtonLabel = input.isSubmitting
    ? input.loadingLabel || loadingLabels[input.mode]
    : input.submitLabel || defaultSubmitLabel || ''

  return {
    modeLabel: modeLabels[input.mode],
    maxWidthClass: maxWidthClasses[input.maxWidth],
    showSubmitButton: input.hasSubmitHandler && defaultSubmitLabel !== null,
    submitButtonLabel,
  }
}
