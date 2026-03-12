import { z } from 'zod'
import { router, adminProcedure } from '../trpc/trpc'
import { profiles, courses, enrollments, inquiries } from '../../db/schema'
import { eq, count } from 'drizzle-orm'

export const adminRouter = router({
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [usersCount, coursesCount, enrollmentsCount, openInquiriesCount] = 
      await Promise.all([
        ctx.db.select({ count: count() }).from(profiles),
        ctx.db.select({ count: count() }).from(courses),
        ctx.db.select({ count: count() }).from(enrollments),
        ctx.db.select({ count: count() })
          .from(inquiries)
          .where(eq(inquiries.status, 'open')),
      ])
    
    const users = await ctx.db.select().from(profiles)
    const usersByRole = {
      students: users.filter(u => u.role === 'student').length,
      teachers: users.filter(u => u.role === 'teacher').length,
      admins: users.filter(u => u.role === 'admin').length,
    }
    
    const allCourses = await ctx.db.select().from(courses)
    const publishedCourses = allCourses.filter(c => c.is_published).length
    
    return {
      totalUsers: usersCount[0].count,
      usersByRole,
      totalCourses: coursesCount[0].count,
      publishedCourses,
      totalEnrollments: enrollmentsCount[0].count,
      openInquiries: openInquiriesCount[0].count,
    }
  }),
  
  listUsers: adminProcedure
    .input(z.object({
      role: z.enum(['student', 'teacher', 'admin']).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.db.select().from(profiles)
      
      if (input.role) {
        query = query.where(eq(profiles.role, input.role)) as any
      }
      
      const users = await query.limit(input.limit).offset(input.offset)
      return users
    }),
  
  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.string().uuid(),
      role: z.enum(['student', 'teacher', 'admin']),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.update(profiles)
        .set({ 
          role: input.role,
          updated_at: new Date(),
        })
        .where(eq(profiles.id, input.userId))
        .returning()
      
      if (!result[0]) {
        throw new Error('User not found')
      }
      
      return result[0]
    }),
})
