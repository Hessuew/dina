import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "../../../router";

export const Route = createFileRoute("/_authed/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats, isLoading, error } = trpc.admin.getStats.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">
          Error loading dashboard: {error.message}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          User Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {stats.totalUsers}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Students</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {stats.usersByRole.students}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Teachers</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {stats.usersByRole.teachers}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Admins</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {stats.usersByRole.admins}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Course Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Courses</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {stats.totalCourses}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">
              Published Courses
            </h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {stats.publishedCourses}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">
              Total Enrollments
            </h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {stats.totalEnrollments}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          System Activity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">
              Open Inquiries
            </h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {stats.openInquiries}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">
              Avg. Enrollment per Course
            </h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {stats.totalCourses > 0
                ? Math.round(stats.totalEnrollments / stats.totalCourses)
                : 0}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Manage Users
          </button>
          <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Manage Courses
          </button>
          <button className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
