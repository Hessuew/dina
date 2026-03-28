import { useState } from 'react'
import { TeacherCard } from './TeacherCard'
import { TeacherModal } from './TeacherModal'
import type { TeacherWithCourses } from '@/types/teacher'

type TeachersViewProps = {
  teachers: Array<TeacherWithCourses>
}

export function TeachersView({ teachers }: TeachersViewProps) {
  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherWithCourses | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleTeacherClick = (teacher: TeacherWithCourses) => {
    setSelectedTeacher(teacher)
    setModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    setModalOpen(open)
    if (!open) {
      setTimeout(() => setSelectedTeacher(null), 200)
    }
  }

  if (teachers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Teachers</h2>
          <p className="text-muted-foreground mt-1">
            Browse all teachers in the system
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">No teachers yet</h3>
          <p className="text-muted-foreground text-sm">
            Teachers will appear here once they are added to the system
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Teachers</h2>
          <p className="text-muted-foreground mt-1">
            Browse all teachers in the system
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {teachers.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onClick={() => handleTeacherClick(teacher)}
            />
          ))}
        </div>
      </div>

      <TeacherModal
        teacher={selectedTeacher}
        open={modalOpen}
        onOpenChange={handleModalClose}
      />
    </>
  )
}
