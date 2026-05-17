import { UploadIcon, XIcon } from 'lucide-react'
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
        toast.success('Profile updated. Check your inbox to verify your new email.')
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
      return
    }
    profileForm.reset(getProfileInitialValues(user))
    passwordForm.reset(emptyPasswordForm)
  }, [open, user, profileForm, passwordForm])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-2xl"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Dialog header */}
          <DialogHeader>
            <div className="mb-1 flex items-start justify-between">
              <div>
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Account
                </div>
              </div>
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
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
              Profile Information
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            {/* Profile section */}

            {!showPasswordForm && (
              <div className="mt-8">
                <div className="mb-6 flex items-start gap-5">
                  <div className="shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName || user.email}
                        className="size-32 border border-white/10 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex size-16 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] font-serif text-xl text-[#E9D9B4]">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      theme="dark"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadAvatarMutation.isPending}
                    >
                      <UploadIcon className="size-3.5" />
                      {uploadAvatarMutation.isPending
                        ? 'Uploading...'
                        : 'Change Avatar'}
                    </Button>
                    <p className="text-[0.68rem] text-[#8E816D]">
                      JPG, PNG, WebP or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                <FieldGroup className="gap-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <profileForm.AppField
                      name="email"
                      validators={{ onSubmit: updateProfileSchema.shape.email }}
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
                        rows={8}
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
            )}

            {/* Password section */}
            <div className="mt-10 border-t border-white/8 pt-8">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <span className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Security
                </span>
              </div>

              {!showPasswordForm ? (
                <Button
                  type="button"
                  variant="outline"
                  theme="dark"
                  onClick={() => setShowPasswordForm(true)}
                >
                  Change Password
                </Button>
              ) : (
                <FieldGroup className="gap-5">
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
                  <div className="flex items-center gap-3">
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
                    <Button
                      type="button"
                      variant="ghost"
                      theme="dark"
                      onClick={() => {
                        setShowPasswordForm(false)
                        passwordForm.reset(emptyPasswordForm)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </FieldGroup>
              )}
            </div>
          </DialogBody>
        </div>
      </DialogContent>
    </Dialog>
  )
}
