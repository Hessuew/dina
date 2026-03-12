import { router } from './trpc'
import { adminRouter } from '../routers/admin'
import { enrollmentRouter } from '../routers/enrollment'

export const appRouter = router({
  admin: adminRouter,
  enrollment: enrollmentRouter,
})

export type AppRouter = typeof appRouter
