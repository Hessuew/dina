import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../../utils/supabase'
import type { Course, Inquiry } from '../../types/database.types'

const getTeacherData = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const [coursesResult, inquiriesResult, enrollmentsResult] =
    await Promise.all([
      supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('inquiries')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('enrollments')
        .select('*, courses!inner(*)')
        .eq('courses.teacher_id', user.id),
    ])

  if (coursesResult.error) throw coursesResult.error
  if (inquiriesResult.error) throw inquiriesResult.error
  if (enrollmentsResult.error) throw enrollmentsResult.error

  return {
    courses: coursesResult.data as Course[],
    inquiries: inquiriesResult.data as Inquiry[],
    totalStudents: enrollmentsResult.data?.length || 0,
  }
})

export const Route = createFileRoute('/teacher/dashboard')({
  loader: async () => {
    const data = await getTeacherData()
    return data
  },
  component: TeacherDashboard,
})

function TeacherDashboard() {
  const { courses, inquiries, totalStudents } = Route.useLoaderData()

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Teacher Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Courses</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {courses.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">
            Published Courses
          </h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {courses.filter((c) => c.is_published).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Students</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {totalStudents}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">
            Pending Inquiries
          </h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {inquiries.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">My Courses</h2>
          </div>
          <div className="p-6">
            {courses.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                You haven't created any courses yet.
              </p>
            ) : (
              <div className="space-y-4">
                {courses.slice(0, 5).map((course) => (
                  <div
                    key={course.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                          {course.description}
                        </p>
                      </div>
                      <span
                        className={`ml-4 text-xs px-2 py-1 rounded-full ${
                          course.is_published
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {course.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Inquiries
            </h2>
          </div>
          <div className="p-6">
            {inquiries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No pending inquiries.
              </p>
            ) : (
              <div className="space-y-4">
                {inquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {inquiry.subject}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {inquiry.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(inquiry.created_at).toLocaleDateString()}
                      </span>
                      <button className="text-xs text-blue-600 hover:underline">
                        Respond
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
