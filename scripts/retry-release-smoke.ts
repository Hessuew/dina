type RetryOptions = {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

export async function runWithRetry(
  run: (attempt: number) => Promise<number>,
  options: RetryOptions = {},
  sleep: (delayMs: number) => Promise<void> = Bun.sleep,
): Promise<number> {
  const maxAttempts = options.maxAttempts ?? 5
  const baseDelayMs = options.baseDelayMs ?? 5000
  const maxDelayMs = options.maxDelayMs ?? 30_000
  let exitCode = 1

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    exitCode = await run(attempt)
    if (exitCode === 0) return 0
    if (attempt === maxAttempts) break

    const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
    console.error(
      `release smoke attempt ${attempt} failed; retrying in ${delayMs}ms`,
    )
    await sleep(delayMs)
  }

  return exitCode
}

export function resolveSmokeCommand(name: string): string[] {
  if (name === 'health') return ['run', 'smoke:health']
  if (name === 'journey') return ['run', 'scripts/release-journey-smoke.ts']
  if (name === 'rollback') {
    return ['run', 'scripts/rollback-and-smoke.ts']
  }
  if (name === 'rollback-deploy') {
    return ['run', 'scripts/rollback-deploy.ts']
  }
  throw new Error(
    'Smoke target must be health, journey, rollback, or rollback-deploy',
  )
}

async function main(): Promise<number> {
  const command = resolveSmokeCommand(process.argv[2] ?? '')
  return runWithRetry(async () => {
    const child = Bun.spawn([process.execPath, ...command], {
      stderr: 'inherit',
      stdout: 'inherit',
    })
    return child.exited
  })
}

if (import.meta.main) {
  try {
    process.exitCode = await main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'unknown error')
    process.exitCode = 1
  }
}
