import { UserIcon } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type Teacher = {
  id: string
  fullName: string
  avatarUrl?: string | null
}

type TeacherAvatarsProps = {
  teachers: Array<Teacher>
  size?: 'sm' | 'default' | 'lg'
  showTooltip?: boolean
}

export function TeacherAvatars({
  teachers,
  size = 'default',
  showTooltip = true,
}: TeacherAvatarsProps) {
  if (teachers.length === 0) {
    return null
  }

  return (
    <AvatarGroup>
      {teachers.map((teacher) => {
        const avatar = (
          <Avatar key={teacher.id} size={size}>
            {teacher.avatarUrl ? (
              <AvatarImage src={teacher.avatarUrl} alt={teacher.fullName} />
            ) : null}
            <AvatarFallback>
              <UserIcon className="size-4" />
            </AvatarFallback>
          </Avatar>
        )

        if (!showTooltip) {
          return avatar
        }

        return (
          <Tooltip key={teacher.id}>
            <TooltipTrigger>{avatar}</TooltipTrigger>
            <TooltipContent>
              <p>{teacher.fullName}</p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </AvatarGroup>
  )
}
