import { createFileRoute } from '@tanstack/react-router'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
export { resetPasswordFn, validateResetTokenFn } from '@/utils/password-reset'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || '',
    }
  },
  component: ResetPasswordComp,
})

function ResetPasswordComp() {
  const { token } = Route.useSearch()

  return <ResetPasswordForm token={token} />
}
