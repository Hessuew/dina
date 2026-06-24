import { ArrowRight, BookOpenIcon } from 'lucide-react'
import type {
  CourseCardRole,
  CourseCardVariant,
} from '@/components/card/domain/course-card.domain'
import { cn } from '@/lib/utils'
import { TeacherAvatars } from '@/components/avatars/TeacherAvatars'
import { ButtonLink } from '@/components/ui/button-link'
import { buildCourseCardViewModel } from '@/components/card/domain/course-card.domain'

type CourseCardProps = {
  course: {
    id: string
    title: string
    description: string | null
    thumbnailUrl: string | null
    isPublished: boolean
    lessons: Array<{ id: string }>
    courseTeachers?: Array<{
      teacher: {
        id: string
        fullName: string
        avatarUrl?: string | null
      }
    }>
    submittedAssignments?: number
    gradedAssignments?: number
    totalAssignments?: number
    orderIndex: number | null
  }
  role: CourseCardRole
  variant?: CourseCardVariant
}

type CourseCardCourse = CourseCardProps['course']

type CourseCardTheme = {
  card: string
  imageBorder: string
  placeholder: string
  placeholderIcon: string
  detail: string
  title: string
  description: string
  mutedLabel: string
  accent: string
  divider: string
  progressTrack: string
  footerButton: string
}

function getCourseCardTheme(isDark: boolean): CourseCardTheme {
  if (isDark) {
    return {
      card: 'border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]',
      imageBorder: 'border-white/10',
      placeholder: 'bg-[#1A1716]',
      placeholderIcon: 'text-[#C5A059]',
      detail: 'bg-[#151515]/88',
      title: 'text-[#F8F4EC]',
      description: 'text-[#CFC6B7]',
      mutedLabel: 'text-[#8E816D]',
      accent: 'text-[#E9D9B4]',
      divider: 'border-white/8',
      progressTrack: 'bg-white/8',
      footerButton:
        'border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] group-hover:border-[#D6B16E]',
    }
  }

  return {
    card: 'border-[#1A1A1A]/10 bg-[#F8F4EC] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.12)]',
    imageBorder: 'border-[#1A1A1A]/8',
    placeholder: 'bg-[#EDE8DE]',
    placeholderIcon: 'text-[#9B7A41]',
    detail: 'bg-[#F8F4EC]',
    title: 'text-[#1C1815]',
    description: 'text-[#4E463D]',
    mutedLabel: 'text-[#5E5549]',
    accent: 'text-[#9B7A41]',
    divider: 'border-[#1A1A1A]/8',
    progressTrack: 'bg-[#1A1A1A]/8',
    footerButton:
      'border-[#9B7A41]/35 bg-[#EDE8DE] text-[#9B7A41] group-hover:border-[#C5A059]',
  }
}

function CourseStatusBadge({ isPublished }: { isPublished: boolean }) {
  return (
    <div
      className={cn(
        'border px-3 py-1.5 text-[0.62rem] font-medium tracking-[0.22em] uppercase backdrop-blur-sm',
        isPublished
          ? 'border-[#C5A059]/40 bg-black/20 text-[#D4B373]'
          : 'border-white/12 bg-black/20 text-[#AFA28F]',
      )}
    >
      {isPublished ? 'Published' : 'Draft'}
    </div>
  )
}

function CourseTeacherChip({
  courseTeachers,
}: {
  courseTeachers: CourseCardCourse['courseTeachers']
}) {
  if (!courseTeachers?.length) return null

  return (
    <div className="max-w-60 border border-white/12 bg-black/24 px-3 py-3 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
      <div className="text-[0.58rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
        Teachers
      </div>
      <div className="mt-1.5">
        <TeacherAvatars
          teachers={courseTeachers.map((ct) => ct.teacher)}
          size="sm"
          showTooltip={true}
        />
      </div>
    </div>
  )
}

function CourseImage({
  course,
  isTeacher,
  lessonCount,
  theme,
}: {
  course: CourseCardCourse
  isTeacher: boolean
  lessonCount: number
  theme: CourseCardTheme
}) {
  if (!course.thumbnailUrl) {
    return (
      <div
        className={cn(
          'flex min-h-48 items-center justify-center sm:min-h-56',
          theme.placeholder,
        )}
      >
        <BookOpenIcon
          className={cn('size-16 opacity-20', theme.placeholderIcon)}
        />
      </div>
    )
  }

  return (
    <div
      className="relative min-h-48 bg-cover bg-center sm:min-h-56"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.18), rgba(7,7,8,0.68)), url(${course.thumbnailUrl})`,
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%,rgba(197,160,89,0.10)_100%)]" />
      <div className="relative flex min-h-48 flex-col justify-between p-5 sm:min-h-56 sm:p-6">
        <div className="flex items-start justify-between">
          {isTeacher && <CourseStatusBadge isPublished={course.isPublished} />}
          <div className="border border-white/12 bg-black/18 px-3 py-2 text-[0.8rem] font-medium tracking-[0.26em] text-[#E9D9B4] uppercase">
            {String(course.orderIndex ?? 0).padStart(2, '0')}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <CourseTeacherChip courseTeachers={course.courseTeachers} />
          <div className="flex items-center gap-1.5 text-[0.62rem] font-medium tracking-[0.22em] text-[#AFA28F] uppercase">
            <BookOpenIcon className="size-3" />
            {lessonCount} lessons
          </div>
        </div>
      </div>
    </div>
  )
}

function CourseProgress({
  submittedCount,
  gradedCount,
  totalAssignments,
  theme,
}: {
  submittedCount: number
  gradedCount: number
  totalAssignments: number
  theme: CourseCardTheme
}) {
  const submittedWidth =
    totalAssignments > 0 ? (submittedCount / totalAssignments) * 100 : 0
  const gradedWidth =
    totalAssignments > 0 ? (gradedCount / totalAssignments) * 100 : 0

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-[0.68rem] font-medium tracking-[0.2em] uppercase',
            theme.mutedLabel,
          )}
        >
          Progress
        </span>
        <span className={cn('font-serif text-sm', theme.accent)}>
          <span className="text-xs text-[#8E816D]">Assignments:</span>{' '}
          {submittedCount + gradedCount}/{totalAssignments}
        </span>
      </div>
      <div className={cn('h-1 w-full overflow-hidden', theme.progressTrack)}>
        <div className="flex h-full">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${submittedWidth}%` }}
          />
          <div
            className="h-full bg-yellow-500 transition-all"
            style={{ width: `${gradedWidth}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function CourseCardFooter({
  courseId,
  isTeacher,
  theme,
}: {
  courseId: string
  isTeacher: boolean
  theme: CourseCardTheme
}) {
  return (
    <div
      className={cn(
        'mt-4 flex items-center justify-between border-t pt-4',
        theme.divider,
      )}
    >
      <span
        className={cn(
          'text-[0.68rem] font-medium tracking-[0.2em] uppercase',
          theme.mutedLabel,
        )}
      >
        {isTeacher ? 'Edit course' : 'View course'}
      </span>
      <ButtonLink
        to="/courses/$courseId"
        params={{ courseId }}
        className={cn(
          'flex size-8 cursor-pointer items-center justify-center border',
          theme.footerButton,
        )}
      >
        <ArrowRight className="size-3.5" />
      </ButtonLink>
    </div>
  )
}

export function CourseCard({
  course,
  role,
  variant = 'dark',
}: CourseCardProps) {
  const {
    isTeacher,
    lessonCount,
    submittedCount,
    gradedCount,
    totalAssignments,
    isDark,
    hasDescription,
    showProgress,
  } = buildCourseCardViewModel({ course, role, variant })
  const theme = getCourseCardTheme(isDark)

  return (
    <div className={cn('border', theme.card)}>
      <div
        className={cn('relative overflow-hidden border-b', theme.imageBorder)}
      >
        <CourseImage
          course={course}
          isTeacher={isTeacher}
          lessonCount={lessonCount}
          theme={theme}
        />
      </div>

      <div className={cn('px-5 py-5 sm:px-6 sm:py-6', theme.detail)}>
        <h3
          className={cn(
            'font-serif text-lg leading-tight sm:text-xl',
            theme.title,
          )}
        >
          {course.title}
        </h3>

        {hasDescription && (
          <p
            className={cn(
              'mt-2 line-clamp-2 text-sm leading-6 whitespace-pre-wrap',
              theme.description,
            )}
          >
            {course.description}
          </p>
        )}

        {showProgress && (
          <CourseProgress
            submittedCount={submittedCount}
            gradedCount={gradedCount}
            totalAssignments={totalAssignments}
            theme={theme}
          />
        )}

        <CourseCardFooter
          courseId={course.id}
          isTeacher={isTeacher}
          theme={theme}
        />
      </div>
    </div>
  )
}
