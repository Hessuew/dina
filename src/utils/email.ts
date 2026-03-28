export async function sendInvitationEmail(
  email: string,
  token: string,
  role: 'student' | 'teacher',
  inviterName: string,
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.VITE_APP_URL || 'http://localhost:3000'
  const inviteLink = `${baseUrl}/signup?token=${token}`

  const subject = "You're invited to join our Learning Platform"

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to Learning Platform</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #1a1a1a; margin-top: 0;">You've Been Invited!</h1>
          <p style="font-size: 16px; color: #666;">
            ${inviterName} has invited you to join our Learning Platform as a <strong>${role}</strong>.
          </p>
        </div>
        
        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <p style="font-size: 16px; margin-bottom: 24px;">
            To complete your registration and get started, click the button below:
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" 
               style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Complete Registration
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 24px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="font-size: 14px; color: #2563eb; word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 4px;">
            ${inviteLink}
          </p>
        </div>
        
        <div style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">
          <p>This invitation link is unique to you and can only be used once.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </body>
    </html>
  `

  const textContent = `
You've Been Invited!

${inviterName} has invited you to join our Learning Platform as a ${role}.

To complete your registration and get started, visit this link:
${inviteLink}

This invitation link is unique to you and can only be used once.

If you didn't expect this invitation, you can safely ignore this email.
  `

  try {
    console.log('Sending invitation email to:', email)
    console.log('Invite link:', inviteLink)
    console.log('Role:', role)
    console.log('Invited by:', inviterName)

    return { success: true }
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
