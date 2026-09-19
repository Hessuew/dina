import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { LandingAboutSection } from '@/components/landing/about/about'
import { LandingCourseShowcase } from '@/components/landing/courses'
import { LandingHeroEditorial } from '@/components/landing/hero'

const LazyLandingLecturerGemsSection = lazy(() =>
  import('@/components/landing/lecturers').then((module) => ({
    default: module.LandingLecturerGemsSection,
  })),
)
const LazyLandingTestimonialsSection = lazy(() =>
  import('@/components/landing/testimonials').then((module) => ({
    default: module.LandingTestimonialsSection,
  })),
)
const LazyLandingMarksSection = lazy(() =>
  import('@/components/landing/marks').then((module) => ({
    default: module.LandingMarksSection,
  })),
)
const LazyLandingQASection = lazy(() =>
  import('@/components/landing/qa').then((module) => ({
    default: module.LandingQASection,
  })),
)
const LazyLandingLeadershipSection = lazy(() =>
  import('@/components/landing/leadership').then((module) => ({
    default: module.LandingLeadershipSection,
  })),
)
const LazyLandingOfficialInfo = lazy(() =>
  import('@/components/landing/official-info').then((module) => ({
    default: module.LandingOfficialInfo,
  })),
)
const LazyLandingFooter = lazy(() =>
  import('@/components/landing/footer').then((module) => ({
    default: module.LandingFooter,
  })),
)

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { user } = Route.useRouteContext()

  return (
    <div className="min-h-screen">
      <LandingHeroEditorial user={user} />

      <LandingAboutSection />
      <LandingCourseShowcase />
      <Suspense fallback={null}>
        <LazyLandingLecturerGemsSection />
      </Suspense>
      <Suspense fallback={null}>
        <LazyLandingTestimonialsSection />
        <LazyLandingMarksSection />
        <LazyLandingQASection />
        <LazyLandingLeadershipSection />
        <LazyLandingOfficialInfo />
        <LazyLandingFooter />
      </Suspense>
    </div>
  )
}
