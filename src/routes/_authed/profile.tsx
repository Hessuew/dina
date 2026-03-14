import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { UploadIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useMutation } from '@/hooks/useMutation'
import { getCurrentUser, getUserProfile } from '@/utils/auth'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { getSupabaseServerClient } from '@/utils/supabase'

const getMyProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getCurrentUser()
  const profile = await getUserProfile(user.id)
  return profile
})

const updateProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { fullName: string }) => d)
  .handler(async ({ data }) => {
    const { eq } = await import('drizzle-orm')
    const user = await getCurrentUser()

    await db
      .update(profiles)
      .set({
        fullName: data.fullName,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id))

    return { success: true }
  })

const uploadAvatarFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      fileData: string
      fileName: string
      fileType: string
      fileSize: number
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const { eq } = await import('drizzle-orm')
      const user = await getCurrentUser()
      const supabase = getSupabaseServerClient()

      // Validate file
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (data.fileSize > maxSize) {
        return {
          error: true,
          message: 'File size must be less than 2MB',
        }
      }

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ]
      if (!allowedTypes.includes(data.fileType)) {
        return {
          error: true,
          message: 'Only JPEG, PNG, WebP, and GIF images are allowed',
        }
      }

      // Get current profile to find old avatar
      const currentProfile = await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
      })

      // Delete old avatar if exists
      if (currentProfile?.avatarUrl) {
        const oldPath = currentProfile.avatarUrl.split('/').pop()
        if (oldPath && oldPath.startsWith(user.id)) {
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([oldPath])
          if (deleteError) {
            console.log('⚠️ Failed to delete old avatar', {
              error: deleteError,
            })
          }
        }
      }

      // Generate unique filename
      const fileExt = data.fileName.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      // Convert base64 to buffer
      const base64Data = data.fileData.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, buffer, {
          contentType: data.fileType,
          upsert: false,
        })

      if (uploadError) {
        return {
          error: true,
          message: uploadError.message,
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with new avatar URL
      await db
        .update(profiles)
        .set({
          avatarUrl: urlData.publicUrl,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, user.id))

      return {
        success: true,
        avatarUrl: urlData.publicUrl,
      }
    } catch (error) {
      console.error('❌ Unexpected error in uploadAvatar:', error)
      return {
        error: true,
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      }
    }
  })

const updatePasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { newPassword: string }) => d)
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

export const Route = createFileRoute('/_authed/profile')({
  loader: async () => {
    const profile = await getMyProfile()
    return { profile }
  },
  component: ProfileComponent,
})

function ProfileComponent() {
  const { profile } = Route.useLoaderData()
  const router = useRouter()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = profile.fullName
    ? profile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile.email.slice(0, 2).toUpperCase()

  const updateProfileMutation = useMutation({
    fn: updateProfileFn,
    onSuccess: async (ctx) => {
      if ('success' in ctx.data) {
        toast.success('Profile updated successfully')
        // Invalidate the current route to refresh data
        await router.invalidate()
      }
    },
  })

  const uploadAvatarMutation = useMutation({
    fn: uploadAvatarFn,
    onSuccess: async (ctx) => {
      if ('error' in ctx.data && ctx.data.error) {
        toast.error(ctx.data.message || 'Failed to upload avatar')
      } else if ('success' in ctx.data) {
        toast.success('Avatar uploaded successfully')
        // Invalidate the current route to refresh data
        await router.invalidate()
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
      },
    })
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Convert file to base64
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

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    reader.readAsDataURL(file)
  }

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    console.log(1)
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    console.log(2)
    updatePasswordMutation.mutate({
      data: {
        newPassword,
      },
    })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">My Profile</h1>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-6">
                <Avatar className="size-24">
                  <AvatarImage src={profile.avatarUrl || undefined} />
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
                      defaultValue={profile.email}
                      disabled
                    />
                    <FieldDescription>Email cannot be changed</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      defaultValue={profile.fullName}
                      required
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
                    <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
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
    </div>
  )
}
