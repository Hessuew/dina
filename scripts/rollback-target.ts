// fallow-ignore-file unused-file -- invoked directly by production-release.yml

import {
  selectRollbackTarget,
  selectRollbackTargetInfo,
} from './rollback-target.domain'

const input = JSON.parse(await Bun.stdin.text())
if (Array.isArray(input)) {
  console.log(selectRollbackTarget(input))
} else {
  console.log(JSON.stringify(selectRollbackTargetInfo(input)))
}
