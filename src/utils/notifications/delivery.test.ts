import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPostCreatedEvent } from './events'
import { DatabaseDeliveryAdapter } from './delivery'

const { getDb, values } = vi.hoisted(() => ({
  getDb: vi.fn(),
  values: vi.fn(),
}))

vi.mock('@/db', () => ({ getDb }))

describe('DatabaseDeliveryAdapter', () => {
  beforeEach(() => {
    values.mockReset()
    getDb.mockReset()
    getDb.mockResolvedValue({
      insert: vi.fn(() => ({ values })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('inserts one notification row per recipient', async () => {
    const adapter = new DatabaseDeliveryAdapter()
    const event = createPostCreatedEvent('actor-1', 'post-1', null, false)

    await adapter.deliver(event, ['recipient-1', 'recipient-2'])

    expect(values).toHaveBeenCalledOnce()
    expect(values.mock.calls[0][0]).toHaveLength(2)
  })

  it('logs a redacted failure and keeps notification delivery best effort', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    values.mockRejectedValue(new Error('postgres password=secret-value'))
    const adapter = new DatabaseDeliveryAdapter()
    const event = createPostCreatedEvent('actor-1', 'post-1', null, false)

    await expect(
      adapter.deliver(event, ['recipient-1']),
    ).resolves.toBeUndefined()

    const line = String(errorSpy.mock.calls[0]?.[0])
    expect(line).not.toContain('secret-value')
    expect(JSON.parse(line)).toMatchObject({
      level: 'error',
      event: 'notification_delivery_failed',
      path: 'notifications:deliver',
      status: 'failure',
      notificationType: 'post_created',
      recipientCount: 1,
      errorCategory: 'notification_delivery',
    })
  })
})
