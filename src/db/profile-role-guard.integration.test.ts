import { beforeEach, describe, expect, it } from 'vitest'
import { getPgliteClient } from 'test/integration/db'
import {
  findProfileRoleById,
  insertProfileOnConflict,
} from '@/utils/repository'

const client = getPgliteClient()
const studentId = '00000000-0000-4000-8000-000000000001'
const adminId = '00000000-0000-4000-8000-000000000002'

describe('profile role mutation guard', () => {
  beforeEach(async () => {
    await insertProfileOnConflict({
      id: studentId,
      email: 'student@example.com',
      fullName: 'Student',
      role: 'student',
    })
    await insertProfileOnConflict({
      id: adminId,
      email: 'admin@example.com',
      fullName: 'Admin',
      role: 'admin',
    })
  })

  it('rejects an authenticated non-Admin role change', async () => {
    await expect(
      updateRoleAs(studentId, 'authenticated', studentId, 'admin'),
    ).rejects.toMatchObject({ code: '42501' })

    const profile = await findProfileRoleById(studentId)
    expect(profile?.role).toBe('student')
  })

  it('allows Admin, service-role, and trusted server changes', async () => {
    await updateRoleAs(adminId, 'authenticated', studentId, 'teacher')
    await updateRoleAs('', 'service_role', studentId, 'student')
    await updateRoleAs('', '', studentId, 'teacher')

    const profile = await findProfileRoleById(studentId)
    expect(profile?.role).toBe('teacher')
  })
})

async function updateRoleAs(
  actorId: string,
  requestRole: string,
  targetId: string,
  targetRole: 'student' | 'teacher' | 'admin',
) {
  await client.exec('BEGIN')
  try {
    await client.exec(`
      SELECT
        set_config('request.jwt.claim.role', '${requestRole}', true),
        set_config('request.jwt.claim.sub', '${actorId}', true);
      UPDATE profiles SET role = '${targetRole}' WHERE id = '${targetId}';
    `)
    await client.exec('COMMIT')
  } catch (error) {
    await client.exec('ROLLBACK')
    throw error
  }
}
