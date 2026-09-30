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

  it('does not embed provider identities in Worker configuration', async () => {
    const config = await readConfig()
    expect(config.vars).not.toHaveProperty('CLOUDFLARE_ACCOUNT_ID')
    expect(config.vars).not.toHaveProperty('BETTER_STACK_APPLICATION_ID')
  })
})

async function readAssetsConfig(): Promise<Record<string, unknown>> {
  const config = await readConfig()
  return config.assets
}

async function readConfig(): Promise<{
  assets: Record<string, unknown>
  vars: Record<string, unknown>
}> {
  const configPath = new URL('../wrangler.jsonc', import.meta.url).pathname
  const script = `
    const config = Bun.JSON5.parse(await Bun.file(process.argv[1]).text())
    console.log(JSON.stringify({ assets: config.assets, vars: config.vars }))
  `
  const { stdout } = await execFileAsync('bun', ['-e', script, configPath])
  return JSON.parse(stdout) as {
    assets: Record<string, unknown>
    vars: Record<string, unknown>
  }
}
