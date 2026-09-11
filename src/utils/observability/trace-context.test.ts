import { trace } from '@opentelemetry/api'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { addActiveTraceContext } from './trace-context'
import type { Span } from '@opentelemetry/api'

const getActiveSpan = vi.spyOn(trace, 'getActiveSpan')

function spanWithContext(
  traceId = '0123456789abcdef0123456789abcdef',
  spanId = '0123456789abcdef',
): Span {
  return {
    spanContext: () => ({
      traceId,
      spanId,
      traceFlags: 1,
    }),
  } as unknown as Span
}

describe('addActiveTraceContext', () => {
  beforeEach(() => {
    getActiveSpan.mockReset()
  })

  it('leaves events unchanged when no active span exists', () => {
    getActiveSpan.mockReturnValue(undefined)
    const event = { message: 'ignored by the test', contexts: { app: 'web' } }

    expect(addActiveTraceContext(event)).toBe(event)
  })

  it('leaves events unchanged when the active span is invalid', () => {
    getActiveSpan.mockReturnValue(spanWithContext('', ''))
    const event = { contexts: { app: 'worker' } }

    expect(addActiveTraceContext(event)).toBe(event)
  })

  it('adds Better Stack-compatible trace identifiers and preserves context', () => {
    getActiveSpan.mockReturnValue(spanWithContext())
    const event = {
      contexts: { app: 'worker', trace: { op: 'http.server' } },
    }

    expect(addActiveTraceContext(event)).toEqual({
      contexts: {
        app: 'worker',
        trace: {
          op: 'http.server',
          trace_id: '0123456789abcdef0123456789abcdef',
          span_id: '0123456789abcdef',
        },
      },
    })
  })
})
