import { createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { MediaLibraryRow } from '@/utils/library/library'
import { useDialogState } from '@/hooks/useDialogState'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { useMutation } from '@/hooks/useMutation'
import { TeacherAvatars } from '@/components/avatars/TeacherAvatars'
import { CourseDialog } from '@/components/dialog/course-dialog/CourseDialog'
import { LessonDialog } from '@/components/dialog/lesson-dialog/LessonDialog'
import { MediaDialog } from '@/components/dialog/media-dialog/MediaDialog'
import { deleteCourse, getCourse } from '@/utils/courses'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { CourseDetailSections } from '@/components/course/CourseDetailSections'
import {
  buildCourseEditData,
  buildLessonInitialData,
  buildMediaDialogKey,
  getCourseStatus,
  handleDialogDismiss,
  isDialogModeActive,
  shouldShowMaterials,
} from '@/utils/courses/domain/course-detail.domain'

export const Route = createFileRoute('/_authed/courses/$courseId')({
  loader: async ({ params }) => {
    const data = await getCourse({ data: { courseId: params.courseId } })
    return data
  },
  component: CourseDetailComponent,
})

type Lesson = {
  id: string
  title: string
  content: string | null
  scheduledTime: Date | null
  duration: number | null
  isPublished: boolean | null
  orderIndex: number
}

type CourseEditData = {
  courseId: string
  title: string
  description: string
  thumbnailUrl: string | null
  isPublished: boolean
  teacher1Id: string | null
  teacher2Id: string | null
  orderIndex: number
}

function CourseDetailComponent() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const { course, role, completedLessonIds, assignmentData, permissions } =
    loaderData

  const courseDialog = useDialogState<CourseEditData>()
  const lessonDialog = useDialogState<Lesson>()
  const materialDialog = useDialogState<MediaLibraryRow>()

  const courseTeachersData = course.courseTeachers
  const materials = course.mediaFiles

  const deleteCourseMutation = useMutation({
    fn: deleteCourse,
    onSuccess: () => {
      toast.success('Course deleted successfully!')
    },
  })

  const showMaterials = shouldShowMaterials(permissions.canEdit, materials)

  return (
    <PageLayout>
      <PageHeader
        title={course.title}
        onBack={() => router.navigate({ to: '/dashboard' })}
        metadata={
          course.courseTeachers.length > 0 && (
            <>
              <span className="text-[0.65rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
                Teachers
              </span>
              <TeacherAvatars
                teachers={course.courseTeachers.map((ct) => ct.teacher)}
                size="sm"
                showTooltip={true}
              />
            </>
          )
        }
        actions={
          <EntityHeaderActions
            status={getCourseStatus(course.isPublished)}
            canEdit={permissions.canEdit}
            isCourseTeacher={permissions.isCourseTeacher}
            onEdit={() => {
              courseDialog.openDialog(
                'edit',
                buildCourseEditData(course, courseTeachersData),
              )
            }}
            onDelete={() => courseDialog.openDialog('delete')}
          />
        }
      />

      <CourseDetailSections
        course={course}
        role={role}
        permissions={permissions}
        completedLessonIds={completedLessonIds}
        assignmentData={assignmentData}
        materials={materials}
        showMaterials={showMaterials}
        onCreateMaterial={() => materialDialog.openDialog('create')}
        onEditMaterial={(material) =>
          materialDialog.openDialog('edit', material)
        }
        onDeleteMaterial={(material) =>
          materialDialog.openDialog('delete', material)
        }
        onCreateLesson={() => lessonDialog.openDialog('create')}
        onEditLesson={(lesson) => lessonDialog.openDialog('edit', lesson)}
        onDeleteLesson={(lesson) => lessonDialog.openDialog('delete', lesson)}
        onOpenLesson={(lessonId) =>
          router.navigate({
            to: '/lessons/$lessonId',
            params: { lessonId },
          })
        }
      />

      {/* Edit Course Dialog */}
      <CourseDialog
        open={isDialogModeActive(
          courseDialog.isOpen,
          courseDialog.dialogMode,
          'edit',
        )}
        onOpenChange={(open) =>
          handleDialogDismiss(open, courseDialog.closeDialog)
        }
        mode="edit"
        isAdmin={permissions.isAdmin}
        initialData={courseDialog.dialogItem}
      />

      {/* Delete Course Dialog */}
      <DeleteConfirmDialog
        open={isDialogModeActive(
          courseDialog.isOpen,
          courseDialog.dialogMode,
          'delete',
        )}
        onOpenChange={(open) =>
          handleDialogDismiss(open, courseDialog.closeDialog)
        }
        entityName="Course"
        onConfirm={() =>
          deleteCourseMutation.mutate({
            data: { courseId: course.id },
          })
        }
        isDeleting={deleteCourseMutation.isPending}
        navigateTo="/dashboard"
      />

      {/* Lesson Dialog (create / edit / delete) */}
      {lessonDialog.isOpen && (
        <LessonDialog
          open={true}
          onOpenChange={(open) =>
            handleDialogDismiss(open, lessonDialog.closeDialog)
          }
          mode={lessonDialog.dialogMode as 'create' | 'edit' | 'delete'}
          courseId={course.id}
          lessonCount={course.lessons.length}
          initialData={buildLessonInitialData(lessonDialog.dialogItem)}
        />
      )}

      {/* Material Dialog (create / edit / delete) */}
      {materialDialog.isOpen && (
        <MediaDialog
          key={buildMediaDialogKey(
            materialDialog.dialogMode,
            materialDialog.dialogItem,
          )}
          open={true}
          onOpenChange={(open) =>
            handleDialogDismiss(open, materialDialog.closeDialog)
          }
          mode={materialDialog.dialogMode as 'create' | 'edit' | 'delete'}
          media={materialDialog.dialogItem}
          courseId={course.id}
          onSuccess={() => router.invalidate()}
        />
      )}
    </PageLayout>
  )
}
