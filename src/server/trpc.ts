import { initTRPC, TRPCError } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { z } from "zod";
import superjson from "superjson";
import { db } from "../db";
import { getSupabaseServerClient } from "../utils/supabase";
import { profiles, courses, enrollments, inquiries } from "../db/schema";
import { eq, count, and } from "drizzle-orm";

const createTRPContext = async ({ req, res }: CreateExpressContextOptions) => {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    db,
    user,
    supabase,
  };
};

type TRPCContext = Awaited<ReturnType<typeof createTRPContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;

const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const profile = await ctx.db.query.profiles.findFirst({
    where: eq(profiles.id, ctx.user.id),
  });

  if (profile?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return next({ ctx });
});

const teacherProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const profile = await ctx.db.query.profiles.findFirst({
    where: eq(profiles.id, ctx.user.id),
  });

  if (profile?.role !== "teacher" && profile?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return next({ ctx });
});

export const appRouter = t.router({
  hello: publicProcedure.query(() => "Hello world!"),

  admin: t.router({
    getStats: adminProcedure.query(async ({ ctx }) => {
      const [usersCount, coursesCount, enrollmentsCount, openInquiriesCount] =
        await Promise.all([
          ctx.db.select({ count: count() }).from(profiles),
          ctx.db.select({ count: count() }).from(courses),
          ctx.db.select({ count: count() }).from(enrollments),
          ctx.db
            .select({ count: count() })
            .from(inquiries)
            .where(eq(inquiries.status, "open")),
        ]);

      const users = await ctx.db.select().from(profiles);
      const usersByRole = {
        students: users.filter((u) => u.role === "student").length,
        teachers: users.filter((u) => u.role === "teacher").length,
        admins: users.filter((u) => u.role === "admin").length,
      };

      const allCourses = await ctx.db.select().from(courses);
      const publishedCourses = allCourses.filter((c) => c.isPublished).length;

      return {
        totalUsers: usersCount[0].count,
        usersByRole,
        totalCourses: coursesCount[0].count,
        publishedCourses,
        totalEnrollments: enrollmentsCount[0].count,
        openInquiries: openInquiriesCount[0].count,
      };
    }),

    listUsers: adminProcedure
      .input(
        z.object({
          role: z.enum(["student", "teacher", "admin"]).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        }),
      )
      .query(async ({ ctx, input }) => {
        let query = ctx.db.select().from(profiles);

        if (input.role) {
          query = query.where(eq(profiles.role, input.role)) as any;
        }

        const users = await query.limit(input.limit).offset(input.offset);
        return users;
      }),

    updateUserRole: adminProcedure
      .input(
        z.object({
          userId: z.string().uuid(),
          role: z.enum(["student", "teacher", "admin"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const result = await ctx.db
          .update(profiles)
          .set({
            role: input.role,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, input.userId))
          .returning();

        if (!result[0]) {
          throw new Error("User not found");
        }

        return result[0];
      }),
  }),

  enrollment: t.router({
    list: protectedProcedure
      .input(
        z.object({
          studentId: z.string().uuid(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const profile = await ctx.db.query.profiles.findFirst({
          where: eq(profiles.id, ctx.user.id),
        });

        if (
          ctx.user.id !== input.studentId &&
          profile?.role !== "admin" &&
          profile?.role !== "teacher"
        ) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const result = await ctx.db.query.enrollments.findMany({
          where: eq(enrollments.studentId, input.studentId),
          with: {
            course: true,
          },
          orderBy: (enrollments, { desc }) => [desc(enrollments.enrolledAt)],
        });

        return result;
      }),

    approve: adminProcedure
      .input(
        z.object({
          enrollmentId: z.string().uuid(),
          approvedBy: z.string().uuid(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const result = await ctx.db
          .update(enrollments)
          .set({
            status: "active",
            approvedBy: input.approvedBy,
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(enrollments.id, input.enrollmentId))
          .returning();

        if (!result[0]) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Enrollment not found",
          });
        }

        return result[0];
      }),

    reject: adminProcedure
      .input(
        z.object({
          enrollmentId: z.string().uuid(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const result = await ctx.db
          .update(enrollments)
          .set({
            status: "dropped",
            updatedAt: new Date(),
          })
          .where(eq(enrollments.id, input.enrollmentId))
          .returning();

        if (!result[0]) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Enrollment not found",
          });
        }

        return result[0];
      }),

    create: protectedProcedure
      .input(
        z.object({
          courseId: z.string().uuid(),
          studentId: z.string().uuid(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id !== input.studentId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const existing = await ctx.db.query.enrollments.findFirst({
          where: and(
            eq(enrollments.courseId, input.courseId),
            eq(enrollments.studentId, input.studentId),
          ),
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Already enrolled in this course",
          });
        }

        const result = await ctx.db
          .insert(enrollments)
          .values({
            courseId: input.courseId,
            studentId: input.studentId,
            status: "pending",
          })
          .returning();

        return result[0];
      }),
  }),

  teacher: t.router({
    getDashboard: teacherProcedure.query(async ({ ctx }) => {
      const [coursesResult, inquiriesResult, enrollmentsResult] =
        await Promise.all([
          ctx.db.query.courses.findMany({
            where: eq(courses.teacherId, ctx.user.id),
            orderBy: (courses, { desc }) => [desc(courses.createdAt)],
          }),
          ctx.db.query.inquiries.findMany({
            where: and(
              eq(inquiries.courseId, ctx.user.id),
              eq(inquiries.status, "open"),
            ),
            orderBy: (inquiries, { desc }) => [desc(inquiries.createdAt)],
            limit: 5,
          }),
          ctx.db.query.enrollments.findMany({
            where: eq(enrollments.courseId, ctx.user.id),
            with: {
              course: true,
            },
          }),
        ]);

      return {
        courses: coursesResult,
        inquiries: inquiriesResult,
        totalStudents: enrollmentsResult.length,
      };
    }),
  }),

  student: t.router({
    getDashboard: protectedProcedure.query(async ({ ctx }) => {
      const enrollmentsResult = await ctx.db.query.enrollments.findMany({
        where: eq(enrollments.studentId, ctx.user.id),
        with: {
          course: true,
        },
        orderBy: (enrollments, { desc }) => [desc(enrollments.createdAt)],
      });

      return {
        enrollments: enrollmentsResult,
      };
    }),
  }),

  auth: t.router({
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { error } = await ctx.supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });

        if (error) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: error.message,
          });
        }

        return { success: true };
      }),

    signup: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { error } = await ctx.supabase.auth.signUp({
          email: input.email,
          password: input.password,
        });

        if (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        return { success: true };
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const { error } = await ctx.supabase.auth.signOut();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { success: true };
    }),
  }),

  posts: t.router({
    list: publicProcedure.query(() => {
      return [
        { id: "1", title: "Example Post 1", body: "This is a demo post." },
        { id: "2", title: "Example Post 2", body: "Another demo post." },
        { id: "3", title: "Example Post 3", body: "Yet another demo post." },
      ];
    }),

    byId: publicProcedure.input(z.string()).query(({ input }) => {
      const posts = [
        { id: "1", title: "Example Post 1", body: "This is a demo post." },
        { id: "2", title: "Example Post 2", body: "Another demo post." },
        { id: "3", title: "Example Post 3", body: "Yet another demo post." },
      ];

      const post = posts.find((p) => p.id === input);

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      return post;
    }),
  }),
});

export const trpcMiddleWare = createExpressMiddleware({
  router: appRouter,
  createContext: createTRPContext,
});

export type AppRouter = typeof appRouter;
