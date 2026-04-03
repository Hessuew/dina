import { createFileRoute } from '@tanstack/react-router'
import { LandingCourseShowcase } from '@/components/landing/courses'
import { LandingHeroEditorial } from '@/components/landing/hero'

export const Route = createFileRoute('/')({
  component: Home,
})

const landingHeroVariants = {
  editorial: LandingHeroEditorial,
}

const ActiveLandingHero = landingHeroVariants.editorial

function Home() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen">
      <ActiveLandingHero onLearnMore={() => scrollToSection('about')} />

      <LandingCourseShowcase />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section id="about" className="py-16">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-gray-900 md:text-4xl">
                About DINA
              </h2>
              <div className="space-y-4 text-gray-600">
                <p className="text-lg leading-relaxed">
                  Disciples Institute for Nations Academy (DINA) is a leading
                  institution dedicated to equipping believers with biblical
                  knowledge and practical skills to impact their communities and
                  nations.
                </p>
                <div className="rounded-lg border-l-4 border-blue-600 bg-blue-50 p-6">
                  <h3 className="mb-2 font-bold text-gray-900">Mission</h3>
                  <p>
                    To raise up disciples who are grounded in biblical truth,
                    equipped with practical wisdom, and empowered to transform
                    their spheres of influence for the glory of God.
                  </p>
                </div>
                <div className="rounded-lg border-l-4 border-amber-600 bg-amber-50 p-6">
                  <h3 className="mb-2 font-bold text-gray-900">Vision</h3>
                  <p>
                    A global network of biblically-grounded disciples actively
                    transforming nations through faith, wisdom, and excellence
                    in every sphere of society.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center rounded-2xl bg-linear-to-br from-blue-100 to-blue-50 p-8">
              <div className="text-center">
                <span className="mb-4 block text-8xl">👥</span>
                <p className="font-medium text-gray-700">
                  Empowering disciples worldwide
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-16">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 md:text-4xl">
            Testimonials
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-xl border-t-4 border-amber-500 bg-amber-50 p-8 shadow-lg">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-200">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Sarah Johnson</p>
                  <p className="text-sm text-gray-600">Student</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "This program has completely transformed my understanding of
                biblical principles and how to apply them in daily life. The
                'Building a House' approach is brilliant!"
              </p>
            </div>

            <div className="rounded-xl border-t-4 border-blue-500 bg-blue-50 p-8 shadow-lg">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-200">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Michael Chen</p>
                  <p className="text-sm text-gray-600">Graduate</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "The practical wisdom and biblical depth I gained here has
                equipped me to lead with confidence and integrity in my
                community."
              </p>
            </div>

            <div className="rounded-xl border-t-4 border-green-500 bg-green-50 p-8 shadow-lg">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-200">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Grace Okonkwo</p>
                  <p className="text-sm text-gray-600">Ministry Leader</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "DINA provided the foundation I needed to build a sustainable
                ministry. The courses are comprehensive and life-changing."
              </p>
            </div>
          </div>
        </section>

        <section id="faq" className="py-16">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 md:text-4xl">
            Frequently Asked Questions
          </h2>
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                What is the "Building a House" curriculum approach?
              </h3>
              <p className="text-gray-600">
                Our curriculum uses the metaphor of building a house to teach
                foundational biblical principles. Just as a house needs a solid
                foundation, proper framing, and a protective roof, disciples
                need core biblical knowledge, structural understanding, and
                spiritual covering to thrive.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                How long does it take to complete the courses?
              </h3>
              <p className="text-gray-600">
                Each course is self-paced, allowing you to progress according to
                your schedule. On average, students complete the full curriculum
                in 6-12 months, depending on their commitment level and prior
                knowledge.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Do I need any prerequisites to enroll?
              </h3>
              <p className="text-gray-600">
                No formal prerequisites are required. We welcome all believers
                who have a genuine desire to grow in their faith and
                understanding of biblical principles. Our courses are designed
                to meet you where you are.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Will I receive a certificate upon completion?
              </h3>
              <p className="text-gray-600">
                Yes! Upon successful completion of each course, you will receive
                a certificate of completion. Students who complete the entire
                curriculum receive a DINA Diploma recognizing their achievement.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Is there community support during the courses?
              </h3>
              <p className="text-gray-600">
                Absolutely! You'll have access to discussion forums, study
                groups, and direct interaction with instructors. We believe
                learning happens best in community, and we're committed to
                supporting your journey.
              </p>
            </div>
          </div>
        </section>
      </div>

      <footer id="contact" className="mt-20 bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <h3 className="mb-4 text-2xl font-bold">🏛️ DINA</h3>
              <p className="text-gray-400">
                Disciples Institute for Nations Academy
              </p>
              <p className="mt-2 text-gray-400">
                Building disciples who transform nations
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-lg font-bold">Contact Us</h4>
              <div className="space-y-2 text-gray-400">
                <p>📧 info@dina.academy</p>
                <p>📞 +1 (555) 123-4567</p>
                <p>📍 123 Ministry Lane, Faith City, FC 12345</p>
              </div>
            </div>

            <div>
              <h4 className="mb-4 text-lg font-bold">Follow Us</h4>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 transition-colors hover:bg-blue-700"
                >
                  <span className="text-xl">f</span>
                </a>
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400 transition-colors hover:bg-blue-500"
                >
                  <span className="text-xl">𝕏</span>
                </a>
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 transition-colors hover:bg-red-700"
                >
                  <span className="text-xl">▶</span>
                </a>
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 transition-colors hover:bg-pink-700"
                >
                  <span className="text-xl">📷</span>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} DINA - Disciples Institute for
              Nations Academy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
