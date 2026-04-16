import { BookOpenIcon } from 'lucide-react'
import type { TeacherWithCourses } from '@/types/teacher'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

type TeacherModalProps = {
  teacher: TeacherWithCourses | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ')
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase()
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

function getAvatarColor(id: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ]
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export function TeacherModal({
  teacher,
  open,
  onOpenChange,
}: TeacherModalProps) {
  if (!teacher) return null

  const initials = getInitials(teacher.fullName)
  const avatarColor = getAvatarColor(teacher.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {teacher.avatarUrl ? (
                <img
                  src={teacher.avatarUrl}
                  alt={teacher.fullName}
                  className="ring-primary/20 size-20 rounded-full object-cover ring-2"
                />
              ) : (
                <div
                  className={`flex size-20 items-center justify-center rounded-full ${avatarColor} ring-primary/20 text-xl font-bold text-white ring-2`}
                >
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">{teacher.fullName}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {teacher.bio && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">About</h3>
              <p className="text-muted-foreground max-h-[calc(60vh-12rem)] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
                {teacher.bio}
              </p>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center gap-2">
              <BookOpenIcon className="size-4" />
              <h3 className="text-sm font-semibold">
                Courses ({teacher.courseCount})
              </h3>
            </div>

            {teacher.courses.length > 0 ? (
              <div className="space-y-2">
                {teacher.courses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-muted/30 hover:bg-muted/50 flex items-start gap-3 rounded-lg border p-3 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{course.title}</h4>
                        <Badge
                          variant={course.isPublished ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {course.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                      {course.description && (
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm whitespace-pre-wrap">
                          {course.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No courses available yet
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
