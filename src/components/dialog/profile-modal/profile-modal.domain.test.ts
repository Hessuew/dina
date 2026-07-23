import { describe, expect, it } from 'vitest'
import {
  buildAvatarUploadInput,
  buildProfileUpdateInput,
  emptyPasswordForm,
  getAvatarAriaLabel,
  getEmailFieldDescription,
  getPasswordButtonLabel,
  getProfileButtonLabel,
  getProfileDisplayName,
  getProfileInitialValues,
  getProfileInitials,
  resolveProfileUpdateOutcome,
  validateConfirmPassword,
} from './profile-modal.domain'

describe('getProfileInitials', () => {
  it('takes the first letter of the first two names, uppercased', () => {
    expect(
      getProfileInitials({ fullName: 'ada lovelace', email: 'a@x.io' }),
    ).toBe('AL')
  })

  it('caps at two initials for longer names', () => {
    expect(
      getProfileInitials({ fullName: 'John Quincy Adams', email: 'j@x.io' }),
    ).toBe('JQ')
  })

  it('falls back to the first two email chars when no full name', () => {
    expect(getProfileInitials({ email: 'zoe@x.io' })).toBe('ZO')
  })

  it('treats an empty full name as missing', () => {
    expect(getProfileInitials({ fullName: '', email: 'bo@x.io' })).toBe('BO')
  })
})

describe('getProfileInitialValues', () => {
  it('maps user fields, defaulting missing name and bio to empty strings', () => {
    expect(getProfileInitialValues({ email: 'a@x.io' })).toEqual({
      fullName: '',
      email: 'a@x.io',
      bio: '',
    })
  })

  it('passes through provided name and bio', () => {
    expect(
      getProfileInitialValues({
        email: 'a@x.io',
        fullName: 'Ada',
        bio: 'hi',
      }),
    ).toEqual({ fullName: 'Ada', email: 'a@x.io', bio: 'hi' })
  })
})

describe('resolveProfileUpdateOutcome', () => {
  it('reports the pending email when an email change is pending', () => {
    expect(
      resolveProfileUpdateOutcome({
        emailChangePending: true,
        pendingEmail: 'new@x.io',
      }),
    ).toEqual({
      pendingEmail: 'new@x.io',
      message: 'Profile updated. Check your inbox to verify your new email.',
    })
  })

  it('reports plain success when no email change is pending', () => {
    expect(
      resolveProfileUpdateOutcome({
        emailChangePending: false,
        pendingEmail: undefined,
      }),
    ).toEqual({ pendingEmail: null, message: 'Profile updated successfully' })
  })

  it('reports plain success when pending flag is set but no email present', () => {
    expect(
      resolveProfileUpdateOutcome({
        emailChangePending: true,
        pendingEmail: undefined,
      }),
    ).toEqual({ pendingEmail: null, message: 'Profile updated successfully' })
  })
})

describe('buildProfileUpdateInput', () => {
  it('passes through name and email and keeps a non-empty bio', () => {
    expect(
      buildProfileUpdateInput({ fullName: 'Ada', email: 'a@x.io', bio: 'hi' }),
    ).toEqual({ fullName: 'Ada', email: 'a@x.io', bio: 'hi' })
  })

  it('coerces an empty bio to undefined', () => {
    expect(
      buildProfileUpdateInput({ fullName: 'Ada', email: 'a@x.io', bio: '' }),
    ).toEqual({ fullName: 'Ada', email: 'a@x.io', bio: undefined })
  })
})

describe('buildAvatarUploadInput', () => {
  it('returns file metadata for signed-upload validation', () => {
    expect(
      buildAvatarUploadInput({ name: 'a.png', type: 'image/png', size: 123 }),
    ).toEqual({
      fileName: 'a.png',
      fileType: 'image/png',
      fileSize: 123,
    })
  })
})

describe('validateConfirmPassword', () => {
  it('returns undefined when the passwords match', () => {
    expect(validateConfirmPassword('secret', 'secret')).toBeUndefined()
  })

  it('returns an error message when the passwords differ', () => {
    expect(validateConfirmPassword('secret', 'other')).toBe(
      'Passwords do not match',
    )
  })
})

describe('getEmailFieldDescription', () => {
  it('describes the pending verification when an email was sent', () => {
    expect(getEmailFieldDescription('new@x.io')).toBe(
      'Verification sent to new@x.io. Click the link to confirm.',
    )
  })

  it('describes the verification requirement when nothing is pending', () => {
    expect(getEmailFieldDescription(null)).toBe(
      'Changing your email will require verification',
    )
  })
})

describe('getProfileDisplayName', () => {
  it('prefers the full name when present', () => {
    expect(getProfileDisplayName({ fullName: 'Ada', email: 'a@x.io' })).toBe(
      'Ada',
    )
  })

  it('falls back to the email when no full name', () => {
    expect(getProfileDisplayName({ email: 'a@x.io' })).toBe('a@x.io')
  })
})

describe('getAvatarAriaLabel', () => {
  it('announces uploading while pending', () => {
    expect(getAvatarAriaLabel(true)).toBe('Uploading...')
  })

  it('announces change avatar when idle', () => {
    expect(getAvatarAriaLabel(false)).toBe('Change avatar')
  })
})

describe('getPasswordButtonLabel', () => {
  it('shows updating while pending', () => {
    expect(getPasswordButtonLabel(true)).toBe('Updating...')
  })

  it('shows update password when idle', () => {
    expect(getPasswordButtonLabel(false)).toBe('Update Password')
  })
})

describe('getProfileButtonLabel', () => {
  it('shows saving while pending', () => {
    expect(getProfileButtonLabel(true)).toBe('Saving...')
  })

  it('shows save changes when idle', () => {
    expect(getProfileButtonLabel(false)).toBe('Save Changes')
  })
})

describe('emptyPasswordForm', () => {
  it('is two empty password fields', () => {
    expect(emptyPasswordForm).toEqual({ newPassword: '', confirmPassword: '' })
  })
})
