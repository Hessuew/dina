import { createFileRoute } from '@tanstack/react-router'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export { requestPasswordResetFn } from '@/utils/password-reset'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordComp,
})

function ForgotPasswordComp() {
  return <ForgotPasswordForm />
}
