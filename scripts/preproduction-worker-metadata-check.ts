type CloudflareEnvelope<T> = {
  success?: boolean
  result?: T
  errors?: Array<{ code?: number | string }>
}

type ServiceMetadata = {
  default_environment?: { environment?: string }
}

type CheckOptions = {
  accountId: string
  token: string
  workerName: string
  fetcher?: typeof fetch
  write?: (message: string) => void
}

export async function checkPreproductionWorkerMetadata({
  accountId,
  token,
  workerName,
  fetcher = fetch,
  write = console.log,
}: CheckOptions): Promise<boolean> {
  const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}`
  const servicePath = `/workers/services/${encodeURIComponent(workerName)}`
  const headers = { Authorization: `Bearer ${token}` }

  async function check<T>(label: string, path: string) {
    try {
      const response = await fetcher(`${base}${path}`, { headers })
      const payload = (await response.json().catch(() => null)) as
        | CloudflareEnvelope<T>
        | null
      const codes = payload?.errors
        ?.map((error) => error.code)
        .filter((code): code is number | string => code !== undefined)
      const codeSummary = codes?.length
        ? ` (Cloudflare codes: ${codes.join(', ')})`
        : ''
      const ok = response.ok && payload?.success === true

      write(`${label}: HTTP ${response.status}${codeSummary}`)
      return { ok, result: payload?.result }
    } catch {
      write(`${label}: request failed before receiving an HTTP response`)
      return { ok: false, result: undefined }
    }
  }

  const service = await check<ServiceMetadata>('service', servicePath)
  if (!service.ok) return false

  const environment = service.result?.default_environment?.environment
  if (!environment) {
    write('service: default environment was missing')
    return false
  }

  const environmentPath = `${servicePath}/environments/${encodeURIComponent(environment)}`
  const results = await Promise.all([
    check('bindings', `${environmentPath}/bindings`),
    check('routes', `${environmentPath}/routes?show_zonename=true`),
    check(
      'domains',
      `/workers/domains/records?page=0&per_page=5&service=${encodeURIComponent(workerName)}&environment=${encodeURIComponent(environment)}`,
    ),
    check('subdomain', `${environmentPath}/subdomain`),
    check('environment', environmentPath),
    check(
      'schedules',
      `/workers/scripts/${encodeURIComponent(workerName)}/schedules`,
    ),
  ])

  return results.every((result) => result.ok)
}

if (import.meta.main) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim()
  const workerName = process.env.PREPRODUCTION_WORKER_NAME?.trim()

  if (!accountId || !token || !workerName) {
    console.error(
      'CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and PREPRODUCTION_WORKER_NAME are required',
    )
    process.exitCode = 1
  } else {
    const ok = await checkPreproductionWorkerMetadata({
      accountId,
      token,
      workerName,
    })
    if (!ok) process.exitCode = 1
  }
}
