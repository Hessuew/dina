import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../../utils/supabase'
import type { EnrollmentWithCourse } from '../../types/database.types'

const getStudentEnrollments = createServerFn({ method: 'GET' }).handler(
  async () => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { data, error } = await supabase
      .from('enrollments')
      .select('*, courses(*)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as EnrollmentWithCourse[]
  },
)

export const Route = createFileRoute('/student/dashboard')({
  loader: async () => {
    const enrollments = await getStudentEnrollments()
    return { enrollments }
  },
  component: StudentDashboard,
})

function StudentDashboard() {
  const { enrollments } = Route.useLoaderData()

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Enrolled Courses</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {enrollments.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {enrollments.filter((e) => e.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Completed</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {enrollments.filter((e) => e.status === 'completed').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">My Courses</h2>
        </div>
        <div className="p-6">
          {enrollments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              You are not enrolled in any courses yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {enrollment.courses.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {enrollment.courses.description}
                  </p>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{enrollment.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${enrollment.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        enrollment.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : enrollment.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {enrollment.status}
                    </span>
                    <button className="text-sm text-blue-600 hover:underline">
                      Continue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
