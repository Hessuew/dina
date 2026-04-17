import { createFileRoute } from '@tanstack/react-router'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { TeachersView } from '@/components/view/TeachersView'
import { getTeachers } from '@/utils/teachers'

export const Route = createFileRoute('/_authed/teachers')({
  loader: async () => {
    const result = await getTeachers()
    return {
      teachers: result.teachers,
    }
  },
  component: TeachersComponent,
})

function TeachersComponent() {
  const { teachers } = Route.useLoaderData()

  return (
    <div
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
        <TeachersView teachers={teachers} />
      </div>
    </div>
  )
}
