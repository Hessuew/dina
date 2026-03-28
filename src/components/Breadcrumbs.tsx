import { Link, useMatches } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

type BreadcrumbsProps = {
  items?: Array<{
    label: string
    href?: string
  }>
}

export function Breadcrumbs({ items }: BreadcrumbsProps = {}) {
  const matches = useMatches()

  // Use custom items if provided, otherwise generate from route matches
  const breadcrumbs =
    items ||
    matches
      .filter((match) => match.pathname !== '/')
      .map((match) => {
        const segments = match.pathname.split('/').filter(Boolean)
        const lastSegment = segments[segments.length - 1]

        // Custom labels for specific routes
        const labelMap: Record<string, string> = {
          dashboard: 'Dashboard',
          courses: 'Courses',
          new: 'Create Course',
          edit: 'Edit Course',
          profile: 'Profile',
        }

        const label =
          labelMap[lastSegment] ||
          lastSegment
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')

        return {
          label,
          href: match.pathname,
        }
      })

  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to="/dashboard" />}>
            Dashboard
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href || index} className="flex items-center gap-1.5">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 || !crumb.href ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link to={crumb.href} />}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
