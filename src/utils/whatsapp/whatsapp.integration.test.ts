import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  WhatsAppSender,
  WhatsAppTemplateMessage,
} from '@/utils/whatsapp/types'
import type { CampaignType } from '@/utils/whatsapp/domain/templates.domain'
import type { AuthorizationService } from '@/utils/authz/types'
import {
  DefaultAuthorizationService,
  setAuthorizationService,
} from '@/utils/authz'
import {
  seedEnrollment,
  seedInvitation,
  seedProfile,
  seedWhatsAppMessage,
} from '@/../test/integration/seed'
import { setWhatsAppSender } from '@/utils/whatsapp'
import {
  getWhatsAppCampaignLocksService,
  previewWhatsAppCampaignService,
  releaseWhatsAppCampaignService,
  sendWhatsAppCampaignService,
} from '@/utils/whatsapp/service/whatsapp.service'
import { AuthorizationError } from '@/utils/errors'
import {
  findWhatsAppCampaignLock,
  findWhatsAppMessagesByEnrollmentId,
} from '@/utils/repository'
import * as sharedRepository from '@/utils/repository'
import { withObservabilityRequest } from '@/utils/observability/request-context'

afterEach(() => {
  vi.restoreAllMocks()
  setAuthorizationService(new DefaultAuthorizationService())
})

/** Fake sender: records calls; throws for phones listed in `failFor`. */
function installFakeSender(failFor: Array<string> = []) {
  const calls: Array<WhatsAppTemplateMessage> = []
  const sender: WhatsAppSender = {
    send(message) {
      calls.push(message)
      if (failFor.includes(message.toE164)) {
        return Promise.reject(new Error('provider rejected message'))
      }
      return Promise.resolve({ providerMessageId: `wamid.${calls.length}` })
    },
  }
  setWhatsAppSender(sender)
  return calls
}

async function findLogRows(enrollmentId: string) {
  return findWhatsAppMessagesByEnrollmentId(enrollmentId)
}

/** Send requires the campaign lock — acquire it via preview, then send. */
async function previewThenSend(campaign: CampaignType, userId: string) {
  await previewWhatsAppCampaignService({ campaign }, userId)
  return sendWhatsAppCampaignService({ campaign }, userId)
}

async function findLockRows(campaign: CampaignType) {
  const lock = await findWhatsAppCampaignLock(campaign)
  return lock ? [lock] : []
}

describe('sendWhatsAppCampaignService (integration)', () => {
  beforeEach(() => {
    installFakeSender()
  })

  it('requires admin role', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    await expect(
      sendWhatsAppCampaignService({ campaign: 'congratulations' }, teacherId),
    ).rejects.toThrow(AuthorizationError)
  })

  it('sends the congratulations template to the approved cohort and logs rows', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const approvedId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+358 40 1234567',
      preferredName: 'Mia',
    })
    await seedEnrollment({ status: 'pending' }) // not in cohort

    const summary = await previewThenSend('congratulations', adminId)

    expect(summary).toEqual({
      sent: 1,
      failed: 0,
      skipped: { alreadySent: 0, invalidPhone: 0, overCap: 0 },
    })
    expect(calls).toEqual([
      {
        toE164: '+358401234567',
        templateName: 'dina_congratulations',
        recipientName: 'Mia',
      },
    ])
    const rows = await findLogRows(approvedId)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      recipientPhone: '+358401234567',
      templateName: 'dina_congratulations',
      status: 'sent',
      providerMessageId: 'wamid.1',
      sentByUserId: adminId,
    })
  })

  it('skips un-normalizable phones and already-sent enrollments', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const invalidPhoneId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '0401234567', // no country code
    })
    const alreadySentId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+14155552671',
    })
    await seedWhatsAppMessage({
      enrollmentId: alreadySentId,
      templateName: 'dina_congratulations',
    })

    const summary = await previewThenSend('congratulations', adminId)

    expect(summary).toEqual({
      sent: 0,
      failed: 0,
      skipped: { alreadySent: 1, invalidPhone: 1, overCap: 0 },
    })
    expect(calls).toEqual([])
    expect(await findLogRows(invalidPhoneId)).toHaveLength(0)
  })

  it('records a provider failure as a failed row and continues the batch', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    installFakeSender(['+14155552671'])
    const failingId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+14155552671',
    })
    const okId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+358401234567',
    })

    const summary = await previewThenSend('congratulations', adminId)

    expect(summary.sent).toBe(1)
    expect(summary.failed).toBe(1)
    const failedRows = await findLogRows(failingId)
    expect(failedRows[0]).toMatchObject({
      status: 'failed',
      providerMessageId: null,
      errorMessage: 'provider rejected message',
    })
    expect((await findLogRows(okId))[0].status).toBe('sent')
  })

  it('emits redacted structured events for provider failures and completion', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    try {
      const adminId = await seedProfile({ role: 'admin' })
      installFakeSender(['+14155552671'])
      await seedEnrollment({
        status: 'approved',
        phoneWhatsApp: '+14155552671',
        preferredName: 'Private recipient',
      })

      await previewThenSend('congratulations', adminId)

      const failure = errorSpy.mock.calls
        .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
        .find((entry) => entry.event === 'whatsapp_campaign_message_failed')
      expect(failure).toMatchObject({
        level: 'error',
        event: 'whatsapp_campaign_message_failed',
        path: 'serverFn:send_whatsapp_campaign',
        campaign: 'congratulations',
        status: 'failed',
        errorCategory: 'whatsapp_message_delivery',
        userId: adminId,
        templateName: 'dina_congratulations',
      })
      expect(failure).not.toHaveProperty('errorMessage')
      expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain(
        'provider rejected message',
      )

      const completion = infoSpy.mock.calls
        .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
        .find((entry) => entry.event === 'whatsapp_campaign_completed')
      expect(completion).toMatchObject({
        event: 'whatsapp_campaign_completed',
        path: 'serverFn:send_whatsapp_campaign',
        status: 'partial_failure',
        userId: adminId,
        sent: 0,
        failed: 1,
        skippedAlreadySent: 0,
        skippedInvalidRecipients: 0,
        skippedOverCap: 0,
      })
    } finally {
      errorSpy.mockRestore()
      infoSpy.mockRestore()
    }
  })

  it('categorizes send lock and planning failures and releases the lock', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const lockError = new Error('private WhatsApp lock connectionString detail')
    vi.spyOn(
      sharedRepository,
      'checkWhatsAppCampaignLockHeldBy',
    ).mockRejectedValueOnce(lockError)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/whatsapp', {
          headers: { 'x-request-id': 'whatsapp-send-lock-failure' },
        }),
        () =>
          sendWhatsAppCampaignService({ campaign: 'congratulations' }, adminId),
      ),
    ).rejects.toBe(lockError)

    const lockEvent = JSON.parse(
      String(errorSpy.mock.calls.at(-1)?.[0]),
    ) as Record<string, unknown>
    expect(lockEvent).toMatchObject({
      event: 'whatsapp_campaign_send_failed',
      path: 'serverFn:send_whatsapp_campaign',
      requestId: 'whatsapp-send-lock-failure',
      campaign: 'congratulations',
      userId: adminId,
      errorCategory: 'campaign_lock_read',
      status: 'failure',
    })
    expect(String(errorSpy.mock.calls.at(-1)?.[0])).not.toContain(
      'connectionString detail',
    )

    errorSpy.mockClear()
    await previewWhatsAppCampaignService(
      { campaign: 'congratulations' },
      adminId,
    )
    const planningError = new Error(
      'private WhatsApp recipient database detail',
    )
    vi.spyOn(sharedRepository, 'findApprovedEnrollments').mockRejectedValueOnce(
      planningError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/whatsapp', {
          headers: { 'x-request-id': 'whatsapp-send-planning-failure' },
        }),
        () =>
          sendWhatsAppCampaignService({ campaign: 'congratulations' }, adminId),
      ),
    ).rejects.toBe(planningError)

    const planningEvent = JSON.parse(
      String(errorSpy.mock.calls.at(-1)?.[0]),
    ) as Record<string, unknown>
    expect(planningEvent).toMatchObject({
      event: 'whatsapp_campaign_send_failed',
      path: 'serverFn:send_whatsapp_campaign',
      requestId: 'whatsapp-send-planning-failure',
      userId: adminId,
      errorCategory: 'campaign_send_planning_persistence',
      status: 'failure',
    })
    expect(String(errorSpy.mock.calls.at(-1)?.[0])).not.toContain(
      'private WhatsApp recipient database detail',
    )
    expect(await findLockRows('congratulations')).toHaveLength(0)
  })

  it('categorizes message-record persistence failures without raw details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const enrollmentId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+358401234567',
      preferredName: 'Private recipient',
    })
    await previewWhatsAppCampaignService(
      { campaign: 'congratulations' },
      adminId,
    )
    const recordError = new Error('private WhatsApp message database detail')
    vi.spyOn(sharedRepository, 'insertWhatsAppMessage').mockRejectedValueOnce(
      recordError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/whatsapp', {
          headers: { 'x-request-id': 'whatsapp-message-record-failure' },
        }),
        () =>
          sendWhatsAppCampaignService({ campaign: 'congratulations' }, adminId),
      ),
    ).rejects.toBe(recordError)

    const serialized = errorSpy.mock.calls.map(([line]) => String(line))
    const event = serialized
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find(
        (entry) => entry.event === 'whatsapp_campaign_message_record_failed',
      )
    expect(event).toMatchObject({
      event: 'whatsapp_campaign_message_record_failed',
      path: 'serverFn:send_whatsapp_campaign',
      requestId: 'whatsapp-message-record-failure',
      campaign: 'congratulations',
      enrollmentId,
      userId: adminId,
      errorCategory: 'campaign_message_persistence',
      status: 'failure',
      durationMs: expect.any(Number),
    })
    expect(serialized.join('\n')).not.toContain(
      'private WhatsApp message database detail',
    )
    expect(serialized.join('\n')).not.toContain('Private recipient')
    expect(await findLockRows('congratulations')).toHaveLength(0)
  })

  it('retries failed sends but dedupes sent ones on re-run', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    installFakeSender(['+14155552671'])
    await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+14155552671',
    })
    await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+358401234567',
    })

    const first = await previewThenSend('congratulations', adminId)
    expect(first).toMatchObject({ sent: 1, failed: 1 })

    // Second run: sent one deduped, failed one retried (now succeeding).
    installFakeSender()
    const second = await previewThenSend('congratulations', adminId)
    expect(second).toEqual({
      sent: 1,
      failed: 0,
      skipped: { alreadySent: 1, invalidPhone: 0, overCap: 0 },
    })
  })

  it('sends the signup reminder only to invited-but-not-registered enrollments', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const pendingInvitation = await seedInvitation({ status: 'pending' })
    const notRegisteredId = await seedEnrollment({
      status: 'approved',
      invitationSent: true,
      invitationId: pendingInvitation.id,
      phoneWhatsApp: '+358401234567',
      preferredName: 'Noa',
    })
    const acceptedInvitation = await seedInvitation({ status: 'accepted' })
    await seedEnrollment({
      status: 'approved',
      invitationSent: true,
      invitationId: acceptedInvitation.id,
      phoneWhatsApp: '+14155552671',
    })
    await seedEnrollment({ status: 'approved', invitationSent: false })

    const summary = await previewThenSend('signup_reminder', adminId)

    expect(summary.sent).toBe(1)
    expect(calls).toEqual([
      {
        toE164: '+358401234567',
        templateName: 'dina_signup_reminder',
        recipientName: 'Noa',
      },
    ])
    expect((await findLogRows(notRegisteredId))[0].templateName).toBe(
      'dina_signup_reminder',
    )
  })
})

describe('previewWhatsAppCampaignService (integration)', () => {
  it('requires admin role', async () => {
    const studentId = await seedProfile({ role: 'student' })
    await expect(
      previewWhatsAppCampaignService(
        { campaign: 'congratulations' },
        studentId,
      ),
    ).rejects.toThrow(AuthorizationError)
  })

  it('reports the plan and logs safe preview telemetry', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const sendableId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+358401234567',
    })
    await seedEnrollment({ status: 'approved', phoneWhatsApp: 'garbage' })
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    try {
      const preview = await previewWhatsAppCampaignService(
        { campaign: 'congratulations' },
        adminId,
      )

      expect(preview).toEqual({
        toSend: 1,
        skipped: { alreadySent: 0, invalidPhone: 1, overCap: 0 },
      })
      expect(calls).toEqual([])
      expect(await findLogRows(sendableId)).toHaveLength(0)
      expect(
        infoSpy.mock.calls.map(([line]) => JSON.parse(String(line))),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: 'whatsapp_campaign_previewed',
            path: 'serverFn:preview_whatsapp_campaign',
            campaign: 'congratulations',
            userId: adminId,
            toSend: 1,
            skippedAlreadySent: 0,
            skippedInvalidRecipients: 1,
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
    const planningError = new Error(
      'private WhatsApp recipient database detail',
    )
    vi.spyOn(sharedRepository, 'findApprovedEnrollments').mockRejectedValueOnce(
      planningError,
    )

    try {
      await expect(
        previewWhatsAppCampaignService(
          { campaign: 'congratulations' },
          adminId,
        ),
      ).rejects.toBe(planningError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'whatsapp_campaign_preview_failed')
      expect(event).toMatchObject({
        event: 'whatsapp_campaign_preview_failed',
        path: 'serverFn:preview_whatsapp_campaign',
        campaign: 'congratulations',
        userId: adminId,
        errorCategory: 'campaign_preview_persistence',
        status: 'failure',
      })
      expect(serialized.join('\n')).not.toContain(
        'private WhatsApp recipient database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })
})

describe('campaign lock (integration)', () => {
  beforeEach(() => {
    installFakeSender()
  })

  it('preview acquires the campaign lock for the caller', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    await previewWhatsAppCampaignService(
      { campaign: 'congratulations' },
      adminId,
    )

    const locks = await findLockRows('congratulations')
    expect(locks).toHaveLength(1)
    expect(locks[0].lockedByUserId).toBe(adminId)
  })

  it('preview is blocked while another admin holds the lock', async () => {
    const adminA = await seedProfile({ role: 'admin' })
    const adminB = await seedProfile({ role: 'admin' })
    await previewWhatsAppCampaignService(
      { campaign: 'congratulations' },
      adminA,
    )

    await expect(
      previewWhatsAppCampaignService({ campaign: 'congratulations' }, adminB),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_LOCKED' })
  })

  it('different campaigns are lockable concurrently', async () => {
    const adminA = await seedProfile({ role: 'admin' })
    const adminB = await seedProfile({ role: 'admin' })
    await previewWhatsAppCampaignService(
      { campaign: 'congratulations' },
      adminA,
    )

    await expect(
      previewWhatsAppCampaignService({ campaign: 'signup_reminder' }, adminB),
    ).resolves.toBeDefined()
  })

  it('send releases the lock on completion', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+358401234567',
    })

    await previewThenSend('congratulations', adminId)

    expect(await findLockRows('congratulations')).toHaveLength(0)
  })

  it('send rejects when the caller does not hold the lock', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    await expect(
      sendWhatsAppCampaignService({ campaign: 'congratulations' }, adminId),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_LOCKED' })
  })

  it('requires admin role for lock inspection and explicit release', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    await expect(getWhatsAppCampaignLocksService(teacherId)).rejects.toThrow(
      AuthorizationError,
    )
    await expect(
      releaseWhatsAppCampaignService(
        { campaign: 'congratulations' },
        teacherId,
      ),
    ).rejects.toThrow(AuthorizationError)
  })

  it('allows an admin to inspect and release a held campaign lock', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await previewWhatsAppCampaignService(
      { campaign: 'congratulations' },
      adminId,
    )

    expect(await getWhatsAppCampaignLocksService(adminId)).toEqual([
      'congratulations',
    ])
    await releaseWhatsAppCampaignService(
      { campaign: 'congratulations' },
      adminId,
    )
    expect(await getWhatsAppCampaignLocksService(adminId)).toEqual([])
  })

  it('logs safe lock inspection and explicit release telemetry', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    await previewWhatsAppCampaignService(
      { campaign: 'congratulations' },
      adminId,
    )
    infoSpy.mockClear()

    await getWhatsAppCampaignLocksService(adminId)
    await releaseWhatsAppCampaignService(
      { campaign: 'congratulations' },
      adminId,
    )

    const events = infoSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'whatsapp_campaign_locks_loaded',
          path: 'serverFn:getWhatsAppCampaignLocks',
          lockCount: 1,
          status: 'success',
        }),
        expect.objectContaining({
          event: 'whatsapp_campaign_lock_released',
          path: 'serverFn:releaseWhatsAppCampaign',
          campaign: 'congratulations',
          userId: adminId,
          status: 'success',
        }),
      ]),
    )
  })

  it('categorizes lock repository failures without raw errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const readError = new Error('private WhatsApp lock database detail')
    vi.spyOn(
      sharedRepository,
      'getLockedWhatsAppCampaigns',
    ).mockRejectedValueOnce(readError)

    await expect(getWhatsAppCampaignLocksService(adminId)).rejects.toBe(
      readError,
    )

    const releaseError = new Error('private WhatsApp release database detail')
    vi.spyOn(
      sharedRepository,
      'releaseWhatsAppCampaignLock',
    ).mockRejectedValueOnce(releaseError)
    await expect(
      releaseWhatsAppCampaignService({ campaign: 'congratulations' }, adminId),
    ).rejects.toBe(releaseError)

    const serialized = errorSpy.mock.calls.map(([line]) => String(line))
    const events = serialized.map((line) => JSON.parse(line))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'whatsapp_campaign_locks_load_failed',
          path: 'serverFn:getWhatsAppCampaignLocks',
          errorCategory: 'campaign_lock_read',
        }),
        expect.objectContaining({
          event: 'whatsapp_campaign_lock_release_failed',
          path: 'serverFn:releaseWhatsAppCampaign',
          campaign: 'congratulations',
          errorCategory: 'campaign_lock_release',
        }),
      ]),
    )
    expect(serialized.join('\n')).not.toContain(
      'private WhatsApp lock database detail',
    )
    expect(serialized.join('\n')).not.toContain(
      'private WhatsApp release database detail',
    )
  })
})

describe('WhatsApp campaign authorization telemetry (integration)', () => {
  it.each([
    {
      name: 'lock inspection',
      event: 'whatsapp_campaign_locks_load_failed',
      path: 'serverFn:getWhatsAppCampaignLocks',
      run: (userId: string): Promise<unknown> =>
        getWhatsAppCampaignLocksService(userId),
    },
    {
      name: 'lock release',
      event: 'whatsapp_campaign_lock_release_failed',
      path: 'serverFn:releaseWhatsAppCampaign',
      run: (userId: string): Promise<unknown> =>
        releaseWhatsAppCampaignService({ campaign: 'congratulations' }, userId),
    },
    {
      name: 'preview',
      event: 'whatsapp_campaign_preview_failed',
      path: 'serverFn:preview_whatsapp_campaign',
      run: (userId: string): Promise<unknown> =>
        previewWhatsAppCampaignService({ campaign: 'congratulations' }, userId),
    },
    {
      name: 'send',
      event: 'whatsapp_campaign_send_failed',
      path: 'serverFn:send_whatsapp_campaign',
      run: (userId: string): Promise<unknown> =>
        sendWhatsAppCampaignService({ campaign: 'congratulations' }, userId),
    },
  ])(
    'logs unexpected $name authorization failures without raw details',
    async ({ event, path, run }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const repositoryError = new Error(
        'authorization connectionString=secret; campaign=whatsapp',
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
          new Request('https://christ-dina.org/whatsapp-campaign', {
            headers: { 'x-request-id': `whatsapp-auth-${path}` },
          }),
          () => run('whatsapp-auth-user'),
        ),
      ).rejects.toBe(repositoryError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const eventLine = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === event)
      expect(eventLine).toMatchObject({
        event,
        path,
        requestId: `whatsapp-auth-${path}`,
        status: 'failure',
        errorCategory: 'campaign_authorization_persistence',
        userId: 'whatsapp-auth-user',
        durationMs: expect.any(Number),
      })
      expect(serialized.join('\n')).not.toContain('connectionString')
      expect(serialized.join('\n')).not.toContain('campaign=whatsapp')
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
      previewWhatsAppCampaignService(
        { campaign: 'congratulations' },
        'whatsapp-user',
      ),
    ).rejects.toBe(denial)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
