import { createServerFn } from '@tanstack/react-start'
import { UploadIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { eq } from 'drizzle-orm'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
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
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth'
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
        return {
          error: true,
          message: error.message,
        }
      }
    }

    await db
      .update(profiles)
      .set({
        fullName: data.fullName,
        email: data.email,
        bio: data.bio,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id))

    return { success: true }
  })

const updatePasswordFn = createServerFn({ method: 'POST' })
  .inputValidator(updatePasswordSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    })

    if (error) {
      return {
        error: true,
        message: error.message,
      }
    }

    return { success: true }
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
    onSuccess: (ctx) => {
      if ('error' in ctx.data && ctx.data.error) {
        toast.error(ctx.data.message || 'Failed to update profile')
      } else if ('success' in ctx.data) {
        toast.success('Profile updated successfully')
        onProfileUpdate?.()
      }
    },
  })

  const uploadAvatarMutation = useMutation({
    fn: uploadAvatarFn,
    onSuccess: (ctx) => {
      if ('error' in ctx.data && ctx.data.error) {
        toast.error(ctx.data.message || 'Failed to upload avatar')
      } else if ('success' in ctx.data) {
        toast.success('Avatar uploaded successfully')
        onProfileUpdate?.()
      }
    },
  })

  const updatePasswordMutation = useMutation({
    fn: updatePasswordFn,
    onSuccess: (ctx) => {
      if ('error' in ctx.data && ctx.data.error) {
        toast.error(ctx.data.message || 'Failed to update password')
      } else if ('success' in ctx.data) {
        toast.success('Password changed successfully')
        setShowPasswordForm(false)
      }
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile Information</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Update your profile information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-6">
                  <Avatar className="size-24">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
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
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadAvatarMutation.status === 'pending'}
                    >
                      <UploadIcon className="size-4" />
                      {uploadAvatarMutation.status === 'pending'
                        ? 'Uploading...'
                        : 'Change Avatar'}
                    </Button>
                    <p className="text-muted-foreground text-xs">
                      JPG, PNG, WebP or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={user.email}
                        required
                      />
                      <FieldDescription>
                        Changing your email will require verification
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        defaultValue={user.fullName}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="bio">Bio</FieldLabel>
                      <Textarea
                        id="bio"
                        name="bio"
                        placeholder="Tell us about yourself..."
                        defaultValue={user.bio || ''}
                        rows={4}
                      />
                    </Field>
                    <Field>
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.status === 'pending'}
                      >
                        {updateProfileMutation.status === 'pending'
                          ? 'Saving...'
                          : 'Save Changes'}
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showPasswordForm ? (
                <Button onClick={() => setShowPasswordForm(true)}>
                  Change Password
                </Button>
              ) : (
                <form onSubmit={handlePasswordSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="newPassword">
                        New Password
                      </FieldLabel>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="confirmPassword">
                        Confirm New Password
                      </FieldLabel>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                      />
                    </Field>
                    <Field>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={updatePasswordMutation.status === 'pending'}
                        >
                          {updatePasswordMutation.status === 'pending'
                            ? 'Updating...'
                            : 'Update Password'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowPasswordForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </Field>
                  </FieldGroup>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
