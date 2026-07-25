import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const viewports = [
  { width: 320, height: 900 },
  { width: 390, height: 900 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
]

function developmentCredentials(): { email: string; password: string } {
  const email = process.env.DEVELOPMENT_SEED_EMAIL
  const password = process.env.DEVELOPMENT_SEED_PASSWORD
  if (!email || !password) {
    throw new Error(
      'DEVELOPMENT_SEED_EMAIL and DEVELOPMENT_SEED_PASSWORD are required',
    )
  }
  return { email, password }
}

async function login(page: Page): Promise<void> {
  const credentials = developmentCredentials()
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator('#email-v2').fill(credentials.email)
  await page.locator('#password-v2').fill(credentials.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

function boxesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  )
}

async function assertDashboardFits(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    main: document.querySelector('main')?.scrollWidth ?? 0,
    mainClient: document.querySelector('main')?.clientWidth ?? 0,
  }))
  expect(overflow.document).toBeLessThanOrEqual(overflow.viewport)
  expect(overflow.main).toBeLessThanOrEqual(overflow.mainClient)

  const cards = page.locator('[data-dashboard-course-card]')
  for (let index = 0; index < (await cards.count()); index += 1) {
    const card = cards.nth(index)
    const cardBox = await card.boundingBox()
    const gridBox = await card.locator('xpath=..').boundingBox()
    expect(cardBox).not.toBeNull()
    expect(gridBox).not.toBeNull()
    expect(cardBox!.x).toBeGreaterThanOrEqual(gridBox!.x - 1)
    expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(
      gridBox!.x + gridBox!.width + 1,
    )

    const teachers = card.locator('[data-course-teachers]')
    const lessons = card.locator('[data-course-lessons]')
    if ((await teachers.count()) && (await lessons.count())) {
      const teacherBox = await teachers.boundingBox()
      const lessonBox = await lessons.boundingBox()
      expect(teacherBox).not.toBeNull()
      expect(lessonBox).not.toBeNull()
      expect(boxesOverlap(teacherBox!, lessonBox!)).toBe(false)
    }
  }
}

test('dashboard stays usable at narrow and desktop widths', async ({
  page,
}) => {
  await login(page)

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('/dashboard')
    await assertDashboardFits(page)

    const navigation = page.locator('[data-course-navigation]').first()
    if (await navigation.count()) {
      await expect(navigation).toBeVisible()
      await navigation.click()
      await expect(page).toHaveURL(/\/courses\/[^/]+$/)
    }
  }
})

test('dashboard navigation reuses signed image paths', async ({ page }) => {
  const imageRequests = new Map<string, number>()
  page.on('request', (request) => {
    if (request.resourceType() !== 'image') return
    const url = new URL(request.url())
    if (!url.pathname.includes('/storage/v1/object/sign/')) return
    imageRequests.set(url.pathname, (imageRequests.get(url.pathname) ?? 0) + 1)
  })

  await login(page)
  const navigation = page.locator('[data-course-navigation]').first()
  test.skip((await navigation.count()) === 0, 'Seed has no dashboard courses')
  await navigation.click()
  await expect(page).toHaveURL(/\/courses\/[^/]+$/)
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  expect(imageRequests.size).toBeGreaterThan(0)
  for (const count of imageRequests.values())
    expect(count).toBeLessThanOrEqual(1)
})
