import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  seedAssignment,
  seedCalendarEvent,
  seedCourse,
  seedLesson,
  seedProfile,
} from 'test/integration/seed'
import { getCalendarEventsService } from './service/calendar.service'

async function getCalendarEventsForSeededViewer() {
  const viewerId = await seedProfile()
  return getCalendarEventsService(viewerId)
}

describe('getCalendarEventsService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requires a persisted profile before reading calendar data', async () => {
    await expect(
      getCalendarEventsService('00000000-0000-4000-8000-000000000001'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('logs a redacted read outcome with safe event counts', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const courseId = await seedCourse()
    const lessonId = await seedLesson({
      courseId,
      isPublished: true,
      scheduledTime: new Date('2026-01-10T09:00:00Z'),
    })
    await seedAssignment({ lessonId, status: 'published' })
    await seedCalendarEvent({ title: 'Private calendar title' })

    const viewerId = await seedProfile({ role: 'student' })
    await getCalendarEventsService(viewerId)

    const events = infoSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'calendar_events_loaded',
          actorId: viewerId,
          eventCount: 3,
          lessonCount: 1,
          assignmentCount: 1,
          specialEventCount: 1,
          status: 'success',
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    expect(infoSpy.mock.calls.flat().join('\n')).not.toContain(
      'Private calendar title',
    )
  })

  it('maps a published, scheduled lesson with its course join', async () => {
    const courseId = await seedCourse({ title: 'Foundations' })
    const scheduledTime = new Date('2026-01-10T09:00:00Z')
    await seedLesson({
      courseId,
      title: 'Lesson One',
      isPublished: true,
      scheduledTime,
      content: 'Intro material',
      duration: 60,
    })

    const { events } = await getCalendarEventsForSeededViewer()

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      title: 'Lesson One',
      type: 'lesson',
      date: scheduledTime,
      courseId,
      courseName: 'Foundations',
      description: 'Intro material',
      duration: 60,
    })
  })

  it('excludes unpublished lessons and published lessons without a scheduledTime', async () => {
    const courseId = await seedCourse()
    await seedLesson({
      courseId,
      title: 'Unpublished',
      isPublished: false,
      scheduledTime: new Date('2026-01-10T09:00:00Z'),
    })
    await seedLesson({
      courseId,
      title: 'Published but unscheduled',
      isPublished: true,
    })

    const { events } = await getCalendarEventsForSeededViewer()

    expect(events).toHaveLength(0)
  })

  it('maps a published assignment with the courseId from its lesson and excludes drafts', async () => {
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId, isPublished: true })
    const dueDate = new Date('2026-02-01T12:00:00Z')
    await seedAssignment({
      lessonId,
      title: 'Essay',
      status: 'published',
      dueDate,
      maxGrade: 50,
    })
    await seedAssignment({
      lessonId,
      title: 'Draft Essay',
      status: 'draft',
    })

    const { events } = await getCalendarEventsForSeededViewer()

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      title: 'Essay',
      type: 'assignment',
      date: dueDate,
      courseId,
      maxGrade: 50,
    })
  })

  it('maps a calendar event with null courseId to an empty string and surfaces its category', async () => {
    const startTime = new Date('2026-03-15T08:00:00Z')
    await seedCalendarEvent({
      title: 'Midterm',
      courseId: null,
      startTime,
      category: 'exam',
    })

    const { events } = await getCalendarEventsForSeededViewer()

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      title: 'Midterm',
      type: 'special',
      date: startTime,
      courseId: '',
      specialCategory: 'exam',
    })
  })

  it('returns all event types sorted by date ascending', async () => {
    const courseId = await seedCourse()
    const lessonId = await seedLesson({
      courseId,
      title: 'Lecture',
      isPublished: true,
      scheduledTime: new Date('2026-04-10T09:00:00Z'),
    })
    await seedAssignment({
      lessonId,
      title: 'Homework',
      status: 'published',
      dueDate: new Date('2026-04-05T12:00:00Z'),
    })
    await seedCalendarEvent({
      title: 'Chapel',
      startTime: new Date('2026-04-20T08:00:00Z'),
      category: 'chapel',
    })

    const { events } = await getCalendarEventsForSeededViewer()

    expect(events.map((e) => e.title)).toEqual([
      'Homework',
      'Lecture',
      'Chapel',
    ])
    const times = events.map((e) => e.date.getTime())
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })
})
