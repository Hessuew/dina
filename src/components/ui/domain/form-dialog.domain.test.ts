import { describe, expect, it } from 'vitest'
import { buildFormDialogViewModel } from './form-dialog.domain'

const base = {
  mode: 'create' as const,
  maxWidth: '2xl' as const,
  hasSubmitHandler: true,
  isSubmitting: false,
}

describe('buildFormDialogViewModel', () => {
  it('maps the mode to its uppercase eyebrow label', () => {
    expect(buildFormDialogViewModel({ ...base, mode: 'create' }).modeLabel).toBe('New')
    expect(buildFormDialogViewModel({ ...base, mode: 'edit' }).modeLabel).toBe('Edit')
    expect(buildFormDialogViewModel({ ...base, mode: 'view' }).modeLabel).toBe('View')
  })

  it('maps each max-width token to its dialog class', () => {
    expect(buildFormDialogViewModel({ ...base, maxWidth: 'sm' }).maxWidthClass).toBe('sm:max-w-sm')
    expect(buildFormDialogViewModel({ ...base, maxWidth: 'md' }).maxWidthClass).toBe('sm:max-w-md')
    expect(buildFormDialogViewModel({ ...base, maxWidth: 'lg' }).maxWidthClass).toBe('sm:max-w-lg')
    expect(buildFormDialogViewModel({ ...base, maxWidth: 'xl' }).maxWidthClass).toBe('sm:max-w-xl')
    expect(buildFormDialogViewModel({ ...base, maxWidth: '2xl' }).maxWidthClass).toBe(
      'sm:max-w-2xl',
    )
    expect(buildFormDialogViewModel({ ...base, maxWidth: '3xl' }).maxWidthClass).toBe(
      'sm:max-w-3xl',
    )
  })

  it('shows the submit button only when a handler exists and the mode has a default label', () => {
    expect(buildFormDialogViewModel({ ...base, mode: 'create', hasSubmitHandler: true }).showSubmitButton).toBe(true)
    expect(buildFormDialogViewModel({ ...base, mode: 'edit', hasSubmitHandler: true }).showSubmitButton).toBe(true)
    expect(buildFormDialogViewModel({ ...base, mode: 'view', hasSubmitHandler: true }).showSubmitButton).toBe(false)
    expect(buildFormDialogViewModel({ ...base, mode: 'create', hasSubmitHandler: false }).showSubmitButton).toBe(false)
  })

  it('uses the default submit label for the mode when not submitting', () => {
    expect(buildFormDialogViewModel({ ...base, mode: 'create' }).submitButtonLabel).toBe('Create')
    expect(buildFormDialogViewModel({ ...base, mode: 'edit' }).submitButtonLabel).toBe(
      'Save Changes',
    )
  })

  it('prefers an explicit submit label over the default when not submitting', () => {
    expect(
      buildFormDialogViewModel({ ...base, mode: 'create', submitLabel: 'Publish' })
        .submitButtonLabel,
    ).toBe('Publish')
  })

  it('uses the default loading label for the mode when submitting', () => {
    expect(
      buildFormDialogViewModel({ ...base, mode: 'create', isSubmitting: true }).submitButtonLabel,
    ).toBe('Creating...')
    expect(
      buildFormDialogViewModel({ ...base, mode: 'edit', isSubmitting: true }).submitButtonLabel,
    ).toBe('Saving...')
  })

  it('prefers an explicit loading label over the default when submitting', () => {
    expect(
      buildFormDialogViewModel({
        ...base,
        mode: 'create',
        isSubmitting: true,
        loadingLabel: 'Publishing...',
      }).submitButtonLabel,
    ).toBe('Publishing...')
  })
})
