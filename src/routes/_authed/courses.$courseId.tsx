import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { CalendarIcon, ClockIcon, VideoIcon } from 'lucide-react'
import { and, eq } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { db } from '@/db'
import { courses, enrollments, lessonProgress, profiles } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth'

const getCourseDetail = createServerFn({ method: 'GET' })
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, data.courseId),
      with: {
        teacher: true,
        lessons: {
          orderBy: (lessons, { asc }) => [asc(lessons.orderIndex)],
        },
      },
    })

    if (!course) {
      throw new Error('Course not found')
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    let enrollment = null
    let progress: Array<any> = []

    if (profile.role === 'student') {
      enrollment = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.studentId, user.id),
          eq(enrollments.courseId, data.courseId),
        ),
      })

      progress = await db.query.lessonProgress.findMany({
        where: and(
          eq(lessonProgress.studentId, user.id),
          eq(lessonProgress.completed, true),
        ),
      })
    }

    const completedLessonIds = new Set(progress.map((p) => p.lessonId))

    return {
      course,
      role: profile.role,
      isEnrolled: !!enrollment,
      completedLessonIds: Array.from(completedLessonIds),
    }
  })

export const Route = createFileRoute('/_authed/courses/$courseId')({
  loader: async ({ params }) => {
    const data = await getCourseDetail({ data: { courseId: params.courseId } })
    return data
  },
  component: CourseDetailComponent,
})

function CourseDetailComponent() {
  const { course, role, isEnrolled, completedLessonIds } = Route.useLoaderData()
  const completedCount = completedLessonIds.length
  const totalLessons = course.lessons.length
  const progress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        {course.thumbnailUrl && (
          <div className="mb-6 aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="size-full object-cover"
            />
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground mt-2">
              By {course.teacher.fullName}
            </p>
          </div>
          {role === 'teacher' && course.teacherId === course.teacher.id && (
            <Badge variant={course.isPublished ? 'default' : 'secondary'}>
              {course.isPublished ? 'Published' : 'Draft'}
            </Badge>
          )}
        </div>
        {course.description && (
          <p className="text-muted-foreground mt-4">{course.description}</p>
        )}
      </div>

      {role === 'student' && isEnrolled && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Completed Lessons</span>
                <span className="text-muted-foreground">
                  {completedCount}/{totalLessons}
                </span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lessons</CardTitle>
          <CardDescription>
            {totalLessons} lesson{totalLessons !== 1 ? 's' : ''} in this course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {course.lessons.map((lesson, index) => {
              const isCompleted = completedLessonIds.includes(lesson.id)
              return (
                <div
                  key={lesson.id}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <span className="font-semibold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{lesson.title}</h3>
                    {lesson.content && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        {lesson.content}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      {lesson.duration && (
                        <div className="text-muted-foreground flex items-center gap-1">
                          <ClockIcon className="size-4" />
                          <span>{lesson.duration} min</span>
                        </div>
                      )}
                      {lesson.scheduledTime && (
                        <div className="text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="size-4" />
                          <span>
                            {new Date(
                              lesson.scheduledTime,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {lesson.videoUrl && (
                        <div className="text-muted-foreground flex items-center gap-1">
                          <VideoIcon className="size-4" />
                          <span>Video available</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {role === 'student' && isEnrolled && (
                    <div>
                      {isCompleted ? (
                        <Badge variant="default">Completed</Badge>
                      ) : (
                        <Button size="sm">Start</Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {course.lessons.length === 0 && (
              <div className="text-muted-foreground py-8 text-center">
                No lessons yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
