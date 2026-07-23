export type ProfileFormData = {
  fullName: string
  email: string
  bio: string
}

export type PasswordFormData = {
  newPassword: string
  confirmPassword: string
}

export type ProfileModalUser = {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  bio?: string
}

export const emptyPasswordForm: PasswordFormData = {
  newPassword: '',
  confirmPassword: '',
}

export function getProfileInitials(
  user: Pick<ProfileModalUser, 'fullName' | 'email'>,
): string {
  if (user.fullName) {
    return user.fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return user.email.slice(0, 2).toUpperCase()
}

export function getProfileInitialValues(
  user: Pick<ProfileModalUser, 'fullName' | 'email' | 'bio'>,
): ProfileFormData {
  return {
    fullName: user.fullName ?? '',
    email: user.email,
    bio: user.bio ?? '',
  }
}

export type ProfileUpdateOutcome = {
  pendingEmail: string | null
  message: string
}

export function resolveProfileUpdateOutcome(data: {
  emailChangePending: boolean
  pendingEmail: string | undefined
}): ProfileUpdateOutcome {
  if (data.emailChangePending && data.pendingEmail) {
    return {
      pendingEmail: data.pendingEmail,
      message: 'Profile updated. Check your inbox to verify your new email.',
    }
  }
  return { pendingEmail: null, message: 'Profile updated successfully' }
}

export function buildProfileUpdateInput(value: ProfileFormData): {
  fullName: string
  email: string
  bio: string | undefined
} {
  return {
    fullName: value.fullName,
    email: value.email,
    bio: value.bio || undefined,
  }
}

export function buildAvatarUploadInput(
  file: Pick<File, 'name' | 'type' | 'size'>,
): {
  fileName: string
  fileType: string
  fileSize: number
} {
  return {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  }
}

export function validateConfirmPassword(
  value: string,
  newPassword: string,
): string | undefined {
  if (value !== newPassword) return 'Passwords do not match'
  return undefined
}

export function getEmailFieldDescription(
  pendingEmailSent: string | null,
): string {
  if (pendingEmailSent) {
    return `Verification sent to ${pendingEmailSent}. Click the link to confirm.`
  }
  return 'Changing your email will require verification'
}

export function getProfileDisplayName(
  user: Pick<ProfileModalUser, 'fullName' | 'email'>,
): string {
  return user.fullName ?? user.email
}

export function getAvatarAriaLabel(isUploading: boolean): string {
  return isUploading ? 'Uploading...' : 'Change avatar'
}

export function getPasswordButtonLabel(isPending: boolean): string {
  return isPending ? 'Updating...' : 'Update Password'
}

export function getProfileButtonLabel(isPending: boolean): string {
  return isPending ? 'Saving...' : 'Save Changes'
}
