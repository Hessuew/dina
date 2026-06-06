import { ArrowLeftIcon, KeyRoundIcon, PencilIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { toUserError } from '@/utils/errors'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { useMutation } from '@/hooks/useMutation'
import { useAppForm } from '@/hooks/form'
import { uploadAvatarFn } from '@/utils/imageUpload'
import { updatePasswordFn, updateProfileFn } from '@/utils/profile'
import {
  updatePasswordSchema,
  updateProfileSchema,
} from '@/schemas/profile.schema'

type ProfileFormData = {
  fullName: string
  email: string
  bio: string
}

type PasswordFormData = {
  newPassword: string
  confirmPassword: string
}

const emptyPasswordForm: PasswordFormData = {
  newPassword: '',
  confirmPassword: '',
}

type ProfileModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    email: string
    fullName?: string
    avatarUrl?: string
    bio?: string
  }
  onProfileUpdate?: () => void
}

function getProfileInitialValues(
  user: ProfileModalProps['user'],
): ProfileFormData {
  return {
    fullName: user.fullName ?? '',
    email: user.email,
    bio: user.bio ?? '',
  }
}

export function ProfileModal({
  open,
  onOpenChange,
  user,
  onProfileUpdate,
}: ProfileModalProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [pendingEmailSent, setPendingEmailSent] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email.slice(0, 2).toUpperCase()

  const updateProfileMutation = useMutation<
    Parameters<typeof updateProfileFn>[0],
    { emailChangePending: boolean; pendingEmail: string | undefined }
  >({
    fn: updateProfileFn,
    onSuccess: (ctx) => {
      if (ctx.data.emailChangePending && ctx.data.pendingEmail) {
        setPendingEmailSent(ctx.data.pendingEmail)
        toast.success(
          'Profile updated. Check your inbox to verify your new email.',
        )
      } else {
        toast.success('Profile updated successfully')
      }
      onProfileUpdate?.()
    },
    onError: (error) => {
      toast.error(toUserError(error).message)
    },
  })

  const uploadAvatarMutation = useMutation({
    fn: uploadAvatarFn,
    onSuccess: () => {
      toast.success('Avatar uploaded successfully')
      onProfileUpdate?.()
    },
    onError: (error) => {
      toast.error(toUserError(error).message)
    },
  })

  const updatePasswordMutation = useMutation({
    fn: updatePasswordFn,
    onSuccess: () => {
      toast.success('Password changed successfully')
      setShowPasswordForm(false)
      passwordForm.reset(emptyPasswordForm)
    },
    onError: (error) => {
      toast.error(toUserError(error).message)
    },
  })

  const profileForm = useAppForm({
    defaultValues: getProfileInitialValues(user),
    onSubmit: ({ value }) => {
      updateProfileMutation.mutate({
        data: {
          fullName: value.fullName,
          email: value.email,
          bio: value.bio || undefined,
        },
      })
    },
  })

  const passwordForm = useAppForm({
    defaultValues: emptyPasswordForm,
    onSubmit: ({ value }) => {
      updatePasswordMutation.mutate({
        data: { newPassword: value.newPassword },
      })
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const fileData = reader.result as string

      toast.loading('Uploading avatar...', { id: 'avatar-upload' })

      uploadAvatarMutation.mutate({
        data: {
          fileData,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
      })

      toast.dismiss('avatar-upload')

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (!open) {
      setPendingEmailSent(null)
      setShowPasswordForm(false)
      return
    }
    profileForm.reset(getProfileInitialValues(user))
    passwordForm.reset(emptyPasswordForm)
  }, [open, user, profileForm, passwordForm])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(44rem,calc(100svh-2rem))] rounded-none border border-white/10 p-0 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-4xl lg:max-w-5xl"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <DialogTitle className="sr-only">Profile</DialogTitle>

          {/* Header — key icon + close button, absolute top-right */}
          <DialogHeader className="absolute top-4 right-4 z-20">
            <div className="flex items-center gap-1">
              {!showPasswordForm && (
                <Button
                  variant="ghost"
                  theme="dark"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setShowPasswordForm(true)}
                  aria-label="Change password"
                >
                  <KeyRoundIcon className="size-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                theme="dark"
                size="icon"
                className="shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          </DialogHeader>

          <DialogBody className="relative overflow-hidden">
            {/* Two-column layout */}
            <div className="grid h-full min-h-0 grid-rows-[minmax(16rem,0.88fr)_minmax(0,1.12fr)] lg:grid-cols-[minmax(16rem,0.92fr)_minmax(0,1.08fr)] lg:grid-rows-none">
              {/* Left: Avatar */}
              <div className="relative min-h-0 overflow-hidden border-b border-white/10 bg-[#171717] lg:border-r lg:border-b-0">
                {user.avatarUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${user.avatarUrl})` }}
                    role="img"
                    aria-label={user.fullName ?? user.email}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1A1716]">
                    <div className="flex size-28 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] font-serif text-4xl text-[#E9D9B4] lg:size-36">
                      {initials}
                    </div>
                  </div>
                )}

                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,2,0.72)_0%,transparent_32%,transparent_58%,rgba(5,4,2,0.88)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%,rgba(197,160,89,0.12)_100%)]" />

                {/* Pen icon — avatar upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center border border-white/20 bg-black/50 text-white/70 transition-colors hover:bg-black/70 hover:text-white disabled:opacity-40"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAvatarMutation.isPending}
                  aria-label={
                    uploadAvatarMutation.isPending
                      ? 'Uploading...'
                      : 'Change avatar'
                  }
                >
                  <PencilIcon className="size-3.5" />
                </button>
              </div>

              {/* Right: Form */}
              <div className="flex min-h-0 flex-col overflow-hidden bg-[#151515]/88 px-7 py-10 sm:px-10 lg:px-12">
                {showPasswordForm ? (
                  /* Password mode */
                  <>
                    <div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          theme="dark"
                          size="icon"
                          className="shrink-0"
                          onClick={() => {
                            setShowPasswordForm(false)
                            passwordForm.reset(emptyPasswordForm)
                          }}
                          aria-label="Back to profile"
                        >
                          <ArrowLeftIcon className="size-3.5" />
                        </Button>
                        <div className="h-px flex-1 bg-[#C5A059]/50" />
                      </div>
                      <h3 className="mt-5 font-serif text-5xl leading-[0.88] tracking-[-0.06em] text-[#F8F4EC]">
                        security
                      </h3>
                    </div>
                    <div className="mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-white/8 pt-7 pr-2">
                      <FieldGroup>
                        <passwordForm.AppField
                          name="newPassword"
                          validators={{
                            onSubmit: updatePasswordSchema.shape.newPassword,
                          }}
                        >
                          {(field) => (
                            <field.TextField
                              id="newPassword"
                              label="New Password"
                              type="password"
                              required
                            />
                          )}
                        </passwordForm.AppField>
                        <passwordForm.AppField
                          name="confirmPassword"
                          validators={{
                            onSubmit: ({ value, fieldApi }) => {
                              const newPassword =
                                fieldApi.form.state.values.newPassword
                              if (value !== newPassword)
                                return 'Passwords do not match'
                              return undefined
                            },
                          }}
                        >
                          {(field) => (
                            <field.TextField
                              id="confirmPassword"
                              label="Confirm New Password"
                              type="password"
                              required
                            />
                          )}
                        </passwordForm.AppField>
                        <div className="flex justify-end pt-2">
                          <Button
                            type="button"
                            theme="dark"
                            onClick={() => void passwordForm.handleSubmit()}
                            disabled={updatePasswordMutation.isPending}
                          >
                            {updatePasswordMutation.isPending
                              ? 'Updating...'
                              : 'Update Password'}
                          </Button>
                        </div>
                      </FieldGroup>
                    </div>
                  </>
                ) : (
                  /* Profile mode */
                  <>
                    <div>
                      <div className="h-px w-12 bg-[#C5A059]/50" />
                      <h3 className="mt-5 font-serif text-5xl leading-[0.88] tracking-[-0.06em] text-[#F8F4EC]">
                        about me
                      </h3>
                    </div>
                    <div className="mt-8 flex min-h-0 flex-1 flex-col border-t border-white/8 pt-7 pr-2">
                      <FieldGroup className="min-h-0 flex-1">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <profileForm.AppField
                            name="email"
                            validators={{
                              onSubmit: updateProfileSchema.shape.email,
                            }}
                          >
                            {(field) => (
                              <field.TextField
                                id="email"
                                label="Email"
                                type="email"
                                required
                                description={
                                  pendingEmailSent
                                    ? `Verification sent to ${pendingEmailSent}. Click the link to confirm.`
                                    : 'Changing your email will require verification'
                                }
                              />
                            )}
                          </profileForm.AppField>
                          <profileForm.AppField
                            name="fullName"
                            validators={{
                              onSubmit: updateProfileSchema.shape.fullName,
                            }}
                          >
                            {(field) => (
                              <field.TextField
                                id="fullName"
                                label="Full Name"
                                required
                              />
                            )}
                          </profileForm.AppField>
                        </div>
                        <profileForm.AppField name="bio">
                          {(field) => (
                            <field.TextAreaField
                              id="bio"
                              label="Bio"
                              placeholder="Tell us about yourself..."
                              className="flex min-h-0 flex-1 flex-col [&_textarea]:flex-1 [&_textarea]:resize-none"
                            />
                          )}
                        </profileForm.AppField>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            theme="dark"
                            onClick={() => void profileForm.handleSubmit()}
                            disabled={updateProfileMutation.isPending}
                          >
                            {updateProfileMutation.isPending
                              ? 'Saving...'
                              : 'Save Changes'}
                          </Button>
                        </div>
                      </FieldGroup>
                    </div>
                  </>
                )}
              </div>
            </div>
          </DialogBody>
        </div>
      </DialogContent>
    </Dialog>
  )
}
