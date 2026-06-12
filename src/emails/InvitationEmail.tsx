import { Link, Section, Text } from '@react-email/components'
import { BaseEmail } from './BaseEmail'
import {
  alternativeText,
  button,
  buttonContainer,
  linkText,
  paragraph,
  strongText,
} from './styles'

interface InvitationEmailProps {
  invitedByName: string
  inviteLink: string
  lecturerTitle?: string | null
  role: 'student' | 'teacher'
}

export function InvitationEmail({
  invitedByName,
  inviteLink,
  lecturerTitle,
  role,
}: InvitationEmailProps) {
  const roleLabel = role === 'teacher' ? 'Lecturer' : 'Student'

  return (
    <BaseEmail
      preview={`You've been invited to join DINA as a ${roleLabel}`}
      heading="You've Been Invited"
    >
      <Section style={inviterBox}>
        <Text style={inviterLabel}>Invited by</Text>
        <Text style={inviterName}>{invitedByName}</Text>
        <Text style={inviterRole}>{lecturerTitle ?? 'Staff'}</Text>
      </Section>

      <Text style={paragraph}>
        You have been invited to join the Disciplers of Nations Academy as a{' '}
        <strong style={strongText}>{roleLabel}</strong>. We are delighted to
        welcome you to our formation community.
      </Text>

      <Text style={paragraph}>
        To complete your registration and begin your journey, click the button
        below:
      </Text>

      <Section style={buttonContainer}>
        <Link href={inviteLink} style={button}>
          Complete Registration
        </Link>
      </Section>

      <Text style={alternativeText}>
        Or copy and paste this link into your browser:
      </Text>

      <Text style={linkText}>{inviteLink}</Text>

      <Text style={noteText}>
        This invitation link is unique to you and can only be used once.
      </Text>
    </BaseEmail>
  )
}

const inviterBox = {
  backgroundColor: 'rgba(197,160,89,0.08)',
  border: '1px solid rgba(197,160,89,0.25)',
  padding: '20px',
  margin: '0 0 32px 0',
  textAlign: 'center' as const,
}

const inviterLabel = {
  color: '#9B7A41',
  fontSize: '11px',
  fontWeight: '500',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px 0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const inviterName = {
  color: '#1C1815',
  fontSize: '20px',
  fontWeight: '400',
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  margin: '0',
  letterSpacing: '-0.01em',
}

const inviterRole = {
  color: '#9B7A41',
  fontSize: '13px',
  fontWeight: '500',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  margin: '4px 0 0 0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const noteText = {
  color: '#5E5549',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
  fontStyle: 'italic',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
