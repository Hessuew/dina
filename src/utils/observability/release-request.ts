import { recordReleaseMetric } from './release-endpoints'
import type {
  ReleaseRuntimeEnv,
  ReleaseVersionMetadata,
} from './release-endpoints'

export async function runRequestWithReleaseMetrics(
  request: Request,
  runtime: ReleaseRuntimeEnv,
  metadata: ReleaseVersionMetadata | null,
  startedAt: number,
  run: () => Promise<Response>,
): Promise<Response> {
  try {
    const response = await run()
    recordReleaseMetric(
      runtime,
      metadata,
      request,
      response,
      performance.now() - startedAt,
    )
    return response
  } catch (error) {
    recordReleaseMetric(
      runtime,
      metadata,
      request,
      new Response(null, { status: 500 }),
      performance.now() - startedAt,
    )
    throw error
  }
}
