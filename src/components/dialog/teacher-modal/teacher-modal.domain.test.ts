import { describe, expect, it } from 'vitest'
import {
  buildTeacherModalViewModel,
  getTeacherInitials,
  resolveTeacherModalGemImage,
} from '../teacher-modal/teacher-modal.domain'
import type { TeacherWithCourse } from '@/types/teacher'
import { GEM_IMAGE_MAP } from '@/utils/gems'

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

describe('getTeacherInitials', () => {
  it('returns first two letters uppercased for a single name', () => {
    expect(getTeacherInitials('Madonna')).toBe('MA')
  })

  it('returns first + last initial for a two-word name', () => {
    expect(getTeacherInitials('Jane Doe')).toBe('JD')
  })

  it('uses the first and final word for three-part names', () => {
    expect(getTeacherInitials('Mary Jane Watson')).toBe('MW')
  })

  it('trims surrounding whitespace', () => {
    expect(getTeacherInitials('  Jane Doe  ')).toBe('JD')
  })
})

describe('resolveTeacherModalGemImage', () => {
  it('returns null when gemstone is null', () => {
    expect(resolveTeacherModalGemImage(null)).toBeNull()
  })

  it('returns null when gemstone has no mapped asset', () => {
    expect(resolveTeacherModalGemImage('unknown-gem')).toBeNull()
  })

  it('returns url and alt when gemstone maps to an asset', () => {
    const result = resolveTeacherModalGemImage('emerald')
    expect(result).toEqual({ url: GEM_IMAGE_MAP.emerald, alt: 'emerald' })
  })
})

describe('buildTeacherModalViewModel', () => {
  it('computes initials from the full name', () => {
    const vm = buildTeacherModalViewModel(
      makeTeacher({ fullName: 'John Smith' }),
    )
    expect(vm.initials).toBe('JS')
  })

  it('returns null gemImage when gemstone is absent', () => {
    const vm = buildTeacherModalViewModel(makeTeacher())
    expect(vm.gemImage).toBeNull()
  })

  it('resolves gemImage when gemstone has a mapped asset', () => {
    const vm = buildTeacherModalViewModel(makeTeacher({ gemstone: 'emerald' }))
    expect(vm.gemImage).toEqual({ url: GEM_IMAGE_MAP.emerald, alt: 'emerald' })
  })

  it('returns null gemImage when gemstone has no mapped asset', () => {
    const vm = buildTeacherModalViewModel(makeTeacher({ gemstone: 'unknown' }))
    expect(vm.gemImage).toBeNull()
  })
})
