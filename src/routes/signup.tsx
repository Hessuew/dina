import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/utils/supabase'
import { db } from '@/db'
import { profiles } from '@/db/schema'
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

    // Sign up the user with Supabase Auth
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return {
        error: true,
        message: error.message,
      }
    }

    // Create user profile in database
    if (authData.user) {
      await db.insert(profiles).values({
        id: authData.user.id,
        email: authData.user.email!,
        fullName: data.fullName || authData.user.email!.split('@')[0],
        role: 'student', // Default role
      })
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
