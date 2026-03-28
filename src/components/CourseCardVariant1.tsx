import { Link } from '@tanstack/react-router'
import { BookOpenIcon, CalendarIcon, EditIcon, EyeIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

type CourseCardProps = {
  course: {
    id: string
    title: string
    description: string | null
    thumbnailUrl: string | null
    isPublished: boolean
    lessons: Array<{
      id: string
      scheduledTime: Date | null
      title: string
      thumbnailUrl: string | null
    }>
    teacher?: {
      fullName: string
    }
    completedLessons?: number
    totalLessons?: number
  }
  role: 'student' | 'teacher' | 'admin'
}

export function CourseCardVariant1({ course, role }: CourseCardProps) {
  const isTeacher = role === 'teacher'
  const lessonCount = course.lessons.length
  const progress =
    course.completedLessons && course.totalLessons
      ? (course.completedLessons / course.totalLessons) * 100
      : 0

  const firstLesson = course.lessons[0] as
    | CourseCardProps['course']['lessons'][0]
    | null
  const startTime = firstLesson?.scheduledTime
    ? new Date(firstLesson.scheduledTime)
    : null

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <Card className="group relative overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/30 shadow-sm transition-all hover:shadow-lg">
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {course.thumbnailUrl && (
        <div className="relative">
          <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-linear-to-br from-primary/10 to-purple-500/10">
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
            {isTeacher && (
              <div className="absolute right-3 top-3">
                <Badge
                  variant={course.isPublished ? 'default' : 'secondary'}
                  className="border border-white/20 bg-background/80 shadow-lg backdrop-blur-sm"
                >
                  {course.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      <CardHeader className="relative space-y-2 pb-3">
        <h3 className="line-clamp-2 text-lg font-bold leading-tight">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
            {course.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="relative space-y-3 pb-3">
        {course.teacher && (
          <div className="text-muted-foreground text-xs">
            <span className="font-medium">by</span> {course.teacher.fullName}
          </div>
        )}

        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-md bg-linear-to-r from-primary/10 to-transparent px-2 py-1.5">
            <BookOpenIcon className="size-3.5 text-primary" />
            <span className="font-semibold">{lessonCount}</span>
            <span className="text-muted-foreground">lessons</span>
          </div>

          <div className="flex items-center gap-2 px-2 text-muted-foreground">
            <CalendarIcon className="size-3.5" />
            <span className="text-xs">
              {startTime ? formatDateTime(startTime) : 'Not scheduled'}
            </span>
          </div>
        </div>

        {!isTeacher && course.completedLessons !== undefined && (
          <div className="space-y-2 rounded-lg bg-linear-to-br from-muted/50 to-muted/20 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Progress</span>
              <span className="text-muted-foreground">
                {course.completedLessons}/{course.totalLessons}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>

      <CardFooter className="relative gap-2 pt-3">
        {isTeacher ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              render={
                <Link
                  to="/courses/$courseId"
                  params={{ courseId: course.id }}
                />
              }
            >
              <EyeIcon className="size-3.5" />
              View
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-linear-to-r from-primary to-primary/80 text-xs"
              render={
                <Link
                  to="/courses/$courseId"
                  params={{ courseId: course.id }}
                />
              }
            >
              <EditIcon className="size-3.5" />
              Edit
            </Button>
          </>
        ) : (
          <Button
            className="w-full bg-linear-to-r from-primary to-primary/80 text-xs font-semibold"
            render={
              <Link to="/courses/$courseId" params={{ courseId: course.id }} />
            }
          >
            Continue Learning
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
