import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPostCreatedEvent } from './events'
import { emit } from './index'

const { deliver, getRecipients } = vi.hoisted(() => ({
  deliver: vi.fn(),
  getRecipients: vi.fn(),
}))

vi.mock('./delivery', () => ({
  DatabaseDeliveryAdapter: class {
    deliver = deliver
  },
}))
vi.mock('./recipients', () => ({ getRecipients }))

describe('notification emission', () => {
  const event = createPostCreatedEvent('actor-1', 'post-1', 'course-1', true)

  beforeEach(() => {
    deliver.mockReset()
    getRecipients.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs safe recipient resolution telemetry before delivery', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    getRecipients.mockResolvedValue({
      recipientIds: ['recipient-1', 'recipient-2'],
    })

    await emit(event)

    expect(deliver).toHaveBeenCalledWith(event, ['recipient-1', 'recipient-2'])
    const [line] = infoSpy.mock.calls.map(([entry]) => String(entry))
    expect(JSON.parse(line)).toMatchObject({
      event: 'notification_recipients_resolved',
      path: 'notifications:resolve_recipients',
      notificationType: 'post_created',
      actorId: 'actor-1',
      postId: 'post-1',
      recipientCount: 2,
      status: 'success',
    })
  })

  it('swallows and logs redacted recipient lookup failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getRecipients.mockRejectedValue(new Error('notification content secret'))

    await expect(emit(event)).resolves.toBeUndefined()

    expect(deliver).not.toHaveBeenCalled()
    const [line] = errorSpy.mock.calls.map(([entry]) => String(entry))
    expect(JSON.parse(line)).toMatchObject({
      event: 'notification_recipient_resolution_failed',
      path: 'notifications:resolve_recipients',
      notificationType: 'post_created',
      actorId: 'actor-1',
      postId: 'post-1',
      errorCategory: 'notification_recipient_read_persistence',
      status: 'failure',
    })
    expect(line).not.toContain('notification content secret')
  })
})
