import { describe, expect, it } from 'vitest'
import {
  buildCourseAttendanceScores,
  formatAttendanceScore,
  setLessonPresentOnScores,
  withAttendanceManageFlags,
} from './attendance-score.domain'

const courses = [
  { id: 'c-romans', title: 'Romans' },
  { id: 'c-acts', title: 'Acts' },
]

const lessons = [
  { id: 'l1', title: 'L1', orderIndex: 0, courseId: 'c-romans' },
  { id: 'l2', title: 'L2', orderIndex: 1, courseId: 'c-romans' },
  { id: 'l3', title: 'L3', orderIndex: 2, courseId: 'c-romans' },
  { id: 'la', title: 'A1', orderIndex: 0, courseId: 'c-acts' },
]

describe('buildCourseAttendanceScores', () => {
  it('counts all lessons as denominator including zero presents', () => {
    const scores = buildCourseAttendanceScores(courses, lessons, [], 's1')
    expect(scores.find((s) => s.courseId === 'c-romans')).toMatchObject({
      present: 0,
      totalLessons: 3,
    })
    expect(scores.find((s) => s.courseId === 'c-acts')).toMatchObject({
      present: 0,
      totalLessons: 1,
    })
  })

  it('counts present lessons for the student only', () => {
    const scores = buildCourseAttendanceScores(
      courses,
      lessons,
      [
        { lessonId: 'l1', studentId: 's1' },
        { lessonId: 'l2', studentId: 's1' },
        { lessonId: 'l1', studentId: 's2' },
        { lessonId: 'la', studentId: 's1' },
      ],
      's1',
    )
    const romans = scores.find((s) => s.courseId === 'c-romans')!
    expect(romans.present).toBe(2)
    expect(romans.totalLessons).toBe(3)
    expect(romans.lessons.map((l) => l.present)).toEqual([true, true, false])
    expect(scores.find((s) => s.courseId === 'c-acts')!.present).toBe(1)
  })
})

describe('formatAttendanceScore', () => {
  it('formats present/total', () => {
    expect(formatAttendanceScore(2, 3)).toBe('2/3')
    expect(formatAttendanceScore(0, 0)).toBe('0/0')
  })
})

describe('withAttendanceManageFlags', () => {
  it('sets canManageAttendance from manageable course ids', () => {
    const scores = buildCourseAttendanceScores(courses, lessons, [], 's1')
    const flagged = withAttendanceManageFlags(scores, new Set(['c-romans']))
    expect(
      flagged.find((s) => s.courseId === 'c-romans')?.canManageAttendance,
    ).toBe(true)
    expect(
      flagged.find((s) => s.courseId === 'c-acts')?.canManageAttendance,
    ).toBe(false)
  })
})

describe('setLessonPresentOnScores', () => {
  it('flips one lesson and recounts present numerator', () => {
    const scores = buildCourseAttendanceScores(courses, lessons, [], 's1')
    const next = setLessonPresentOnScores(scores, 'c-romans', 'l2', true)
    const romans = next.find((s) => s.courseId === 'c-romans')!
    expect(romans.present).toBe(1)
    expect(romans.lessons.map((l) => l.present)).toEqual([false, true, false])
    expect(next.find((s) => s.courseId === 'c-acts')?.present).toBe(0)
  })

  it('clears present without touching other courses', () => {
    const scores = buildCourseAttendanceScores(
      courses,
      lessons,
      [
        { lessonId: 'l1', studentId: 's1' },
        { lessonId: 'la', studentId: 's1' },
      ],
      's1',
    )
    const next = setLessonPresentOnScores(scores, 'c-romans', 'l1', false)
    expect(next.find((s) => s.courseId === 'c-romans')?.present).toBe(0)
    expect(next.find((s) => s.courseId === 'c-acts')?.present).toBe(1)
  })
})
