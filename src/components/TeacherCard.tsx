import { BookOpenIcon, UserIcon } from 'lucide-react'
import type { TeacherWithCourses } from '@/types/teacher'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

type TeacherCardProps = {
  teacher: TeacherWithCourses
  onClick: () => void
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

export function TeacherCard({ teacher, onClick }: TeacherCardProps) {
  const initials = getInitials(teacher.fullName)
  const avatarColor = getAvatarColor(teacher.id)

  return (
    <Card
      className="group relative cursor-pointer overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/30 shadow-sm transition-all hover:shadow-lg"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative">
        <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-t-lg bg-linear-to-br from-primary/10 to-purple-500/10">
          {teacher.avatarUrl ? (
            <img
              src={teacher.avatarUrl}
              alt={teacher.fullName}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={`flex size-24 items-center justify-center rounded-full ${avatarColor} text-2xl font-bold text-white transition-transform duration-500 group-hover:scale-110`}
            >
              {initials}
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      </div>

      <CardHeader className="relative space-y-2 pb-3">
        <h3 className="line-clamp-2 text-lg font-bold leading-tight">
          {teacher.fullName}
        </h3>
      </CardHeader>

      <CardContent className="relative space-y-3 pb-3">
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-md bg-linear-to-r from-primary/10 to-transparent px-2 py-1.5">
            <BookOpenIcon className="size-3.5 text-primary" />
            <span className="font-semibold">{teacher.courseCount}</span>
            <span className="text-muted-foreground">
              {teacher.courseCount === 1 ? 'course' : 'courses'}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="relative gap-2 pt-3">
        <div className="flex w-full items-center justify-center gap-2 rounded-md bg-linear-to-r from-primary to-primary/80 px-3 py-2 text-xs font-medium text-white">
          <UserIcon className="size-3.5" />
          View Profile
        </div>
      </CardFooter>
    </Card>
  )
}
