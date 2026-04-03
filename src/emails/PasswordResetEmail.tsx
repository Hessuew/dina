import { Link, Section, Text } from '@react-email/components'
import { BaseEmail } from './BaseEmail'

interface PasswordResetEmailProps {
  resetLink: string
  expiryMinutes?: number
}

export function PasswordResetEmail({
  resetLink,
  expiryMinutes = 10,
}: PasswordResetEmailProps) {
  return (
    <BaseEmail preview="Reset your password" heading="Reset Your Password">
      <Text style={paragraph}>
        We received a request to reset your password. Click the button below to
        create a new password:
      </Text>

      <Section style={buttonContainer}>
        <Link href={resetLink} style={button}>
          Reset Password
        </Link>
      </Section>

      <Text style={paragraph}>
        Or copy and paste this link into your browser:
      </Text>

      <Text style={linkText}>{resetLink}</Text>

      <Text style={paragraph}>
        This link will expire in <strong>{expiryMinutes} minutes</strong> for
        security reasons.
      </Text>

      <Text style={warningText}>
        ⚠️ If you didn't request a password reset, please ignore this email.
        Your password will remain unchanged.
      </Text>
    </BaseEmail>
  )
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  marginBottom: '16px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const linkText = {
  color: '#2563eb',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
  backgroundColor: '#f8f9fa',
  padding: '12px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  marginBottom: '16px',
}

const warningText = {
  color: '#dc2626',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '24px',
  padding: '12px',
  backgroundColor: '#fef2f2',
  borderRadius: '4px',
  borderLeft: '4px solid #dc2626',
}
