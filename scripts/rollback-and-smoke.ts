type RunCommand = (command: Array<string>) => Promise<number>

export async function runRollbackAndSmoke(
  runCommand: RunCommand = runChild,
): Promise<number> {
  const deploymentExitCode = await runCommand([
    'run',
    'scripts/rollback-deploy.ts',
  ])
  if (deploymentExitCode !== 0) return deploymentExitCode
  return runCommand(['run', 'scripts/rollback-smoke.ts'])
}

async function runChild(command: Array<string>): Promise<number> {
  const child = Bun.spawn([process.execPath, ...command], {
    stderr: 'inherit',
    stdout: 'inherit',
  })
  return child.exited
}

if (import.meta.main) {
  process.exitCode = await runRollbackAndSmoke()
}
