import { createFileRoute } from '@tanstack/react-router'
import { AssignmentsView } from '@/components/AssignmentsView'
import { CourseList } from '@/components/CourseList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getAllAssignmentsForStudent,
  getAllAssignmentsForTeacher,
} from '@/utils/assignments'
import { getCourses } from '@/utils/courses'

export const Route = createFileRoute('/_authed/dashboard')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      activeTab: (search.activeTab as string) || 'courses',
    }
  },
  loader: async () => {
    const coursesData = await getCourses()

    // Transform courses to handle null isPublished values
    const transformedCourses = coursesData.courses.map((course) => ({
      ...course,
      isPublished: course.isPublished ?? false,
    }))

    // Fetch assignments based on role
    let assignmentsData
    if (coursesData.role === 'student') {
      assignmentsData = await getAllAssignmentsForStudent()
    } else {
      assignmentsData = await getAllAssignmentsForTeacher()
    }

    return {
      courses: transformedCourses,
      role: coursesData.role,
      assignments: assignmentsData.assignments,
    }
  },
  component: DashboardComponent,
})

function DashboardComponent() {
  const { courses, role, assignments } = Route.useLoaderData()
  const { activeTab } = Route.useSearch()
  const navigate = Route.useNavigate()

  const handleTabChange = (value: string) => {
    navigate({
      search: { activeTab: value },
    })
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {role === 'teacher'
            ? 'Manage your courses and assignments'
            : 'View your courses and assignments'}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        defaultValue="courses"
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <CourseList courses={courses} role={role} />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <AssignmentsView assignments={assignments} role={role} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
