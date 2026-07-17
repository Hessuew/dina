import type { StudentViewPerson } from '@/utils/discipleship/domain/discipleship-student-view.domain'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function StudentPersonRow({ person }: { person: StudentViewPerson }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar size="sm">
        <AvatarImage src={person.avatarUrl ?? undefined} />
        <AvatarFallback>{initials(person.fullName)}</AvatarFallback>
      </Avatar>
      <p className="truncate text-sm font-medium text-[#2B2417]">
        {person.fullName}
      </p>
    </div>
  )
}
