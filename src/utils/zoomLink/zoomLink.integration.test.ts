import { describe, expect, it } from 'vitest'
import type { CreateZoomLinkInput } from '@/schemas/zoomLink.schema'
import {
  createZoomLinkService,
  deleteZoomLinkService,
  getZoomLinksService,
  updateZoomLinkService,
} from '@/utils/zoomLink/service/zoomLink.service'
import { AuthorizationError } from '@/utils/errors'
import { seedCourse, seedProfile } from '../../../test/integration/seed'

const makeCreateInput = (
  overrides: Partial<CreateZoomLinkInput> = {},
): CreateZoomLinkInput => ({
  title: 'Week 1 Lecture',
  section: 'general_class_lecture',
  zoomUrl: 'https://zoom.us/j/123',
  meetingId: '123 456 789',
  passcode: 'secret',
  ...overrides,
})

describe('zoomLink service (integration)', () => {
  it('createZoomLinkService persists a row with normalized values', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    await createZoomLinkService(
      makeCreateInput({ description: '', title: 'Intro' }),
      adminId,
    )

    const { links } = await getZoomLinksService(adminId)
    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({
      title: 'Intro',
      section: 'general_class_lecture',
      zoomUrl: 'https://zoom.us/j/123',
      meetingId: '123 456 789',
      passcode: 'secret',
      orderIndex: 0,
      description: null, // '' normalized to null
      courseId: null,
    })
  })

  it('getZoomLinksService joins courseTitle, orders rows, and includes viewer role', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse({ title: 'Foundations' })

    await createZoomLinkService(
      makeCreateInput({ title: 'B', orderIndex: 1, courseId }),
      adminId,
    )
    await createZoomLinkService(
      makeCreateInput({ title: 'A', orderIndex: 0 }),
      adminId,
    )

    const payload = await getZoomLinksService(adminId)

    expect(payload.role).toBe('admin')
    // ordered by section, then orderIndex, then title
    expect(payload.links.map((l) => l.title)).toEqual(['A', 'B'])
    expect(payload.links[1].courseTitle).toBe('Foundations')
    expect(payload.links[0].courseTitle).toBeNull()
    expect(payload.courses).toEqual([{ id: courseId, title: 'Foundations' }])
  })

  it('updateZoomLinkService persists mutated fields in place', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await createZoomLinkService(
      makeCreateInput({ title: 'Before', section: 'general_class_lecture' }),
      adminId,
    )
    const original = (await getZoomLinksService(adminId)).links[0]

    await updateZoomLinkService(
      {
        ...makeCreateInput({ title: 'After', section: 'discipleship_group' }),
        zoomLinkId: original.id,
      },
      adminId,
    )

    const links = (await getZoomLinksService(adminId)).links
    expect(links).toHaveLength(1) // updated in place, not inserted
    expect(links[0].id).toBe(original.id)
    expect(links[0].title).toBe('After')
    expect(links[0].section).toBe('discipleship_group')
    expect(links[0].updatedAt).toBeInstanceOf(Date)
  })

  it('deleteZoomLinkService removes the row', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await createZoomLinkService(makeCreateInput(), adminId)
    const { id } = (await getZoomLinksService(adminId)).links[0]

    await deleteZoomLinkService({ zoomLinkId: id }, adminId)

    expect((await getZoomLinksService(adminId)).links).toHaveLength(0)
  })

  it('rejects a non-admin caller via authz', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    await expect(
      createZoomLinkService(makeCreateInput(), teacherId),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })
})
