import { createFileRoute } from '@tanstack/react-router'
import { CalendarView } from '@/components/CalendarView'
import { CourseList } from '@/components/CourseList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCalendarEvents, getCourses } from '@/utils/courses'

export const Route = createFileRoute('/_authed/dashboard')({
  loader: async () => {
    const [coursesData, eventsData] = await Promise.all([
      getCourses(),
      getCalendarEvents(),
    ])

    // Transform courses to handle null isPublished values
    const transformedCourses = coursesData.courses.map((course) => ({
      ...course,
      isPublished: course.isPublished ?? false,
    }))

    return {
      courses: transformedCourses,
      role: coursesData.role,
      events: eventsData.events,
    }
  },
  component: DashboardComponent,
})

function DashboardComponent() {
  const { courses, role, events } = Route.useLoaderData()

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {role === 'teacher'
            ? 'Manage your courses and schedule'
            : 'View your enrolled courses and upcoming events'}
        </p>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <CourseList courses={courses} role={role} />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <CalendarView events={events} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
