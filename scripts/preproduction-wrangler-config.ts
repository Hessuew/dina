import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  buildPreproductionWranglerConfig,
  parseWranglerConfig,
} from './preproduction-wrangler-config.domain'

const DEFAULT_CONFIG = 'wrangler.jsonc'
const DEFAULT_OUT = 'wrangler.preproduction.generated.jsonc'

function readOption(args: Array<string>, name: string): string | undefined {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const configPath = readOption(args, '--config') ?? DEFAULT_CONFIG
  const outPath = readOption(args, '--out') ?? DEFAULT_OUT
  const workerName = requiredEnv('PREPRODUCTION_WORKER_NAME')
  const hyperdriveId = requiredEnv('PREPRODUCTION_HYPERDRIVE_ID')

  const base = parseWranglerConfig(await Bun.file(configPath).text())
  const config = buildPreproductionWranglerConfig(base, {
    workerName,
    hyperdriveId,
  })

  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  console.log(`pre-production wrangler config written: ${outPath}`)
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : 'unknown error')
  process.exitCode = 1
}
