import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_OPTIONS,
  campaignToRelease,
  resolveCanSend,
  resolvePreviewFailure,
  resolvePreviewLabel,
  resolveResultLabel,
  resolveSkipDetail,
  resolveStatusLines,
} from './whatsapp-campaign-dialog.domain'
import { CampaignLockedError, UNEXPECTED_ERROR_MESSAGE } from '@/utils/errors'

const noSkips = { alreadySent: 0, invalidPhone: 0, overCap: 0 }

describe('CAMPAIGN_OPTIONS', () => {
  it('offers exactly the two fixed campaigns', () => {
    expect(CAMPAIGN_OPTIONS.map((o) => o.value)).toEqual([
      'congratulations',
      'signup_reminder',
    ])
  })
})

describe('resolvePreviewLabel', () => {
  it('pluralizes the message count', () => {
    expect(resolvePreviewLabel({ toSend: 3, skipped: noSkips })).toBe(
      '3 messages will be sent',
    )
  })

  it('uses singular for one message', () => {
    expect(resolvePreviewLabel({ toSend: 1, skipped: noSkips })).toBe(
      '1 message will be sent',
    )
  })
})

describe('resolveSkipDetail', () => {
  it('returns null when nothing is skipped', () => {
    expect(resolveSkipDetail(noSkips)).toBeNull()
  })

  it('lists only the non-zero skip reasons', () => {
    expect(
      resolveSkipDetail({ alreadySent: 2, invalidPhone: 0, overCap: 0 }),
    ).toBe('Skipped: 2 already sent')
  })

  it('joins multiple reasons', () => {
    expect(
      resolveSkipDetail({ alreadySent: 2, invalidPhone: 1, overCap: 3 }),
    ).toBe('Skipped: 2 already sent · 1 invalid phone · 3 over batch limit')
  })
})

describe('resolveResultLabel', () => {
  it('reports sent only when nothing failed or was skipped', () => {
    expect(resolveResultLabel({ sent: 5, failed: 0, skipped: noSkips })).toBe(
      '5 sent',
    )
  })

  it('appends failed and skipped counts when present', () => {
    expect(
      resolveResultLabel({
        sent: 5,
        failed: 2,
        skipped: { alreadySent: 1, invalidPhone: 1, overCap: 0 },
      }),
    ).toBe('5 sent, 2 failed, 2 skipped')
  })
})

describe('resolveStatusLines', () => {
  const idle = { preview: null, summary: null, isLoading: false }

  it('shows a loading line while the preview loads', () => {
    expect(resolveStatusLines({ ...idle, isLoading: true })).toEqual([
      { text: 'Loading…', tone: 'muted' },
    ])
  })

  it('shows the result label after a send', () => {
    expect(
      resolveStatusLines({
        ...idle,
        summary: { sent: 2, failed: 0, skipped: noSkips },
      }),
    ).toEqual([{ text: '2 sent', tone: 'strong' }])
  })

  it('shows nothing before a campaign is selected', () => {
    expect(resolveStatusLines(idle)).toEqual([])
  })

  it('shows the preview headline without a skip line when nothing is skipped', () => {
    expect(
      resolveStatusLines({ ...idle, preview: { toSend: 2, skipped: noSkips } }),
    ).toEqual([{ text: '2 messages will be sent', tone: 'strong' }])
  })

  it('appends the skip detail line when recipients are skipped', () => {
    expect(
      resolveStatusLines({
        ...idle,
        preview: {
          toSend: 2,
          skipped: { alreadySent: 1, invalidPhone: 0, overCap: 0 },
        },
      }),
    ).toEqual([
      { text: '2 messages will be sent', tone: 'strong' },
      { text: 'Skipped: 1 already sent', tone: 'muted' },
    ])
  })
})

describe('resolveCanSend', () => {
  const sendable = {
    preview: { toSend: 2, skipped: noSkips },
    summary: null,
    isLoading: false,
    isSending: false,
  }

  it('allows sending from a non-empty preview while idle', () => {
    expect(resolveCanSend(sendable)).toBe(true)
  })

  it('blocks sending without a preview', () => {
    expect(resolveCanSend({ ...sendable, preview: null })).toBe(false)
  })

  it('blocks sending an empty preview', () => {
    expect(
      resolveCanSend({ ...sendable, preview: { toSend: 0, skipped: noSkips } }),
    ).toBe(false)
  })

  it('blocks re-sending after a summary exists', () => {
    expect(
      resolveCanSend({
        ...sendable,
        summary: { sent: 2, failed: 0, skipped: noSkips },
      }),
    ).toBe(false)
  })

  it('blocks sending while loading or sending', () => {
    expect(resolveCanSend({ ...sendable, isLoading: true })).toBe(false)
    expect(resolveCanSend({ ...sendable, isSending: true })).toBe(false)
  })
})

describe('resolvePreviewFailure', () => {
  it('classifies a CAMPAIGN_LOCKED error as locked', () => {
    expect(resolvePreviewFailure(new CampaignLockedError())).toEqual({
      kind: 'locked',
    })
  })

  it('classifies any other error with a safe user message', () => {
    expect(resolvePreviewFailure(new Error('boom'))).toEqual({
      kind: 'error',
      message: UNEXPECTED_ERROR_MESSAGE,
    })
  })
})

describe('campaignToRelease', () => {
  it('returns the previous campaign when switching to a different one', () => {
    expect(campaignToRelease('congratulations', 'signup_reminder')).toBe(
      'congratulations',
    )
  })

  it('returns null when nothing was selected', () => {
    expect(campaignToRelease(null, 'congratulations')).toBeNull()
  })

  it('returns null when re-selecting the same campaign', () => {
    expect(campaignToRelease('congratulations', 'congratulations')).toBeNull()
  })
})
