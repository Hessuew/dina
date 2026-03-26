import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { invitations, profiles } from '@/db/schema'
import { env } from '@/env'
import { getSupabaseServerClient } from '@/utils/supabase'
import { SignupForm } from '@/components/signup-form'

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      email: string
      password: string
      fullName?: string
      redirectUrl?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    // Supabase handles invite validation via the magic link
    // User can only reach this page if they clicked the invite link
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${env.APP_URL || 'http://localhost:3000'}/dashboard`,
      },
    })

    if (error) {
      return {
        error: true,
        message: error.message,
      }
    }

    // Get role from user metadata (set during invite)
    const userRole = authData.user?.user_metadata.role || 'student'

    // Create user profile in database
    if (authData.user) {
      await db.insert(profiles).values({
        id: authData.user.id,
        email: authData.user.email!,
        fullName: data.fullName || authData.user.email!.split('@')[0],
        role: userRole,
      })

      // Mark invitation as accepted if exists
      const invitation = await db.query.invitations.findFirst({
        where: eq(invitations.email, authData.user.email!),
      })

      if (invitation && invitation.status === 'pending') {
        await db
          .update(invitations)
          .set({
            status: 'accepted',
            acceptedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(invitations.id, invitation.id))
      }
    }

    // Redirect to dashboard after successful signup
    throw redirect({
      href: data.redirectUrl || '/dashboard',
    })
  })

export const Route = createFileRoute('/signup')({
  component: SignupComp,
})

function SignupComp() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  )
}
