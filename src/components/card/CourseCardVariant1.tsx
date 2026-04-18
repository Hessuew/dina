import { useNavigate } from '@tanstack/react-router'
import { BookOpenIcon, CalendarIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TeacherAvatars } from '@/components/avarats/TeacherAvatars'

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
  const isTeacher = role === 'teacher' || role === 'admin'
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
    <div className="relative max-w-md rounded-xl bg-linear-to-r from-neutral-600 to-violet-300 pt-0 shadow-lg">
      <div className="flex h-50 items-center justify-center overflow-hidden">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="size-full rounded-t-xl object-cover"
          />
        ) : (
          <div className="bg-muted flex size-full items-center justify-center">
            <BookOpenIcon className="text-muted-foreground size-20" />
          </div>
        )}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 absolute top-4 right-4 duration-1000">
        {course.courseTeachers && course.courseTeachers.length > 0 && (
          <div className="flex items-center gap-2">
            <TeacherAvatars
              teachers={course.courseTeachers.map((ct) => ct.teacher)}
              size="sm"
              showTooltip={true}
            />
          </div>
        )}
      </div>

      {isTeacher && (
        <div className="absolute top-4 left-4">
          <Badge
            variant={'secondary'}
            className="bg-background/80 border border-white/20 shadow-lg backdrop-blur-sm"
          >
            {course.isPublished ? 'Published' : 'Draft'}
          </Badge>
        </div>
      )}

      <Card className="border-none">
        <CardHeader>
          <CardTitle>{course.title}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-sm">
              <BookOpenIcon className="mr-1 size-3" />
              {lessonCount} lessons
            </Badge>
            {startTime && (
              <Badge variant="outline" className="rounded-sm">
                <CalendarIcon className="mr-1 size-3" />
                {formatDateTime(startTime)}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {course.description && (
            <p className="line-clamp-3 text-sm">{course.description}</p>
          )}

          {!isTeacher && course.completedLessons !== undefined && (
            <div className="mt-4 space-y-2">
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

        <CardFooter className="justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase">Lessons</span>
            <span className="text-xl font-semibold">{lessonCount}</span>
          </div>
          <Button
            onClick={() => {
              navigate({
                to: '/courses/$courseId',
                params: { courseId: course.id },
              })
            }}
          >
            {isTeacher ? <>Edit Course</> : <>View Course</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
