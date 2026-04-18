import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, BookOpenIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TeacherAvatars } from '@/components/avarats/TeacherAvatars'
import { Button } from '@/components/ui/button'

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
    courseTeachers?: Array<{
      teacher: {
        id: string
        fullName: string
        avatarUrl?: string | null
      }
    }>
    completedLessons?: number
    totalLessons?: number
    orderIndex: number | null
  }
  role: 'student' | 'teacher' | 'admin'
  variant?: 'light' | 'dark'
}

export function CourseCard({
  course,
  role,
  variant = 'dark',
}: CourseCardProps) {
  const navigate = useNavigate()
  const isTeacher = role === 'teacher' || role === 'admin'
  const lessonCount = course.lessons.length
  const progress =
    course.completedLessons && course.totalLessons
      ? Math.round((course.completedLessons / course.totalLessons) * 100)
      : 0
  const isDark = variant === 'dark'

  return (
    <div
      className={cn(
        'border',
        isDark
          ? 'border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]'
          : 'border-[#1A1A1A]/10 bg-[#F8F4EC] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.12)]',
      )}
    >
      {/* Image Area */}
      <div
        className={cn(
          'relative overflow-hidden border-b',
          isDark ? 'border-white/10' : 'border-[#1A1A1A]/8',
        )}
      >
        {course.thumbnailUrl ? (
          <div
            className="relative min-h-48 bg-cover bg-center sm:min-h-56"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.18), rgba(7,7,8,0.68)), url(${course.thumbnailUrl})`,
            }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%,rgba(197,160,89,0.10)_100%)]" />
            <div className="relative flex min-h-48 flex-col justify-between p-5 sm:min-h-56 sm:p-6">
              {/* Top row: status + number */}
              <div className="flex items-start justify-between">
                {isTeacher && (
                  <div
                    className={cn(
                      'border px-3 py-1.5 text-[0.62rem] font-medium tracking-[0.22em] uppercase backdrop-blur-sm',
                      course.isPublished
                        ? 'border-[#C5A059]/40 bg-black/20 text-[#D4B373]'
                        : 'border-white/12 bg-black/20 text-[#AFA28F]',
                    )}
                  >
                    {course.isPublished ? 'Published' : 'Draft'}
                  </div>
                )}
                <div className="border border-white/12 bg-black/18 px-3 py-2 text-[0.8rem] font-medium tracking-[0.26em] text-[#E9D9B4] uppercase">
                  {String(course.orderIndex ?? 0).padStart(2, '0')}
                </div>
              </div>

              {/* Bottom: info chip with teacher avatars */}
              <div className="flex items-end justify-between gap-3">
                {course.courseTeachers && course.courseTeachers.length > 0 && (
                  <div className="max-w-60 border border-white/12 bg-black/24 px-3 py-3 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
                    <div className="text-[0.58rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                      Teachers
                    </div>
                    <div className="mt-1.5">
                      <TeacherAvatars
                        teachers={course.courseTeachers.map((ct) => ct.teacher)}
                        size="sm"
                        showTooltip={true}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[0.62rem] font-medium tracking-[0.22em] text-[#AFA28F] uppercase">
                  <BookOpenIcon className="size-3" />
                  {lessonCount} lessons
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'flex min-h-48 items-center justify-center sm:min-h-56',
              isDark ? 'bg-[#1A1716]' : 'bg-[#EDE8DE]',
            )}
          >
            <BookOpenIcon
              className={cn(
                'size-16 opacity-20',
                isDark ? 'text-[#C5A059]' : 'text-[#9B7A41]',
              )}
            />
          </div>
        )}
      </div>

      {/* Detail Area */}
      <div
        className={cn(
          'px-5 py-5 sm:px-6 sm:py-6',
          isDark ? 'bg-[#151515]/88' : 'bg-[#F8F4EC]',
        )}
      >
        <h3
          className={cn(
            'font-serif text-lg leading-tight sm:text-xl',
            isDark ? 'text-[#F8F4EC]' : 'text-[#1C1815]',
          )}
        >
          {course.title}
        </h3>

        {course.description && (
          <p
            className={cn(
              'mt-2 line-clamp-2 text-sm leading-6',
              isDark ? 'text-[#CFC6B7]' : 'text-[#4E463D]',
            )}
          >
            {course.description}
          </p>
        )}

        {/* Progress bar for students */}
        {!isTeacher && course.completedLessons !== undefined && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-[0.68rem] font-medium tracking-[0.2em] uppercase',
                  isDark ? 'text-[#8E816D]' : 'text-[#5E5549]',
                )}
              >
                Progress
              </span>
              <span
                className={cn(
                  'font-serif text-sm',
                  isDark ? 'text-[#E9D9B4]' : 'text-[#9B7A41]',
                )}
              >
                {course.completedLessons}/{course.totalLessons}
              </span>
            </div>
            <div
              className={cn(
                'h-1 w-full overflow-hidden',
                isDark ? 'bg-white/8' : 'bg-[#1A1A1A]/8',
              )}
            >
              <div
                className="h-full bg-[#C5A059] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer action row */}
        <div
          className={cn(
            'mt-4 flex items-center justify-between border-t pt-4',
            isDark ? 'border-white/8' : 'border-[#1A1A1A]/8',
          )}
        >
          <span
            className={cn(
              'text-[0.68rem] font-medium tracking-[0.2em] uppercase',
              isDark ? 'text-[#8E816D]' : 'text-[#5E5549]',
            )}
          >
            {isTeacher ? 'Edit course' : 'View course'}
          </span>
          <Button
            className={cn(
              'flex size-8 cursor-pointer items-center justify-center border transition-all group-hover:translate-x-0.5',
              isDark
                ? 'border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] group-hover:border-[#D6B16E]'
                : 'border-[#9B7A41]/35 bg-[#EDE8DE] text-[#9B7A41] group-hover:border-[#C5A059]',
            )}
            onClick={() =>
              navigate({
                to: '/courses/$courseId',
                params: { courseId: course.id },
              })
            }
          >
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
