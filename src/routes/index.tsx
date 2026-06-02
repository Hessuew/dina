import { createFileRoute } from '@tanstack/react-router'
import { LandingAboutSection } from '@/components/landing/about'
import { LandingCourseShowcase } from '@/components/landing/courses'
import { LandingHeroEditorial } from '@/components/landing/hero'
import { LandingMarksSection } from '@/components/landing/marks'
import {
  // LandingLecturerGemsSection,
  LandingTeacherSection,
} from '@/components/landing/lecturers'
import { LandingTestimonialsSection } from '@/components/landing/testimonials'
import { LandingQASection } from '@/components/landing/qa'
import { LandingLeadershipSection } from '@/components/landing/leadership'
import { LandingOfficialInfo } from '@/components/landing/official-info'
import { LandingFooter } from '@/components/landing/footer'

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
      <LandingTeacherSection />
      {/* <LandingLecturerGemsSection /> */}
      <LandingTestimonialsSection />
      <LandingMarksSection />
      <LandingQASection />
      <LandingLeadershipSection />

      <LandingOfficialInfo />
      <LandingFooter />
    </div>
  )
}
