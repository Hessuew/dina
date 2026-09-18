import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from 'test/integration/db'
import type { EmailSender, InvitationEmailMessage } from '@/utils/email/types'
import type { AuthorizationService } from '@/utils/authz/types'
import {
  DefaultAuthorizationService,
  setAuthorizationService,
} from '@/utils/authz'
import {
  seedEnrollment,
  seedInvitation,
  seedProfile,
} from '@/../test/integration/seed'
import { emailCampaignLocks, emailMessages, enrollments } from '@/db/schema'
import { setEmailSender } from '@/utils/email'
import {
  getEmailCampaignLocksService,
  previewEmailCampaignService,
  releaseEmailCampaignService,
  sendEmailCampaignService,
} from '@/utils/email/service/email-campaign.service'
import { findInvitationByEmail } from '@/utils/repository'
import { AuthorizationError } from '@/utils/errors'
import * as sharedRepository from '@/utils/repository'
import { withObservabilityRequest } from '@/utils/observability/request-context'

afterEach(() => {
  vi.restoreAllMocks()
  setAuthorizationService(new DefaultAuthorizationService())
})

function installFakeSender(failFor: Array<string> = []) {
  const calls: Array<InvitationEmailMessage> = []
  const sender: EmailSender = {
    send: async (message) => {
      await Promise.resolve()
      if (message.type !== 'invitation')
        throw new Error('Unexpected email type')
      calls.push(message)
      if (failFor.includes(message.to)) {
        throw new Error('provider rejected email')
      }
      return { providerMessageId: `email.${calls.length}` }
    },
  }
  setEmailSender(sender)
  return calls
}

async function previewThenSend(userId: string) {
  await previewEmailCampaignService({ campaign: 'invitation' }, userId)
  return sendEmailCampaignService({ campaign: 'invitation' }, userId)
}

async function findLogRows(enrollmentId: string) {
  const db = await getDb()
  return db
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.enrollmentId, enrollmentId))
}

async function findLockRows() {
  const db = await getDb()
  return db
    .select()
    .from(emailCampaignLocks)
    .where(eq(emailCampaignLocks.campaign, 'invitation'))
}

describe('previewEmailCampaignService (integration)', () => {
  beforeEach(() => {
    installFakeSender()
  })

  it('requires admin role', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    await expect(
      previewEmailCampaignService({ campaign: 'invitation' }, teacherId),
    ).rejects.toThrow(AuthorizationError)
  })

  it('reports approved applicants and logs safe preview telemetry', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const enrollmentId = await seedEnrollment({ status: 'approved' })
    await seedEnrollment({ status: 'pending' })
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    try {
      const preview = await previewEmailCampaignService(
        { campaign: 'invitation' },
        adminId,
      )

      expect(preview).toEqual({
        toSend: 1,
        skipped: { linkStillValid: 0, revoked: 0, overCap: 0 },
      })
      expect(calls).toEqual([])
      expect(await findLogRows(enrollmentId)).toHaveLength(0)
      expect(
        infoSpy.mock.calls.map(([line]) => JSON.parse(String(line))),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: 'email_campaign_previewed',
            path: 'serverFn:preview_email_campaign',
            campaign: 'invitation',
            userId: adminId,
            toSend: 1,
            skippedLinkStillValid: 0,
            skippedRevoked: 0,
            skippedOverCap: 0,
            status: 'success',
          }),
        ]),
      )
    } finally {
      infoSpy.mockRestore()
    }
  })

  it('categorizes preview planning failures without raw repository details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const planningError = new Error('private email recipient database detail')
    vi.spyOn(sharedRepository, 'findApprovedEnrollments').mockRejectedValueOnce(
      planningError,
    )

    try {
      await expect(
        previewEmailCampaignService({ campaign: 'invitation' }, adminId),
      ).rejects.toBe(planningError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'email_campaign_preview_failed')
      expect(event).toMatchObject({
        event: 'email_campaign_preview_failed',
        path: 'serverFn:preview_email_campaign',
        campaign: 'invitation',
        userId: adminId,
        errorCategory: 'campaign_preview_persistence',
        status: 'failure',
      })
      expect(serialized.join('\n')).not.toContain(
        'private email recipient database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })
})

describe('sendEmailCampaignService (integration)', () => {
  beforeEach(() => {
    installFakeSender()
  })

  it('requires admin role', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    await expect(
      sendEmailCampaignService({ campaign: 'invitation' }, teacherId),
    ).rejects.toThrow(AuthorizationError)
  })

  it('categorizes sender profile lookup failures without raw repository details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    await previewEmailCampaignService({ campaign: 'invitation' }, adminId)
    const profileError = new Error('private campaign sender profile detail')
    vi.spyOn(sharedRepository, 'findProfileById').mockRejectedValueOnce(
      profileError,
    )

    try {
      await expect(
        sendEmailCampaignService({ campaign: 'invitation' }, adminId),
      ).rejects.toBe(profileError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'email_campaign_send_failed')
      expect(event).toMatchObject({
        event: 'email_campaign_send_failed',
        path: 'serverFn:send_email_campaign',
        campaign: 'invitation',
        userId: adminId,
        errorCategory: 'campaign_sender_profile_read',
        status: 'failure',
      })
      expect(serialized.join('\n')).not.toContain(
        'private campaign sender profile detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('categorizes send planning failures without raw repository details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    await previewEmailCampaignService({ campaign: 'invitation' }, adminId)
    const planningError = new Error('private send planning database detail')
    vi.spyOn(sharedRepository, 'findApprovedEnrollments').mockRejectedValueOnce(
      planningError,
    )

    try {
      await expect(
        sendEmailCampaignService({ campaign: 'invitation' }, adminId),
      ).rejects.toBe(planningError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'email_campaign_send_failed')
      expect(event).toMatchObject({
        event: 'email_campaign_send_failed',
        path: 'serverFn:send_email_campaign',
        campaign: 'invitation',
        userId: adminId,
        errorCategory: 'campaign_send_planning_persistence',
        status: 'failure',
      })
      expect(serialized.join('\n')).not.toContain(
        'private send planning database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('creates invitations for never-invited approved applicants and logs sent rows', async () => {
    const adminId = await seedProfile({ role: 'admin', fullName: 'Admin User' })
    const calls = installFakeSender()
    const enrollmentId = await seedEnrollment({
      status: 'approved',
      email: 'new@test.dev',
    })

    const summary = await previewThenSend(adminId)

    expect(summary).toEqual({
      sent: 1,
      failed: 0,
      skipped: { linkStillValid: 0, revoked: 0, overCap: 0 },
    })
    expect(calls[0]).toMatchObject({
      to: 'new@test.dev',
      invitedByName: 'Admin User',
      role: 'student',
    })
    expect(calls[0].inviteLink).toContain('/signup?token=')
    const invitation = await findInvitationByEmail('new@test.dev')
    expect(invitation?.status).toBe('pending')
    const db = await getDb()
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
    expect(enrollment.invitationSent).toBe(true)
    expect(enrollment.invitationId).toBe(invitation?.id)
    expect((await findLogRows(enrollmentId))[0]).toMatchObject({
      recipientEmail: 'new@test.dev',
      emailType: 'invitation',
      status: 'sent',
      providerMessageId: 'email.1',
      sentByUserId: adminId,
    })
  })

  it('skips valid pending invitations as link_still_valid', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const invitation = await seedInvitation({
      email: 'pending@test.dev',
      status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
    })
    await seedEnrollment({
      status: 'approved',
      email: invitation.email,
      invitationSent: true,
      invitationId: invitation.id,
    })

    const summary = await previewThenSend(adminId)

    expect(summary).toEqual({
      sent: 0,
      failed: 0,
      skipped: { linkStillValid: 1, revoked: 0, overCap: 0 },
    })
  })

  it('resends a valid pending invitation without rotating its token or expiry', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const expiresAt = new Date(Date.now() + 60_000)
    const invitation = await seedInvitation({
      email: 'resend-valid@test.dev',
      status: 'pending',
      token: 'existing-token',
      expiresAt,
    })
    const enrollmentId = await seedEnrollment({
      status: 'approved',
      email: invitation.email,
      invitationSent: true,
      invitationId: invitation.id,
    })

    const input = { campaign: 'invitation' as const, includeValidLinks: true }
    const preview = await previewEmailCampaignService(input, adminId)
    const summary = await sendEmailCampaignService(input, adminId)

    expect(preview.toSend).toBe(1)
    expect(summary).toMatchObject({ sent: 1, failed: 0 })
    expect(calls[0].inviteLink).toContain('token=existing-token')
    const row = await findInvitationByEmail(invitation.email)
    expect(row?.token).toBe('existing-token')
    expect(row?.expiresAt).toEqual(expiresAt)
    expect((await findLogRows(enrollmentId))[0].status).toBe('sent')
  })

  it('rotates expired pending invitations and sends', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const invitation = await seedInvitation({
      email: 'expired@test.dev',
      status: 'pending',
      token: 'old-token',
      expiresAt: new Date(Date.now() - 60_000),
    })
    const enrollmentId = await seedEnrollment({
      status: 'approved',
      email: invitation.email,
      invitationSent: true,
      invitationId: invitation.id,
    })

    const summary = await previewThenSend(adminId)

    expect(summary.sent).toBe(1)
    const row = await findInvitationByEmail(invitation.email)
    expect(row?.id).toBe(invitation.id)
    expect(row?.token).not.toBe('old-token')
    expect((await findLogRows(enrollmentId))[0].status).toBe('sent')
  })

  it('skips revoked invitations without undoing cancellation', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const invitation = await seedInvitation({
      email: 'revoked@test.dev',
      status: 'revoked',
    })
    await seedEnrollment({
      status: 'approved',
      email: invitation.email,
      invitationSent: true,
      invitationId: invitation.id,
    })

    const summary = await previewThenSend(adminId)

    expect(summary).toEqual({
      sent: 0,
      failed: 0,
      skipped: { linkStillValid: 0, revoked: 1, overCap: 0 },
    })
    expect((await findInvitationByEmail(invitation.email))?.status).toBe(
      'revoked',
    )
  })

  it('rolls back fresh invitation failure, logs failed, and continues', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    installFakeSender(['fail@test.dev'])
    const failingId = await seedEnrollment({
      status: 'approved',
      email: 'fail@test.dev',
    })
    const okId = await seedEnrollment({
      status: 'approved',
      email: 'ok@test.dev',
    })

    const summary = await previewThenSend(adminId)

    expect(summary).toMatchObject({ sent: 1, failed: 1 })
    expect(await findInvitationByEmail('fail@test.dev')).toBeUndefined()
    expect((await findInvitationByEmail('ok@test.dev'))?.status).toBe('pending')
    expect((await findLogRows(failingId))[0]).toMatchObject({
      status: 'failed',
      providerMessageId: null,
      errorMessage: 'provider rejected email',
    })
    expect((await findLogRows(okId))[0].status).toBe('sent')
  })

  it('emits a redacted structured event for provider failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const adminId = await seedProfile({ role: 'admin' })
      installFakeSender(['structured-failure@test.dev'])
      await seedEnrollment({
        status: 'approved',
        email: 'structured-failure@test.dev',
      })

      await previewThenSend(adminId)

      const event = errorSpy.mock.calls
        .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
        .find((entry) => entry.event === 'email_campaign_invitation_failed')
      expect(event).toMatchObject({
        level: 'error',
        event: 'email_campaign_invitation_failed',
        path: 'serverFn:send_email_campaign',
        status: 'failed',
        errorCategory: 'invitation_email_delivery',
        userId: adminId,
      })
      expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain(
        'provider rejected email',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('categorizes invitation persistence failures without raw repository details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const enrollmentId = await seedEnrollment({
      status: 'approved',
      email: 'persistence-failure@test.dev',
    })
    await previewEmailCampaignService({ campaign: 'invitation' }, adminId)
    const invitationError = new Error('private invitation database detail')
    vi.spyOn(sharedRepository, 'insertInvitation').mockRejectedValueOnce(
      invitationError,
    )

    try {
      await expect(
        sendEmailCampaignService({ campaign: 'invitation' }, adminId),
      ).rejects.toBe(invitationError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'email_campaign_invitation_failed')
      expect(event).toMatchObject({
        event: 'email_campaign_invitation_failed',
        path: 'serverFn:send_email_campaign',
        status: 'failed',
        errorCategory: 'invitation_persistence',
        enrollmentId,
        userId: adminId,
      })
      expect(serialized.join('\n')).not.toContain(
        'private invitation database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('categorizes enrollment-mark failures while preserving failed delivery rows', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const enrollmentId = await seedEnrollment({
      status: 'approved',
      email: 'mark-failure@test.dev',
    })
    await previewEmailCampaignService({ campaign: 'invitation' }, adminId)
    const markError = new Error('private enrollment update detail')
    vi.spyOn(
      sharedRepository,
      'markEnrollmentInvitationSent',
    ).mockRejectedValueOnce(markError)

    try {
      await expect(
        sendEmailCampaignService({ campaign: 'invitation' }, adminId),
      ).resolves.toMatchObject({ sent: 0, failed: 1 })

      expect((await findLogRows(enrollmentId))[0]).toMatchObject({
        status: 'failed',
        errorMessage: 'private enrollment update detail',
      })
      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'email_campaign_invitation_failed')
      expect(event).toMatchObject({
        event: 'email_campaign_invitation_failed',
        errorCategory: 'campaign_enrollment_persistence',
        enrollmentId,
        userId: adminId,
      })
      expect(serialized.join('\n')).not.toContain(
        'private enrollment update detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('categorizes message-record failures without raw repository details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const enrollmentId = await seedEnrollment({
      status: 'approved',
      email: 'message-record-failure@test.dev',
    })
    await previewEmailCampaignService({ campaign: 'invitation' }, adminId)
    const messageError = new Error('private email message database detail')
    vi.spyOn(sharedRepository, 'insertEmailMessage').mockRejectedValueOnce(
      messageError,
    )

    try {
      await expect(
        sendEmailCampaignService({ campaign: 'invitation' }, adminId),
      ).rejects.toBe(messageError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'email_campaign_message_record_failed')
      expect(event).toMatchObject({
        event: 'email_campaign_message_record_failed',
        path: 'serverFn:send_email_campaign',
        errorCategory: 'campaign_message_persistence',
        enrollmentId,
        userId: adminId,
        status: 'failure',
      })
      expect(serialized.join('\n')).not.toContain(
        'private email message database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('restores a rotated invitation when the provider fails', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    installFakeSender(['expired-fail@test.dev'])
    const oldExpiresAt = new Date(Date.now() - 60_000)
    const invitation = await seedInvitation({
      email: 'expired-fail@test.dev',
      status: 'pending',
      token: 'old-token',
      expiresAt: oldExpiresAt,
    })
    await seedEnrollment({
      status: 'approved',
      email: invitation.email,
      invitationSent: true,
      invitationId: invitation.id,
    })

    const summary = await previewThenSend(adminId)

    expect(summary).toMatchObject({ sent: 0, failed: 1 })
    const row = await findInvitationByEmail(invitation.email)
    expect(row?.token).toBe('old-token')
    expect(row?.expiresAt.getTime()).toBe(oldExpiresAt.getTime())
  })
})

describe('email campaign lock (integration)', () => {
  beforeEach(() => {
    installFakeSender()
  })

  it('preview acquires the campaign lock for the caller', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    await previewEmailCampaignService({ campaign: 'invitation' }, adminId)

    const locks = await findLockRows()
    expect(locks).toHaveLength(1)
    expect(locks[0].lockedByUserId).toBe(adminId)
  })

  it('preview is blocked while another admin holds the lock', async () => {
    const adminA = await seedProfile({ role: 'admin' })
    const adminB = await seedProfile({ role: 'admin' })
    await previewEmailCampaignService({ campaign: 'invitation' }, adminA)

    await expect(
      previewEmailCampaignService({ campaign: 'invitation' }, adminB),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_LOCKED' })
  })

  it('send releases the lock and send without lock rejects', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await seedEnrollment({ status: 'approved' })

    await previewThenSend(adminId)

    expect(await findLockRows()).toHaveLength(0)
    await expect(
      sendEmailCampaignService({ campaign: 'invitation' }, adminId),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_LOCKED' })
  })

  it('lock list and explicit release support close or switch cleanup', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await previewEmailCampaignService({ campaign: 'invitation' }, adminId)

    expect(await getEmailCampaignLocksService(adminId)).toEqual(['invitation'])
    await releaseEmailCampaignService({ campaign: 'invitation' }, adminId)
    expect(await getEmailCampaignLocksService(adminId)).toEqual([])
  })

  it('logs safe lock inspection and explicit release telemetry', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    await previewEmailCampaignService({ campaign: 'invitation' }, adminId)
    infoSpy.mockClear()

    await getEmailCampaignLocksService(adminId)
    await releaseEmailCampaignService({ campaign: 'invitation' }, adminId)

    const events = infoSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'email_campaign_locks_loaded',
          path: 'serverFn:getEmailCampaignLocks',
          lockCount: 1,
          status: 'success',
        }),
        expect.objectContaining({
          event: 'email_campaign_lock_released',
          path: 'serverFn:releaseEmailCampaign',
          campaign: 'invitation',
          userId: adminId,
          status: 'success',
        }),
      ]),
    )
  })

  it('categorizes lock repository failures without raw errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const readError = new Error('private email lock database detail')
    vi.spyOn(sharedRepository, 'getLockedEmailCampaigns').mockRejectedValueOnce(
      readError,
    )

    await expect(getEmailCampaignLocksService(adminId)).rejects.toBe(readError)

    const releaseError = new Error('private email release database detail')
    vi.spyOn(
      sharedRepository,
      'releaseEmailCampaignLock',
    ).mockRejectedValueOnce(releaseError)
    await expect(
      releaseEmailCampaignService({ campaign: 'invitation' }, adminId),
    ).rejects.toBe(releaseError)

    const serialized = errorSpy.mock.calls.map(([line]) => String(line))
    const events = serialized.map((line) => JSON.parse(line))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'email_campaign_locks_load_failed',
          path: 'serverFn:getEmailCampaignLocks',
          errorCategory: 'campaign_lock_read',
        }),
        expect.objectContaining({
          event: 'email_campaign_lock_release_failed',
          path: 'serverFn:releaseEmailCampaign',
          campaign: 'invitation',
          errorCategory: 'campaign_lock_release',
        }),
      ]),
    )
    expect(serialized.join('\n')).not.toContain(
      'private email lock database detail',
    )
    expect(serialized.join('\n')).not.toContain(
      'private email release database detail',
    )
  })

  it('requires admin role for lock inspection and explicit release', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    await expect(getEmailCampaignLocksService(teacherId)).rejects.toThrow(
      AuthorizationError,
    )
    await expect(
      releaseEmailCampaignService({ campaign: 'invitation' }, teacherId),
    ).rejects.toThrow(AuthorizationError)
  })
})

describe('email campaign authorization telemetry (integration)', () => {
  it.each([
    {
      name: 'lock inspection',
      event: 'email_campaign_locks_load_failed',
      path: 'serverFn:getEmailCampaignLocks',
      run: (userId: string): Promise<unknown> =>
        getEmailCampaignLocksService(userId),
    },
    {
      name: 'lock release',
      event: 'email_campaign_lock_release_failed',
      path: 'serverFn:releaseEmailCampaign',
      run: (userId: string): Promise<unknown> =>
        releaseEmailCampaignService({ campaign: 'invitation' }, userId),
    },
    {
      name: 'preview',
      event: 'email_campaign_preview_failed',
      path: 'serverFn:preview_email_campaign',
      run: (userId: string): Promise<unknown> =>
        previewEmailCampaignService({ campaign: 'invitation' }, userId),
    },
    {
      name: 'send',
      event: 'email_campaign_send_failed',
      path: 'serverFn:send_email_campaign',
      run: (userId: string): Promise<unknown> =>
        sendEmailCampaignService({ campaign: 'invitation' }, userId),
    },
  ])(
    'logs unexpected $name authorization failures without raw details',
    async ({ event, path, run }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const repositoryError = new Error(
        'authorization connectionString=secret; campaign=email',
      )
      const rejectingService: AuthorizationService = {
        hasRole: vi.fn().mockRejectedValue(repositoryError),
        isRole: vi.fn(),
        getRole: vi.fn(),
        isAdmin: vi.fn(),
        canPerformAction: vi.fn(),
        isAllowedToPerformAction: vi.fn(),
      }
      setAuthorizationService(rejectingService)

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/email-campaign', {
            headers: { 'x-request-id': `email-auth-${path}` },
          }),
          () => run('email-auth-user'),
        ),
      ).rejects.toBe(repositoryError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const eventLine = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === event)
      expect(eventLine).toMatchObject({
        event,
        path,
        requestId: `email-auth-${path}`,
        status: 'failure',
        errorCategory: 'campaign_authorization_persistence',
        userId: 'email-auth-user',
        durationMs: expect.any(Number),
      })
      expect(serialized.join('\n')).not.toContain('connectionString')
      expect(serialized.join('\n')).not.toContain('campaign=email')
    },
  )

  it('keeps expected authorization denials out of operation telemetry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const denial = new AuthorizationError('admin access required')
    setAuthorizationService({
      hasRole: vi.fn().mockRejectedValue(denial),
      isRole: vi.fn(),
      getRole: vi.fn(),
      isAdmin: vi.fn(),
      canPerformAction: vi.fn(),
      isAllowedToPerformAction: vi.fn(),
    })

    await expect(
      previewEmailCampaignService({ campaign: 'invitation' }, 'email-user'),
    ).rejects.toBe(denial)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
