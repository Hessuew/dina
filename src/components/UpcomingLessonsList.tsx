import { Link } from '@tanstack/react-router'
import { CalendarIcon, ClockIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type UpcomingLesson = {
  id: string
  title: string
  scheduledTime: Date
  thumbnailUrl: string | null
  courseId: string
  courseName: string
}

type UpcomingLessonsListProps = {
  lessons: Array<UpcomingLesson>
}

export function UpcomingLessonsList({ lessons }: UpcomingLessonsListProps) {
  const formatDateTime = (date: Date) => {
    const dateObj = new Date(date)
    return {
      date: dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      time: dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upcoming Lessons</CardTitle>
      </CardHeader>
      <CardContent>
        {lessons.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No upcoming lessons scheduled
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => {
              const { date, time } = formatDateTime(lesson.scheduledTime)
              return (
                <Link
                  key={lesson.id}
                  to="/lessons/$lessonId"
                  params={{ lessonId: lesson.id }}
                  className="block"
                >
                  <div className="group flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    {lesson.thumbnailUrl && (
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-muted">
                        <img
                          src={lesson.thumbnailUrl}
                          alt={lesson.title}
                          className="size-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-muted-foreground mb-1 truncate text-xs">
                        {lesson.courseName}
                      </div>
                      <div className="mb-1 truncate font-medium text-sm group-hover:text-primary">
                        {lesson.title}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="size-3" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="size-3" />
                          <span>{time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
