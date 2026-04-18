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

      <Text style={alternativeText}>
        Or copy and paste this link into your browser:
      </Text>

      <Text style={linkText}>{resetLink}</Text>

      <Section style={infoBox}>
        <Text style={infoLabel}>Security Notice</Text>
        <Text style={infoText}>
          This link will expire in{' '}
          <strong style={strongText}>{expiryMinutes} minutes</strong> for your
          security.
        </Text>
      </Section>
    </BaseEmail>
  )
}

const paragraph = {
  color: '#4E463D',
  fontSize: '16px',
  lineHeight: '28px',
  textAlign: 'left' as const,
  margin: '0 0 24px 0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  letterSpacing: '0.01em',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#1A1716',
  border: '1px solid rgba(197,160,89,0.6)',
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: '400',
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  letterSpacing: '0.08em',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 40px',
  boxShadow: '0 12px 24px -12px rgba(0,0,0,0.3)',
}

const alternativeText = {
  color: '#5E5549',
  fontSize: '14px',
  lineHeight: '22px',
  textAlign: 'center' as const,
  margin: '24px 0 12px 0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const linkText = {
  color: '#6e562d',
  fontSize: '13px',
  lineHeight: '20px',
  wordBreak: 'break-all' as const,
  backgroundColor: '#F8F4EC',
  border: '1px solid rgba(197,160,89,0.2)',
  padding: '16px',
  fontFamily: 'monospace',
  margin: '0 0 24px 0',
  display: 'block',
}

const infoBox = {
  backgroundColor: 'rgba(197,160,89,0.08)',
  border: '1px solid rgba(197,160,89,0.25)',
  padding: '20px',
  margin: '0 0 24px 0',
}

const infoLabel = {
  color: '#9B7A41',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px 0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const infoText = {
  color: '#4E463D',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const strongText = {
  color: '#1C1815',
  fontWeight: '500',
}
