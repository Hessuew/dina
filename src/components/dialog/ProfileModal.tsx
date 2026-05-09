import { createServerFn } from '@tanstack/react-start'
import { UploadIcon, XIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { eq } from 'drizzle-orm'
import { AppError, toUserError } from '@/utils/errors'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useMutation } from '@/hooks/useMutation'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { uploadAvatarFn } from '@/utils/imageUpload'
import { getSupabaseServerClient } from '@/utils/supabase'
import {
  updatePasswordSchema,
  updateProfileSchema,
} from '@/schemas/profile.schema'

const updateProfileFn = createServerFn({ method: 'POST' })
  .inputValidator(updateProfileSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const supabase = getSupabaseServerClient()

    if (data.email !== user.email) {
      const { error } = await supabase.auth.updateUser({
        email: data.email,
      })

      if (error) {
        throw new AppError({
          code: 'EMAIL_UPDATE_FAILED',
          status: 400,
          userMessage: error.message,
          internalMessage: `Supabase auth error: ${error.message}`,
        })
      }
    }
    const db = await getDb()

    await db
      .update(profiles)
      .set({
        fullName: data.fullName,
        email: data.email,
        bio: data.bio,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id))
  })

const updatePasswordFn = createServerFn({ method: 'POST' })
  .inputValidator(updatePasswordSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    })

    if (error) {
      throw new AppError({
        code: 'PASSWORD_UPDATE_FAILED',
        status: 400,
        userMessage: error.message,
        internalMessage: `Supabase auth error: ${error.message}`,
      })
    }
  })

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

export function ProfileModal({
  open,
  onOpenChange,
  user,
  onProfileUpdate,
}: ProfileModalProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email.slice(0, 2).toUpperCase()

  const updateProfileMutation = useMutation({
    fn: updateProfileFn,
    onSuccess: () => {
      toast.success('Profile updated successfully')
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
    },
    onError: (error) => {
      toast.error(toUserError(error).message)
    },
  })

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    updateProfileMutation.mutate({
      data: {
        fullName: formData.get('fullName') as string,
        email: formData.get('email') as string,
        bio: formData.get('bio') as string,
      },
    })
  }

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

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    updatePasswordMutation.mutate({
      data: {
        newPassword,
      },
    })
  }

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
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-px w-8 bg-[#C5A059]/40" />
                  <span className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                    Profile
                  </span>
                </div>

                <div className="mb-6 flex items-center gap-5">
                  <div className="shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName || user.email}
                        className="size-16 border border-white/10 object-cover"
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
                      disabled={uploadAvatarMutation.status === 'pending'}
                    >
                      <UploadIcon className="size-3.5" />
                      {uploadAvatarMutation.status === 'pending'
                        ? 'Uploading...'
                        : 'Change Avatar'}
                    </Button>
                    <p className="text-[0.68rem] text-[#8E816D]">
                      JPG, PNG, WebP or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit}>
                  <FieldGroup className="gap-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel
                          htmlFor="email"
                          className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                        >
                          Email
                        </FieldLabel>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          defaultValue={user.email}
                          required
                          className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                        />
                        <FieldDescription className="text-[#8E816D]">
                          Changing your email will require verification
                        </FieldDescription>
                      </Field>
                      <Field>
                        <FieldLabel
                          htmlFor="fullName"
                          className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                        >
                          Full Name
                        </FieldLabel>
                        <Input
                          id="fullName"
                          name="fullName"
                          type="text"
                          defaultValue={user.fullName}
                          required
                          className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel
                        htmlFor="bio"
                        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                      >
                        Bio
                      </FieldLabel>
                      <Textarea
                        id="bio"
                        name="bio"
                        placeholder="Tell us about yourself..."
                        defaultValue={user.bio || ''}
                        rows={8}
                        className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                      />
                    </Field>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        theme="dark"
                        disabled={updateProfileMutation.status === 'pending'}
                      >
                        {updateProfileMutation.status === 'pending'
                          ? 'Saving...'
                          : 'Save Changes'}
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
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
                <form onSubmit={handlePasswordSubmit}>
                  <FieldGroup className="gap-5">
                    <Field>
                      <FieldLabel
                        htmlFor="newPassword"
                        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                      >
                        New Password
                      </FieldLabel>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        required
                        className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                      />
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor="confirmPassword"
                        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                      >
                        Confirm New Password
                      </FieldLabel>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                      />
                    </Field>
                    <div className="flex items-center gap-3">
                      <Button
                        type="submit"
                        theme="dark"
                        disabled={updatePasswordMutation.status === 'pending'}
                      >
                        {updatePasswordMutation.status === 'pending'
                          ? 'Updating...'
                          : 'Update Password'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        theme="dark"
                        onClick={() => setShowPasswordForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              )}
            </div>
          </DialogBody>
        </div>
      </DialogContent>
    </Dialog>
  )
}
