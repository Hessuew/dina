import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Loader2 } from 'lucide-react'
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
import { resetPasswordFn, validateResetTokenFn } from '@/routes/reset-password'
import { calculatePasswordStrength } from '@/utils/password'

interface ResetPasswordFormProps extends React.ComponentProps<typeof Card> {
  token: string
}

export function ResetPasswordForm({ token, ...props }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const router = useRouter()

  const validateTokenFn = useServerFn(validateResetTokenFn)
  const passwordStrength = calculatePasswordStrength(password || '')

  const resetMutation = useMutation<
    { data: { token: string; newPassword: string } },
    { success: boolean; message: string }
  >({
    fn: useServerFn(resetPasswordFn),
    onSuccess: async (ctx) => {
      if (ctx.data.success) {
        toast.success('Password reset successful!', {
          description: 'You can now log in with your new password.',
        })
        await router.invalidate()
        router.navigate({ to: '/login' })
      } else {
        toast.error(ctx.data.message)
      }
    },
  })

  useEffect(() => {
    if (!token) {
      setIsValidating(false)
      setTokenError('No reset token provided')
      return
    }

    validateTokenFn({ data: { token } })
      .then((result: { valid: boolean; message: string }) => {
        if (result.valid) {
          setTokenValid(true)
          setTokenError(null)
        } else {
          setTokenValid(false)
          setTokenError(result.message)
        }
      })
      .catch(() => {
        setTokenValid(false)
        setTokenError('Failed to validate reset token')
      })
      .finally(() => {
        setIsValidating(false)
      })
  }, [token, validateTokenFn])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.target as HTMLFormElement)
    const passwordValue = formData.get('password') as string
    const confirmPassword = formData.get('confirm-password') as string

    if (passwordValue !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (passwordValue.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    resetMutation.mutate({
      data: {
        token,
        newPassword: passwordValue,
      },
    })
  }

  if (isValidating) {
    return (
      <Card {...props}>
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Validating reset token...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!tokenValid || tokenError) {
    return (
      <Card {...props}>
        <CardHeader>
          <CardTitle>Invalid Reset Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {tokenError || 'The reset link is invalid or has expired.'}
            </div>
            <div className="flex flex-col gap-2">
              <Link to="/forgot-password">
                <Button className="w-full">Request New Reset Link</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">New Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={resetMutation.status === 'pending'}
              />
              <div className="mt-2">
                <div className="mb-1 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{
                        width: `${(passwordStrength.score / 4) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {passwordStrength.label}
                  </span>
                </div>
                {passwordStrength.suggestions.length > 0 && (
                  <ul className="space-y-0.5 text-xs text-gray-600">
                    {passwordStrength.suggestions.map((suggestion, i) => (
                      <li key={i}>• {suggestion}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm New Password
              </FieldLabel>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                disabled={resetMutation.status === 'pending'}
              />
              <FieldDescription>
                Please confirm your new password.
              </FieldDescription>
            </Field>
            <Field>
              <Button
                type="submit"
                disabled={resetMutation.status === 'pending'}
                className="w-full"
              >
                {resetMutation.status === 'pending'
                  ? 'Resetting Password...'
                  : 'Reset Password'}
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
