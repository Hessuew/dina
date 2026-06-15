import {
  ArrowRight,
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  FolderOpenIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react'
import type { MediaLibraryRow } from '@/utils/library/library'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { DarkCard } from '@/components/ui/dark-card'
import { EmptyState } from '@/components/ui/empty-state'
import { MediaCard } from '@/components/library/MediaCard'
import { cn } from '@/lib/utils'

type Lesson = {
  id: string
  title: string
  content: string | null
  scheduledTime: Date | null
  duration: number | null
  isPublished: boolean | null
  orderIndex: number
}

type CoursePermissions = {
  canEdit: boolean
  isCourseTeacher: boolean
}

type CourseDetailSectionsProps = {
  course: {
    thumbnailUrl: string | null
    description: string | null
    lessons: Array<Lesson>
  }
  role: 'student' | 'teacher' | 'admin'
  permissions: CoursePermissions
  completedLessonIds: Array<string>
  assignmentData: {
    submittedCount: number
    gradedCount: number
    totalAssignments: number
  }
  materials: Array<MediaLibraryRow>
  showMaterials: boolean
  onCreateMaterial: () => void
  onEditMaterial: (material: MediaLibraryRow) => void
  onDeleteMaterial: (material: MediaLibraryRow) => void
  onCreateLesson: () => void
  onEditLesson: (lesson: Lesson) => void
  onDeleteLesson: (lesson: Lesson) => void
  onOpenLesson: (lessonId: string) => void
}

function CourseAboutCard({
  thumbnailUrl,
  description,
}: {
  thumbnailUrl: string | null
  description: string | null
}) {
  return (
    <div className="border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
      {thumbnailUrl && (
        <div className="relative overflow-hidden border-b border-white/10">
          <div
            className="relative min-h-72 bg-cover bg-center sm:min-h-80"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.18), rgba(7,7,8,0.68)), url(${thumbnailUrl})`,
            }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%,rgba(197,160,89,0.10)_100%)]" />
          </div>
        </div>
      )}
      <DarkCard label="About this course">
        {description ? (
          <p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-[#CFC6B7]">
            {description}
          </p>
        ) : (
          <p className="mt-4 text-sm text-[#8E816D] italic">
            No description provided.
          </p>
        )}
      </DarkCard>
    </div>
  )
}

function CourseProgressCard({
  assignmentData,
}: {
  assignmentData: CourseDetailSectionsProps['assignmentData']
}) {
  const completedCount =
    assignmentData.submittedCount + assignmentData.gradedCount
  const completionPct =
    assignmentData.totalAssignments > 0
      ? Math.round((completedCount / assignmentData.totalAssignments) * 100)
      : 0
  const submittedWidth =
    assignmentData.totalAssignments > 0
      ? (assignmentData.submittedCount / assignmentData.totalAssignments) * 100
      : 0
  const gradedWidth =
    assignmentData.totalAssignments > 0
      ? (assignmentData.gradedCount / assignmentData.totalAssignments) * 100
      : 0

  return (
    <div className="border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
      <DarkCard label="Your Progress">
        <div>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="font-serif text-2xl text-[#E9D9B4]">
              {completedCount}
            </span>
            <span className="text-[0.68rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
              of {assignmentData.totalAssignments} assignment
              {assignmentData.totalAssignments !== 1 ? 's' : ''} submitted
            </span>
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden bg-white/8">
            <div className="flex h-full">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${submittedWidth}%` }}
              />
              <div
                className="h-full bg-[#9B7A41] transition-all"
                style={{ width: `${gradedWidth}%` }}
              />
            </div>
          </div>
          <p className="mt-2 text-[0.65rem] font-medium tracking-[0.12em] text-[#8E816D]">
            {assignmentData.submittedCount} submitted,{' '}
            {assignmentData.gradedCount} graded ({completionPct}%) of{' '}
            {assignmentData.totalAssignments} assignments
          </p>
        </div>
      </DarkCard>
    </div>
  )
}

function SectionHeader({
  title,
  count,
  singular,
  action,
}: {
  title: string
  count: number
  singular: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
      <div>
        <div className="h-px w-8 bg-[#C5A059]/40" />
        <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
          {title}
        </div>
        <div className="mt-1 font-serif text-xl text-[#F8F4EC]">
          {count} {count === 1 ? singular : `${singular}s`}
        </div>
      </div>
      {action}
    </div>
  )
}

function MaterialsSection({
  materials,
  role,
  permissions,
  onCreateMaterial,
  onEditMaterial,
  onDeleteMaterial,
}: Pick<
  CourseDetailSectionsProps,
  | 'materials'
  | 'role'
  | 'permissions'
  | 'onCreateMaterial'
  | 'onEditMaterial'
  | 'onDeleteMaterial'
>) {
  const canManage = permissions.canEdit && permissions.isCourseTeacher

  return (
    <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      <SectionHeader
        title="Materials"
        count={materials.length}
        singular="Material"
        action={
          canManage && (
            <Button theme="dark" onClick={onCreateMaterial}>
              <PlusIcon className="size-3.5" />
              Add Material
            </Button>
          )
        }
      />

      {materials.length === 0 ? (
        <EmptyState
          icon={FolderOpenIcon}
          message="No materials yet"
          actionLabel="Add Material"
          onAction={onCreateMaterial}
          showAction={canManage}
          variant="dark"
        />
      ) : (
        <div className="px-6 py-5">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {materials.map((material) => (
              <div key={material.id} className="group relative shrink-0">
                <MediaCard item={material} viewerRole={role} size="panel" />
                {canManage && (
                  <div
                    className="absolute top-1 left-1 hidden group-hover:flex"
                    onClick={(e) => e.preventDefault()}
                  >
                    <EntityHeaderActions
                      status="published"
                      canEdit={permissions.canEdit}
                      isCourseTeacher={permissions.isCourseTeacher}
                      showStatus={false}
                      theme="dark"
                      size="sm"
                      onEdit={() => onEditMaterial(material)}
                      onDelete={() => onDeleteMaterial(material)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LessonActions({
  lesson,
  role,
  isPublished,
  isCompleted,
  permissions,
  onOpenLesson,
  onEditLesson,
  onDeleteLesson,
}: {
  lesson: Lesson
  role: CourseDetailSectionsProps['role']
  isPublished: boolean
  isCompleted: boolean
  permissions: CoursePermissions
  onOpenLesson: (lessonId: string) => void
  onEditLesson: (lesson: Lesson) => void
  onDeleteLesson: (lesson: Lesson) => void
}) {
  const canManage = permissions.canEdit && permissions.isCourseTeacher

  return (
    <div
      className="flex shrink-0 items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {role === 'student' &&
        isPublished &&
        (isCompleted ? (
          <span className="border border-[#C5A059]/40 px-2.5 py-1 text-[0.6rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase">
            Completed
          </span>
        ) : (
          <Button
            variant="ghost"
            theme="dark"
            size="icon"
            className="size-8 border border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] hover:border-[#D6B16E]"
            onClick={() => onOpenLesson(lesson.id)}
          >
            <ArrowRight className="size-3.5" />
          </Button>
        ))}
      {canManage && (
        <>
          <Button
            variant="ghost"
            theme="dark"
            size="icon"
            className="size-7 border border-white/10 text-[#8E816D] hover:border-[#C5A059]/40 hover:text-[#D4B373]"
            onClick={() => onEditLesson(lesson)}
          >
            <PencilIcon className="size-3" />
          </Button>
          <Button
            variant="ghost"
            theme="dark"
            size="icon"
            className="size-7 border border-white/10 text-[#8E816D] hover:border-red-400/50 hover:text-red-400"
            onClick={() => onDeleteLesson(lesson)}
          >
            <TrashIcon className="size-3" />
          </Button>
        </>
      )}
    </div>
  )
}

function LessonRow({
  lesson,
  index,
  isCompleted,
  role,
  permissions,
  onOpenLesson,
  onEditLesson,
  onDeleteLesson,
}: {
  lesson: Lesson
  index: number
  isCompleted: boolean
  role: CourseDetailSectionsProps['role']
  permissions: CoursePermissions
  onOpenLesson: (lessonId: string) => void
  onEditLesson: (lesson: Lesson) => void
  onDeleteLesson: (lesson: Lesson) => void
}) {
  const isPublished = lesson.isPublished ?? false
  const showContent = isPublished || permissions.canEdit

  return (
    <div
      className={cn(
        'group flex items-start gap-4 px-6 py-5 transition-all',
        showContent ? 'cursor-pointer hover:bg-white/5' : 'opacity-40',
      )}
      onClick={() => {
        if (showContent) onOpenLesson(lesson.id)
      }}
    >
      <div className="flex size-8 shrink-0 items-center justify-center border border-[#C5A059]/40 bg-[#1A1716] font-serif text-xs text-[#E9D9B4]">
        {String(index + 1).padStart(2, '0')}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[0.62rem] font-medium tracking-[0.26em] text-[#D4B373] uppercase">
            {lesson.title}
          </span>
          {permissions.canEdit && permissions.isCourseTeacher && (
            <StatusChip
              variant={isPublished ? 'published' : 'draft'}
              size="sm"
            />
          )}
        </div>

        {showContent && lesson.content && (
          <p className="mt-1 line-clamp-2 text-sm whitespace-pre-wrap text-[#CFC6B7]">
            {lesson.content}
          </p>
        )}

        {showContent && (
          <div className="mt-2 flex items-center gap-4 text-[0.68rem] text-[#8E816D]">
            {lesson.duration && (
              <div className="flex items-center gap-1">
                <ClockIcon className="size-3" />
                <span>{lesson.duration} min</span>
              </div>
            )}
            {lesson.scheduledTime && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="size-3" />
                <span>
                  {new Date(lesson.scheduledTime).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <LessonActions
        lesson={lesson}
        role={role}
        isPublished={isPublished}
        isCompleted={isCompleted}
        permissions={permissions}
        onOpenLesson={onOpenLesson}
        onEditLesson={onEditLesson}
        onDeleteLesson={onDeleteLesson}
      />
    </div>
  )
}

function LessonsSection({
  lessons,
  role,
  permissions,
  completedLessonIds,
  onCreateLesson,
  onEditLesson,
  onDeleteLesson,
  onOpenLesson,
}: Pick<
  CourseDetailSectionsProps,
  | 'role'
  | 'permissions'
  | 'completedLessonIds'
  | 'onCreateLesson'
  | 'onEditLesson'
  | 'onDeleteLesson'
  | 'onOpenLesson'
> & {
  lessons: Array<Lesson>
}) {
  const canManage = permissions.canEdit && permissions.isCourseTeacher

  return (
    <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      <SectionHeader
        title="Lessons"
        count={lessons.length}
        singular="Lesson"
        action={
          canManage &&
          lessons.length < 3 && (
            <Button theme="dark" onClick={onCreateLesson}>
              <PlusIcon className="size-3.5" />
              Add Lesson
            </Button>
          )
        }
      />

      {lessons.length === 0 ? (
        <EmptyState
          icon={BookOpenIcon}
          message="No lessons yet"
          actionLabel="Create First Lesson"
          onAction={onCreateLesson}
          showAction={canManage}
          variant="dark"
        />
      ) : (
        <div className="divide-y divide-white/8">
          {lessons.map((lesson, index) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              index={index}
              isCompleted={completedLessonIds.includes(lesson.id)}
              role={role}
              permissions={permissions}
              onOpenLesson={onOpenLesson}
              onEditLesson={onEditLesson}
              onDeleteLesson={onDeleteLesson}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CourseDetailSections({
  course,
  role,
  permissions,
  completedLessonIds,
  assignmentData,
  materials,
  showMaterials,
  onCreateMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onCreateLesson,
  onEditLesson,
  onDeleteLesson,
  onOpenLesson,
}: CourseDetailSectionsProps) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <CourseAboutCard
          thumbnailUrl={course.thumbnailUrl}
          description={course.description}
        />
        {!permissions.canEdit && (
          <CourseProgressCard assignmentData={assignmentData} />
        )}
      </div>

      <div className="flex flex-col gap-6">
        {showMaterials && (
          <MaterialsSection
            materials={materials}
            role={role}
            permissions={permissions}
            onCreateMaterial={onCreateMaterial}
            onEditMaterial={onEditMaterial}
            onDeleteMaterial={onDeleteMaterial}
          />
        )}
        <LessonsSection
          lessons={course.lessons}
          role={role}
          permissions={permissions}
          completedLessonIds={completedLessonIds}
          onCreateLesson={onCreateLesson}
          onEditLesson={onEditLesson}
          onDeleteLesson={onDeleteLesson}
          onOpenLesson={onOpenLesson}
        />
      </div>
    </div>
  )
}
