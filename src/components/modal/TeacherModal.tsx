import { BookOpenIcon, XIcon } from 'lucide-react'
import type { TeacherWithCourses } from '@/types/teacher'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'

type TeacherModalProps = {
  teacher: TeacherWithCourses | null
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
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-6">
            <div className="flex items-center gap-5">
              <div className="shrink-0">
                {teacher.avatarUrl ? (
                  <img
                    src={teacher.avatarUrl}
                    alt={teacher.fullName}
                    className="size-16 border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] font-serif text-xl text-[#E9D9B4]">
                    {initials}
                  </div>
                )}
              </div>
              <div>
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Teacher
                </div>
                <h2 className="mt-1 font-serif text-2xl text-[#F8F4EC]">
                  {teacher.fullName}
                </h2>
              </div>
            </div>
            <Button
              variant="ghost"
              theme="dark"
              size="icon"
              className="mt-1 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>

          {/* Bio */}
          {teacher.bio && (
            <div className="mb-6">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                About
              </div>
              <div className="max-h-[40vh] overflow-y-auto">
                <p className="mt-3 text-sm leading-7 whitespace-pre-wrap text-[#CFC6B7]">
                  {teacher.bio}
                </p>
              </div>
            </div>
          )}

          {/* Courses */}
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <span className="text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                Courses ({teacher.courseCount})
              </span>
            </div>

            <div className="max-h-[30vh] overflow-y-auto">
              {teacher.courses.length > 0 ? (
                <div className="divide-y divide-white/8 border border-white/10">
                  {teacher.courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-start gap-4 px-5 py-4"
                    >
                      <BookOpenIcon className="mt-0.5 size-3.5 shrink-0 text-[#C5A059]/60" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#F8F4EC]">
                            {course.title}
                          </span>
                          <span
                            className={`border px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.18em] uppercase ${
                              course.isPublished
                                ? 'border-[#C5A059]/40 text-[#9B7A41]'
                                : 'border-white/12 text-[#8E816D]'
                            }`}
                          >
                            {course.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        {course.description && (
                          <p className="mt-1 line-clamp-2 text-xs whitespace-pre-wrap text-[#8E816D]">
                            {course.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#8E816D] italic">
                  No courses available yet
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
