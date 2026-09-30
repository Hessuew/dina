// fallow-ignore-file unused-file -- invoked directly by production-release.yml

import { selectRollbackTarget } from './rollback-target.domain'

const target = selectRollbackTarget(JSON.parse(await Bun.stdin.text()))
console.log(target)
