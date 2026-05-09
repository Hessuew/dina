import { HashIcon, UserIcon, XIcon } from 'lucide-react'
import type { TeacherWithCourse } from '@/types/teacher'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'

type TeacherModalProps = {
  teacher: TeacherWithCourse | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ')
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

export function TeacherModal({
  teacher,
  open,
  onOpenChange,
}: TeacherModalProps) {
  if (!teacher) return null

  const initials = getInitials(teacher.fullName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-y-auto rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-2xl"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />

        <div className="relative">
          {/* Header with close button */}
          <div className="absolute top-0 right-0 z-10">
            <Button
              variant="ghost"
              theme="dark"
              size="icon"
              className="shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>

          {/* Two-column layout */}
          <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
            {/* Left: Image */}
            <div className="shrink-0">
              {teacher.avatarUrl ? (
                <img
                  src={teacher.avatarUrl}
                  alt={teacher.fullName}
                  className="size-28 border border-white/10 object-cover lg:size-32"
                />
              ) : (
                <div className="flex size-28 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] font-serif text-3xl text-[#E9D9B4] lg:size-32">
                  {initials}
                </div>
              )}
            </div>

            {/* Right: Details */}
            <div className="space-y-6">
              {/* Name and role */}
              <div>
                <div className="text-[0.62rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                  Faculty Member
                </div>
                <h2 className="mt-2 font-serif text-3xl text-[#F8F4EC] lg:text-4xl">
                  {teacher.fullName}
                </h2>
                {teacher.course && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-px w-6 bg-[#C5A059]/40" />
                    <span className="text-sm text-[#CFC6B7]">
                      Teaching:{' '}
                      {teacher.course.title.replace(/Stage \d+:/i, '')}
                    </span>
                  </div>
                )}
              </div>

              {/* Characteristic */}
              {teacher.bio && (
                <div className="flex items-center gap-3 text-sm text-[#CFC6B7]">
                  <HashIcon className="size-4 shrink-0 text-[#C5A059]/60" />
                  <span className="line-clamp-1">
                    Wisdom, character, and experience
                  </span>
                </div>
              )}

              {/* Bio */}
              {teacher.bio && (
                <div>
                  <div className="h-px w-8 bg-[#C5A059]/40" />
                  <div className="mt-3 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                    About
                  </div>
                  <div className="h-[40vh] overflow-y-auto">
                    <p className="mt-3 text-sm leading-7 whitespace-pre-wrap text-[#CFC6B7]">
                      {teacher.bio}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
