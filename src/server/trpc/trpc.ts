import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from './context'
import superjson from 'superjson'
import { profiles } from '../../db/schema'
import { eq } from 'drizzle-orm'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const profile = await ctx.db.query.profiles.findFirst({
    where: eq(profiles.id, ctx.user.id),
  })
  
  if (profile?.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  
  return next({ ctx })
})

export const teacherProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const profile = await ctx.db.query.profiles.findFirst({
    where: eq(profiles.id, ctx.user.id),
  })
  
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  
  return next({ ctx })
})
