import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseEmail } from './BaseEmail'

interface InvitationEmailProps {
  invitedByName: string
  role: 'student' | 'teacher'
  inviteLink: string
}

export function InvitationEmail({
  invitedByName,
  role,
  inviteLink,
}: InvitationEmailProps) {
  return (
    <BaseEmail
      preview={`You've been invited to join as a ${role}`}
      heading="You've Been Invited!"
    >
      <Text style={paragraph}>
        <strong>{invitedByName}</strong> has invited you to join our Learning
        Platform as a <strong>{role}</strong>.
      </Text>

      <Text style={paragraph}>
        To complete your registration and get started, click the button below:
      </Text>

      <Button style={button} href={inviteLink}>
        Complete Registration
      </Button>

      <Text style={linkText}>
        Or copy and paste this link into your browser:
      </Text>
      <Text style={linkUrl}>{inviteLink}</Text>

      <Text style={noteText}>
        This invitation link is unique to you and can only be used once.
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
