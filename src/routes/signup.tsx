import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignupForm } from '@/components/auth/signup-form'

export { resendOtpFn, signupFn, verifyOtpFn } from '@/utils/signup'

export const Route = createFileRoute('/signup')({
  beforeLoad: ({ search }) => {
    if (!search.token) {
      throw redirect({
        to: '/login',
      })
    }
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || '',
    }
  },
  component: SignupComp,
})

function SignupComp() {
  const { token } = Route.useSearch()

  return <SignupForm token={token} />
}
