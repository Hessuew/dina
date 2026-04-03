import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
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
import { requestPasswordResetFn } from '@/routes/forgot-password'

interface ForgotPasswordFormProps extends React.ComponentProps<typeof Card> {}

export function ForgotPasswordForm({ ...props }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [requestSent, setRequestSent] = useState(false)

  const resetMutation = useMutation<
    { data: { email: string } },
    { success: boolean; message: string }
  >({
    fn: useServerFn(requestPasswordResetFn),
    onSuccess: (ctx) => {
      if (ctx.data.success) {
        setRequestSent(true)
        setResendCooldown(60)
        toast.success('Reset link sent!', {
          description: ctx.data.message,
          duration: 6000,
        })
      } else {
        toast.error(ctx.data.message)
      }
    },
  })

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown} seconds before trying again`)
      return
    }

    const formData = new FormData(e.target as HTMLFormElement)
    const emailValue = formData.get('email') as string

    resetMutation.mutate({
      data: {
        email: emailValue,
      },
    })
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your
          password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={resetMutation.status === 'pending'}
              />
              {requestSent && (
                <FieldDescription className="text-green-600">
                  ✓ If an account exists with this email, you&apos;ll receive a
                  password reset link shortly.
                </FieldDescription>
              )}
            </Field>
            <Field>
              <Button
                type="submit"
                disabled={
                  resetMutation.status === 'pending' || resendCooldown > 0
                }
                className="w-full"
              >
                {resetMutation.status === 'pending' ? (
                  'Sending...'
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCwIcon className="mr-2 h-4 w-4" />
                    Resend in {resendCooldown}s
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
              <FieldDescription className="text-center">
                Remember your password?{' '}
                <Link to="/login" className="underline">
                  Back to login
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
