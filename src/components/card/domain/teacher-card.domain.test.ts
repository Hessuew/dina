import { describe, expect, it } from 'vitest'
import type { TeacherWithCourse } from '@/types/teacher'
import { GEM_IMAGE_MAP } from '@/utils/gems'
import {
  COURSE_ORDER_THEMES,
  buildTeacherCardViewModel,
  getInitials,
} from './teacher-card.domain'

function makeTeacher(
  overrides: Partial<TeacherWithCourse> = {},
): TeacherWithCourse {
  return {
    id: 't1',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    bio: null,
    lecturerTitle: null,
    gemstone: null,
    avatarUrl: null,
    createdAt: new Date(),
    course: null,
    ...overrides,
  }
}

describe('getInitials', () => {
  it('returns first two letters uppercased for a single name', () => {
    expect(getInitials('Madonna')).toBe('MA')
  })

  it('returns first + last initial for a multi-word name', () => {
    expect(getInitials('Jane Doe')).toBe('JD')
  })

  it('uses the first and final word for three-part names', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MW')
  })

  it('trims surrounding whitespace', () => {
    expect(getInitials('  Jane Doe  ')).toBe('JD')
  })
})

describe('buildTeacherCardViewModel', () => {
  it('computes initials from the full name', () => {
    expect(buildTeacherCardViewModel(makeTeacher()).initials).toBe('JD')
  })

  it('prefers the course order theme for the top label', () => {
    const vm = buildTeacherCardViewModel(
      makeTeacher({
        lecturerTitle: 'Professor',
        course: {
          id: 'c1',
          title: 'Course',
          description: null,
          isPublished: true,
          createdAt: new Date(),
          orderIndex: 2,
        },
      }),
    )
    expect(vm.topLabel).toBe(COURSE_ORDER_THEMES[2])
  })

  it('falls back to the lecturer title when there is no course order index', () => {
    const vm = buildTeacherCardViewModel(
      makeTeacher({ lecturerTitle: 'Professor' }),
    )
    expect(vm.topLabel).toBe('Professor')
  })

  it('falls back to the lecturer title when the order index has no theme', () => {
    const vm = buildTeacherCardViewModel(
      makeTeacher({
        lecturerTitle: 'Professor',
        course: {
          id: 'c1',
          title: 'Course',
          description: null,
          isPublished: true,
          createdAt: new Date(),
          orderIndex: 99,
        },
      }),
    )
    expect(vm.topLabel).toBe('Professor')
  })

  it('returns undefined top label when neither theme nor title exist', () => {
    expect(buildTeacherCardViewModel(makeTeacher()).topLabel).toBeUndefined()
  })

  it('resolves the gem image when the gemstone maps to an asset', () => {
    const vm = buildTeacherCardViewModel(makeTeacher({ gemstone: 'emerald' }))
    expect(vm.gemImage).toEqual({
      url: GEM_IMAGE_MAP.emerald,
      alt: 'emerald',
    })
  })

  it('returns no gem image when the gemstone is absent', () => {
    expect(buildTeacherCardViewModel(makeTeacher()).gemImage).toBeNull()
  })

  it('returns no gem image when the gemstone has no mapped asset', () => {
    const vm = buildTeacherCardViewModel(makeTeacher({ gemstone: 'unknown' }))
    expect(vm.gemImage).toBeNull()
  })
})
