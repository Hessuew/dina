import { useState } from 'react'
import type { TeacherWithCourse } from '@/types/teacher'
import { TeacherCard } from '@/components/card/teacher-card/TeacherCard'
import { TeacherModal } from '@/components/dialog/TeacherModal'

type TeachersViewProps = {
  teachers: Array<TeacherWithCourse>
}

export function TeachersView({ teachers }: TeachersViewProps) {
  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherWithCourse | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleTeacherClick = (teacher: TeacherWithCourse) => {
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
        <div className="mb-10">
          <div className="h-px w-10 bg-[#C5A059]/50" />
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
            Teachers
          </h2>
          <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
            Browse all teachers in the system
          </p>
        </div>

        <div className="flex flex-col items-center justify-center border border-[#1A1A1A]/8 p-12 text-center">
          <h3 className="mb-2 font-serif text-lg text-[#1C1815]">
            No teachers yet
          </h3>
          <p className="text-sm text-[#8E816D]">
            Teachers will appear here once they are added to the system
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="mb-10">
          <div className="h-px w-10 bg-[#C5A059]/50" />
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
            Teachers
          </h2>
          <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
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
