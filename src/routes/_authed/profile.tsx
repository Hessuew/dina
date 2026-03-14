import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
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
import { getSupabaseServerClient } from '@/utils/supabase'

const getMyProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const { getUserProfile } = await import('@/utils/auth')
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const profile = await getUserProfile(user.id)
  return profile
})

const updateProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { fullName: string; avatarUrl: string }) => d)
  .handler(async ({ data }) => {
    const { db } = await import('@/db')
    const { profiles } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    const supabase = getSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    await db
      .update(profiles)
      .set({
        fullName: data.fullName,
        avatarUrl: data.avatarUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id))

    return { success: true }
  })

const updatePasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { currentPassword: string; newPassword: string }) => d)
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

  const updateProfileMutation = useMutation({
    fn: updateProfileFn,
    onSuccess: async (ctx) => {
      if (ctx.data && 'success' in ctx.data && ctx.data.success) {
        await router.invalidate()
      }
    },
  })

  const updatePasswordMutation = useMutation({
    fn: updatePasswordFn,
    onSuccess: (ctx) => {
      if (ctx.data && 'success' in ctx.data && ctx.data.success) {
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
        avatarUrl: formData.get('avatarUrl') as string,
      },
    })
  }

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      return
    }

    updatePasswordMutation.mutate({
      data: {
        currentPassword: formData.get('currentPassword') as string,
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
                  <FieldLabel htmlFor="avatarUrl">Avatar URL</FieldLabel>
                  <Input
                    id="avatarUrl"
                    name="avatarUrl"
                    type="url"
                    defaultValue={profile.avatarUrl || ''}
                    placeholder="https://example.com/avatar.jpg"
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
                  {updateProfileMutation.data?.success && (
                    <FieldDescription className="text-green-600">
                      Profile updated successfully!
                    </FieldDescription>
                  )}
                </Field>
              </FieldGroup>
            </form>
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
                    <FieldLabel htmlFor="currentPassword">
                      Current Password
                    </FieldLabel>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      required
                    />
                  </Field>
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
                    {updatePasswordMutation.data?.error && (
                      <FieldDescription className="text-red-600">
                        {updatePasswordMutation.data.message}
                      </FieldDescription>
                    )}
                    {updatePasswordMutation.data?.success && (
                      <FieldDescription className="text-green-600">
                        Password updated successfully!
                      </FieldDescription>
                    )}
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
