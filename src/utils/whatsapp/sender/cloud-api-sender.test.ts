import { afterEach, describe, expect, it, vi } from 'vitest'
import { CloudApiWhatsAppSender } from './cloud-api-sender'
import type { WhatsAppTemplateMessage } from '../types'

const envState = vi.hoisted(() => ({
  WHATSAPP_ENABLED: true,
  WHATSAPP_ACCESS_TOKEN: 'test-access-token' as string | undefined,
  WHATSAPP_PHONE_NUMBER_ID: 'test-phone-number-id' as string | undefined,
  WHATSAPP_API_VERSION: 'v21.0',
}))

vi.mock('@/env', () => ({ env: envState }))

const message: WhatsAppTemplateMessage = {
  toE164: '+358401234567',
  templateName: 'dina_congratulations',
  recipientName: 'Mia',
}

function stubFetch(response: Response) {
  const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

function okResponse(id = 'wamid.test-1'): Response {
  return new Response(JSON.stringify({ messages: [{ id }] }), { status: 200 })
}

afterEach(() => {
  vi.unstubAllGlobals()
  envState.WHATSAPP_ENABLED = true
  envState.WHATSAPP_ACCESS_TOKEN = 'test-access-token'
  envState.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-number-id'
})

describe('CloudApiWhatsAppSender disabled', () => {
  it('fails before any network request when WHATSAPP_ENABLED is false', async () => {
    envState.WHATSAPP_ENABLED = false
    const fetchSpy = stubFetch(okResponse())

    await expect(new CloudApiWhatsAppSender().send(message)).rejects.toThrow(
      'WhatsApp sending is disabled (WHATSAPP_ENABLED=false)',
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reports the disabled flag even when credentials are also missing', async () => {
    envState.WHATSAPP_ENABLED = false
    envState.WHATSAPP_ACCESS_TOKEN = undefined
    envState.WHATSAPP_PHONE_NUMBER_ID = undefined
    const fetchSpy = stubFetch(okResponse())

    await expect(new CloudApiWhatsAppSender().send(message)).rejects.toThrow(
      'WhatsApp sending is disabled (WHATSAPP_ENABLED=false)',
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('CloudApiWhatsAppSender enabled', () => {
  it('fails before any network request when the access token is missing', async () => {
    envState.WHATSAPP_ACCESS_TOKEN = undefined
    const fetchSpy = stubFetch(okResponse())

    await expect(new CloudApiWhatsAppSender().send(message)).rejects.toThrow(
      'WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured',
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fails before any network request when the phone number id is missing', async () => {
    envState.WHATSAPP_PHONE_NUMBER_ID = undefined
    const fetchSpy = stubFetch(okResponse())

    await expect(new CloudApiWhatsAppSender().send(message)).rejects.toThrow(
      'WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured',
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('posts the template message to the Cloud API and returns the provider id', async () => {
    const fetchSpy = stubFetch(okResponse('wamid.abc'))

    const result = await new CloudApiWhatsAppSender().send(message)

    expect(result).toEqual({ providerMessageId: 'wamid.abc' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(
      'https://graph.facebook.com/v21.0/test-phone-number-id/messages',
    )
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-access-token',
    )
    expect(JSON.parse(String(init?.body))).toMatchObject({
      messaging_product: 'whatsapp',
      to: '358401234567',
      type: 'template',
      template: {
        name: 'dina_congratulations',
        language: { code: 'en' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: 'Mia' }] },
        ],
      },
    })
  })

  it('throws the provider error body on a non-ok response', async () => {
    stubFetch(new Response('bad token', { status: 401 }))

    await expect(new CloudApiWhatsAppSender().send(message)).rejects.toThrow(
      'WhatsApp Cloud API 401: bad token',
    )
  })

  it('throws when the provider response lacks a message id', async () => {
    stubFetch(new Response(JSON.stringify({ messages: [] }), { status: 200 }))

    await expect(new CloudApiWhatsAppSender().send(message)).rejects.toThrow(
      'WhatsApp Cloud API response missing message id',
    )
  })
})
