// fallow-ignore-file unused-file -- invoked directly by production-release.yml

import { selectRollbackTargetInfo } from './rollback-target.domain'

const target = selectRollbackTargetInfo(JSON.parse(await Bun.stdin.text()))
console.log(JSON.stringify(target))
