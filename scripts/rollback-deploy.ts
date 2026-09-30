// fallow-ignore-file unused-file -- invoked directly by production-release.yml

const versionId = requiredEnv('ROLLBACK_VERSION_ID')
const workerName = requiredEnv('ROLLBACK_WORKER_NAME')
const releaseTag = requiredEnv('ROLLBACK_RELEASE_TAG')

const child = Bun.spawn(
  [
    'bunx',
    'wrangler',
    'versions',
    'deploy',
    `${versionId}@100`,
    '--config',
    'wrangler.jsonc',
    '--name',
    workerName,
    '--message',
    `Automatic rollback after failed release ${releaseTag}`,
    '--yes',
  ],
  {
    stderr: 'inherit',
    stdout: 'inherit',
  },
)

process.exitCode = await child.exited

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

export {}
