import { isSpanContextValid, trace } from '@opentelemetry/api'

type ObservabilityEvent = {
  contexts?: Record<string, unknown>
}

export function addActiveTraceContext<TEvent extends ObservabilityEvent>(
  event: TEvent,
): TEvent {
  const span = trace.getActiveSpan()
  if (!span) return event

  const spanContext = span.spanContext()
  if (!isSpanContextValid(spanContext)) return event

  const existingTrace = event.contexts?.trace
  return {
    ...event,
    contexts: {
      ...event.contexts,
      trace: {
        ...(isRecord(existingTrace) ? existingTrace : {}),
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
      },
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
