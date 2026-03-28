import { Link } from '@tanstack/react-router'
import { BookOpenIcon, EditIcon, EyeIcon } from 'lucide-react'
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

type CourseCardProps = {
  course: {
    id: string
    title: string
    description: string | null
    thumbnailUrl: string | null
    isPublished: boolean
    lessons: Array<{ id: string }>
    teacher?: {
      fullName: string
    }
    completedLessons?: number
    totalLessons?: number
  }
  role: 'student' | 'teacher' | 'admin'
}

export function CourseCard({ course, role }: CourseCardProps) {
  const isTeacher = role === 'teacher'
  const lessonCount = course.lessons.length
  const progress =
    course.completedLessons && course.totalLessons
      ? (course.completedLessons / course.totalLessons) * 100
      : 0

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      {course.thumbnailUrl && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="size-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2">{course.title}</CardTitle>
          {isTeacher && (
            <Badge variant={course.isPublished ? 'default' : 'secondary'}>
              {course.isPublished ? 'Published' : 'Draft'}
            </Badge>
          )}
        </div>
        {course.description && (
          <CardDescription className="line-clamp-2">
            {course.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-col gap-3">
          {course.teacher && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span>By {course.teacher.fullName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <BookOpenIcon className="size-4" />
            <span>{lessonCount} lessons</span>
          </div>
          {!isTeacher && course.completedLessons !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="text-muted-foreground">
                  {course.completedLessons}/{course.totalLessons}
                </span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        {isTeacher ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              render={
                <Link
                  to="/courses/$courseId"
                  params={{ courseId: course.id }}
                />
              }
            >
              <EyeIcon className="size-4" />
              View
            </Button>
            <Button
              size="sm"
              className="flex-1"
              render={
                <Link
                  to="/courses/$courseId/edit"
                  params={{ courseId: course.id }}
                />
              }
            >
              <EditIcon className="size-4" />
              Edit
            </Button>
          </>
        ) : (
          <Button
            className="w-full"
            render={
              <Link to="/courses/$courseId" params={{ courseId: course.id }} />
            }
          >
            View Course
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
