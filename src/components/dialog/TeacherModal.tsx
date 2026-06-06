import { XIcon } from 'lucide-react'
import type { TeacherWithCourse } from '@/types/teacher'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { GEM_IMAGE_MAP } from '@/utils/gems'

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
        className="h-[min(44rem,calc(100svh-2rem))] rounded-none border border-white/10 p-0 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-4xl lg:max-w-5xl"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Header with close button */}
          <DialogHeader className="absolute top-4 right-4 z-20">
            <div className="flex items-start justify-end">
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
          </DialogHeader>

          <DialogBody className="relative overflow-hidden">
            {/* Two-column layout */}
            <div className="grid h-full min-h-0 grid-rows-[minmax(16rem,0.88fr)_minmax(0,1.12fr)] lg:grid-cols-[minmax(16rem,0.92fr)_minmax(0,1.08fr)] lg:grid-rows-none">
              {/* Left: Image */}
              <div className="relative min-h-0 overflow-hidden border-b border-white/10 bg-[#171717] lg:border-r lg:border-b-0">
                {teacher.avatarUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${teacher.avatarUrl})`,
                    }}
                    role="img"
                    aria-label={teacher.fullName}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1A1716]">
                    <div className="flex size-28 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] font-serif text-4xl text-[#E9D9B4] lg:size-36">
                      {initials}
                    </div>
                  </div>
                )}

                {/* Gradient: darkens top and bottom, transparent in middle */}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,2,0.72)_0%,transparent_32%,transparent_58%,rgba(5,4,2,0.88)_100%)]" />

                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%,rgba(197,160,89,0.12)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-7 text-center sm:p-9">
                  {teacher.lecturerTitle && (
                    <div className="mt-6 text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                      {teacher.lecturerTitle}
                    </div>
                  )}
                  <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-0.04em] text-white sm:text-5xl">
                    {teacher.fullName}
                  </h2>
                </div>
              </div>

              {/* Right: Details */}
              <div className="flex min-h-0 flex-col overflow-hidden bg-[#151515]/88 px-7 py-10 sm:px-10 lg:px-12">
                {/* Name and role */}
                <div>
                  <div className="h-px w-12 bg-[#C5A059]/50" />
                  <div className="mt-5 flex items-end gap-4">
                    {teacher.gemstone && GEM_IMAGE_MAP[teacher.gemstone] && (
                      <img
                        src={GEM_IMAGE_MAP[teacher.gemstone]}
                        alt={teacher.gemstone}
                        className="size-16 object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
                      />
                    )}
                    <h3 className="font-serif text-[clamp(3rem,7vw,5.4rem)] leading-[0.88] tracking-[-0.06em] text-[#F8F4EC]">
                      about me
                    </h3>
                  </div>
                </div>

                {/* Bio */}
                {teacher.bio && (
                  <div className="mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-white/8 pt-7 pr-2">
                    <p className="text-sm leading-7 whitespace-pre-wrap text-[#D8D0C7] sm:text-base sm:leading-8">
                      {teacher.bio}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogBody>
        </div>
      </DialogContent>
    </Dialog>
  )
}
