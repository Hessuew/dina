import { z } from "zod";
import {
  router,
  protectedProcedure,
  adminProcedure,
  teacherProcedure,
} from "../trpc/trpc";
import { enrollments, profiles } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const enrollmentRouter = router({
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
          approved_by: input.approvedBy,
          approved_at: new Date(),
          updated_at: new Date(),
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
          status: "rejected",
          updated_at: new Date(),
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
});
