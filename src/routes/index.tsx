import { createFileRoute } from '@tanstack/react-router'
import { LandingAboutSection } from '@/components/landing/about'
import { LandingCourseShowcase } from '@/components/landing/courses'
import { LandingHeroEditorial } from '@/components/landing/hero'
import { LandingMarksSection } from '@/components/landing/marks'
import { LandingTeacherSection } from '@/components/landing/teachers'
import { LandingTestimonialsSection } from '@/components/landing/testimonials'
import { LandingFooter } from '@/components/landing/footer'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen">
      <LandingHeroEditorial onLearnMore={() => scrollToSection('about')} />

      <LandingAboutSection />
      <LandingCourseShowcase />
      <LandingTeacherSection />
      <LandingTestimonialsSection />
      <LandingMarksSection />

      <LandingFooter />
    </div>
  )
}
