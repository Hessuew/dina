import { describe, expect, it } from 'vitest'
import {
  EMAIL_CAMPAIGN_OPTIONS,
  campaignToRelease,
  resolveCanSend,
  resolvePreviewFailure,
  resolvePreviewLabel,
  resolveResultLabel,
  resolveSkipDetail,
  resolveStatusLines,
} from './email-campaign-dialog.domain'
import { CampaignLockedError } from '@/utils/errors'

const noSkips = { linkStillValid: 0, revoked: 0, overCap: 0 }

describe('EMAIL_CAMPAIGN_OPTIONS', () => {
  it('offers the invitation campaign', () => {
    expect(EMAIL_CAMPAIGN_OPTIONS).toMatchObject([
      { value: 'invitation', label: 'Invitation emails' },
    ])
  })
})

describe('resolvePreviewLabel', () => {
  it('pluralizes email count', () => {
    expect(resolvePreviewLabel({ toSend: 2, skipped: noSkips })).toBe(
      '2 emails will be sent',
    )
  })

  it('uses singular for one email', () => {
    expect(resolvePreviewLabel({ toSend: 1, skipped: noSkips })).toBe(
      '1 email will be sent',
    )
  })
})

describe('resolveSkipDetail', () => {
  it('returns null when nothing is skipped', () => {
    expect(resolveSkipDetail(noSkips)).toBeNull()
  })

  it('shows the required skip detail format', () => {
    expect(
      resolveSkipDetail({ linkStillValid: 1, revoked: 2, overCap: 3 }),
    ).toBe('1 link still valid · 2 revoked · 3 over batch limit')
  })
})

describe('resolveResultLabel', () => {
  it('reports sent only when nothing failed or skipped', () => {
    expect(resolveResultLabel({ sent: 5, failed: 0, skipped: noSkips })).toBe(
      '5 sent',
    )
  })

  it('appends failed and skipped counts', () => {
    expect(
      resolveResultLabel({
        sent: 3,
        failed: 1,
        skipped: { linkStillValid: 1, revoked: 0, overCap: 1 },
      }),
    ).toBe('3 sent, 1 failed, 2 skipped')
  })
})

describe('resolveStatusLines', () => {
  const idle = { preview: null, summary: null, isLoading: false }

  it('shows loading state', () => {
    expect(resolveStatusLines({ ...idle, isLoading: true })).toEqual([
      { text: 'Loading...', tone: 'muted' },
    ])
  })

  it('shows result after send', () => {
    expect(
      resolveStatusLines({
        ...idle,
        summary: { sent: 2, failed: 0, skipped: noSkips },
      }),
    ).toEqual([{ text: '2 sent', tone: 'strong' }])
  })

  it('shows preview plus skip detail', () => {
    expect(
      resolveStatusLines({
        ...idle,
        preview: {
          toSend: 2,
          skipped: { linkStillValid: 1, revoked: 0, overCap: 0 },
        },
      }),
    ).toEqual([
      { text: '2 emails will be sent', tone: 'strong' },
      {
        text: '1 link still valid · 0 revoked · 0 over batch limit',
        tone: 'muted',
      },
    ])
  })
})

describe('resolveCanSend', () => {
  const sendable = {
    preview: { toSend: 1, skipped: noSkips },
    summary: null,
    isLoading: false,
    isSending: false,
  }

  it('allows a non-empty preview while idle', () => {
    expect(resolveCanSend(sendable)).toBe(true)
  })

  it('blocks missing, empty, completed, loading, or sending states', () => {
    expect(resolveCanSend({ ...sendable, preview: null })).toBe(false)
    expect(
      resolveCanSend({ ...sendable, preview: { toSend: 0, skipped: noSkips } }),
    ).toBe(false)
    expect(
      resolveCanSend({
        ...sendable,
        summary: { sent: 1, failed: 0, skipped: noSkips },
      }),
    ).toBe(false)
    expect(resolveCanSend({ ...sendable, isLoading: true })).toBe(false)
    expect(resolveCanSend({ ...sendable, isSending: true })).toBe(false)
  })
})

describe('resolvePreviewFailure', () => {
  it('classifies a locked campaign', () => {
    expect(resolvePreviewFailure(new CampaignLockedError())).toEqual({
      kind: 'locked',
    })
  })

  it('classifies other errors with a user message', () => {
    expect(resolvePreviewFailure(new Error('boom'))).toEqual({
      kind: 'error',
      message: 'boom',
    })
  })
})

describe('campaignToRelease', () => {
  it('returns null for the single campaign re-selection', () => {
    expect(campaignToRelease('invitation', 'invitation')).toBeNull()
  })
})
