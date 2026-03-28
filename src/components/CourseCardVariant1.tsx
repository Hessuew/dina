import { useNavigate } from '@tanstack/react-router'
import { BookOpenIcon, CalendarIcon, EditIcon, MonitorPlay } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TeacherAvatars } from '@/components/TeacherAvatars'

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
    courseTeachers?: Array<{
      teacher: {
        id: string
        fullName: string
        avatarUrl?: string | null
      }
    }>
    completedLessons?: number
    totalLessons?: number
  }
  role: 'student' | 'teacher' | 'admin'
}

export function CourseCardVariant1({ course, role }: CourseCardProps) {
  const navigate = useNavigate()
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
    <Card
      className="group relative cursor-pointer overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/30 shadow-sm transition-all hover:shadow-lg"
      onClick={() => {
        navigate({
          to: '/courses/$courseId',
          params: { courseId: course.id },
        })
      }}
    >
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

          <div className="absolute bottom-2 right-2">
            {course.courseTeachers && course.courseTeachers.length > 0 ? (
              <div className="flex items-center gap-2">
                <TeacherAvatars
                  teachers={course.courseTeachers.map((ct) => ct.teacher)}
                  size="sm"
                  showTooltip={true}
                />
              </div>
            ) : course.teacher ? (
              <div className="text-muted-foreground text-xs">
                <span className="font-medium">by</span>{' '}
                {course.teacher.fullName}
              </div>
            ) : null}
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

      <CardContent className="relative space-y-3">
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
        <div className="flex w-full items-center justify-center gap-2 rounded-md bg-linear-to-r from-primary to-primary/80 px-3 py-2 text-xs font-medium text-white">
          {isTeacher ? (
            <>
              <EditIcon className="size-3.5" />
              Edit
            </>
          ) : (
            <>
              <MonitorPlay className="size-3.5" />
              View
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
