import { createFileRoute, useRouter } from '@tanstack/react-router'
import { FileTextIcon } from 'lucide-react'
import type { EnrollmentRow } from '@/components/table/EnrollmentsTable'
import { Button } from '@/components/ui/button'
import { EnrollmentsTable } from '@/components/table/EnrollmentsTable'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { checkAdminAccess } from '@/utils/admin'
import { getEnrollments } from '@/utils/enrollments'

export const Route = createFileRoute('/_authed/enrollments')({
  beforeLoad: async () => {
    await checkAdminAccess()
  },
  loader: async () => {
    const result = await getEnrollments()
    return { enrollments: result.enrollments }
  },
  component: EnrollmentsPage,
})

function EnrollmentsPage() {
  const { enrollments } = Route.useLoaderData()
  const router = useRouter()

  const handleRefresh = () => {
    router.invalidate()
  }

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
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <div className="h-px w-10 bg-[#C5A059]/50" />
            <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
              Enrollments
            </h1>
            <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
              Review public enrolment submissions
            </p>
          </div>
          <Button
            theme="light"
            variant="outline"
            onClick={() => handleRefresh()}
          >
            <FileTextIcon className="size-3.5" />
            Refresh
          </Button>
        </div>

        <EnrollmentsTable
          enrollments={enrollments as Array<EnrollmentRow>}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
}
