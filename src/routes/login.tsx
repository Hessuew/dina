import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/components/auth/login-form'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { verified?: boolean } => {
    return {
      verified: search.verified === true || search.verified === 'true',
    }
  },
  component: LoginComp,
})

function LoginComp() {
  const { verified } = Route.useSearch()

  return <LoginForm verified={verified} />
}
