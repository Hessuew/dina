import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/courses/')({
  component: CoursesLayout,
})

function CoursesLayout() {
  return <Outlet />
}
