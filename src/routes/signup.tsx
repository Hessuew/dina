import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignupForm } from '@/components/auth/signup-form/signup-form'

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
