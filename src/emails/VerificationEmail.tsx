import { Button, Text } from '@react-email/components'
import { BaseEmail } from './BaseEmail'

interface VerificationEmailProps {
  verificationLink: string
}

export function VerificationEmail({
  verificationLink,
}: VerificationEmailProps) {
  return (
    <BaseEmail
      preview="Verify your email address"
      heading="Verify Your Email"
    >
      <Text style={paragraph}>
        Thank you for creating an account! To complete your registration and
        access your account, please verify your email address.
      </Text>

      <Text style={paragraph}>
        Click the button below to verify your email:
      </Text>

      <Button style={button} href={verificationLink}>
        Verify Email Address
      </Button>

      <Text style={linkText}>
        Or copy and paste this link into your browser:
      </Text>
      <Text style={linkUrl}>{verificationLink}</Text>

      <Text style={noteText}>
        This link will expire in 24 hours for security reasons.
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

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 32px',
  margin: '32px 0',
}

const linkText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '24px',
  marginBottom: '8px',
}

const linkUrl = {
  color: '#2563eb',
  fontSize: '14px',
  lineHeight: '20px',
  wordBreak: 'break-all' as const,
  backgroundColor: '#f8f9fa',
  padding: '12px',
  borderRadius: '4px',
}

const noteText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '24px',
  fontStyle: 'italic',
}
