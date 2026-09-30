import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

describe('Cloudflare static asset routing', () => {
  it('runs the Worker before the ASSETS binding for every asset request', async () => {
    const config = await readAssetsConfig()

    expect(config).toEqual({
      directory: 'dist/client',
      binding: 'ASSETS',
      run_worker_first: true,
    })
  })
})

async function readAssetsConfig(): Promise<Record<string, unknown>> {
  const configPath = new URL('../wrangler.jsonc', import.meta.url).pathname
  const script = `
    const config = Bun.JSON5.parse(await Bun.file(process.argv[1]).text())
    console.log(JSON.stringify(config.assets))
  `
  const { stdout } = await execFileAsync('bun', ['-e', script, configPath])
  return JSON.parse(stdout) as Record<string, unknown>
}
