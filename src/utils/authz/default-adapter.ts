import { and, eq } from 'drizzle-orm'
import {
  getCachedResourceCheck,
  getCachedRole,
  setCachedResourceCheck,
  setCachedRole,
} from './cache'
import type { Action, AuthorizationService, ResourceType, Role } from './types'
import { getDb } from '@/db'
import {
  assignments,
  courseTeachers,
  lessons,
  postComments,
  posts,
  profiles,
  submissions,
} from '@/db/schema'
import { AuthorizationError } from '@/utils/errors'

export class DefaultAuthorizationService implements AuthorizationService {
  async hasRole(userId: string, role: Role): Promise<void> {
    const hasIt = await this.isRole(userId, role)
    if (!hasIt) {
      throw new AuthorizationError(`${role} access required`, {
        code: 'ROLE_REQUIRED',
        internalMessage: `User does not have role: ${role}`,
        details: { role },
      })
    }
  }

  async isRole(userId: string, role: Role): Promise<boolean> {
    const cached = getCachedRole(userId, role)
    if (cached !== null) return cached

    const db = await getDb()
    const user = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      columns: { role: true },
    })

    const result = user?.role === role
    setCachedRole(userId, role, result)
    return result
  }

  async getRole(userId: string): Promise<Role | null> {
    const db = await getDb()
    const user = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      columns: { role: true },
    })
    return user?.role ?? null
  }

  async isAdmin(userId: string): Promise<boolean> {
    return this.isRole(userId, 'admin')
  }

  async canPerformAction(
    userId: string,
    action: Action,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<void> {
    const allowed = await this.isAllowedToPerformAction(
      userId,
      action,
      resourceType,
      resourceId,
    )
    if (!allowed) {
      throw new AuthorizationError(
        `Not authorized to ${action} on ${resourceType}`,
        {
          code: 'ACTION_NOT_ALLOWED',
          internalMessage: `User cannot perform ${action} on ${resourceType}:${resourceId}`,
          details: { action, resourceType, resourceId },
        },
      )
    }
  }

  async isAllowedToPerformAction(
    userId: string,
    action: Action,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<boolean> {
    const cacheKey = `${userId}:${action}:${resourceType}:${resourceId}`
    const cached = getCachedResourceCheck(cacheKey)
    if (cached !== null) return cached

    let result = false

    // Admins can do everything
    if (await this.isAdmin(userId)) {
      result = true
    } else {
      // Resource-specific logic
      switch (resourceType) {
        case 'course':
          result = await this.canAccessCourse(userId, resourceId, action)
          break
        case 'lesson':
          result = await this.canAccessLesson(userId, resourceId, action)
          break
        case 'assignment':
          result = await this.canAccessAssignment(userId, resourceId, action)
          break
        case 'submission':
          result = await this.canAccessSubmission(userId, resourceId, action)
          break
        case 'post':
          result = await this.canAccessPost(userId, resourceId, action)
          break
        case 'comment':
          result = await this.canAccessComment(userId, resourceId, action)
          break
      }
    }

    setCachedResourceCheck(cacheKey, result)
    return result
  }

  private async canAccessCourse(
    userId: string,
    courseId: string,
    action: Action,
  ): Promise<boolean> {
    const db = await getDb()
    const isTeacher = await db.query.courseTeachers.findFirst({
      where: and(
        eq(courseTeachers.courseId, courseId),
        eq(courseTeachers.teacherId, userId),
      ),
    })

    if (isTeacher) return true

    // Students can view courses they're enrolled in
    if (action === 'viewCourse') {
      // TODO: Check enrollment when enrollment logic is added
      return true
    }

    return false
  }

  private async canAccessLesson(
    userId: string,
    lessonId: string,
    action: Action,
  ): Promise<boolean> {
    // Lessons inherit course access
    const db = await getDb()
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      columns: { courseId: true },
    })

    if (!lesson) return false

    return this.canAccessCourse(userId, lesson.courseId, action)
  }

  private async canAccessAssignment(
    userId: string,
    assignmentId: string,
    action: Action,
  ): Promise<boolean> {
    // Assignments inherit lesson/course access
    const db = await getDb()
    const assignment = await db.query.assignments.findFirst({
      where: eq(assignments.id, assignmentId),
      columns: { lessonId: true },
    })

    if (!assignment) return false

    return this.canAccessLesson(userId, assignment.lessonId, action)
  }

  private async canAccessSubmission(
    userId: string,
    submissionId: string,
    action: Action,
  ): Promise<boolean> {
    const db = await getDb()
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, submissionId),
      columns: { studentId: true, assignmentId: true },
    })

    if (!submission) return false

    // Students can view/edit their own submissions
    if (submission.studentId === userId) {
      return action === 'viewSubmission' || action === 'editSubmission'
    }

    // Teachers can grade submissions in their courses
    return this.canAccessAssignment(
      userId,
      submission.assignmentId,
      'gradeAssignment',
    )
  }

  private async canAccessPost(
    userId: string,
    postId: string,
    action: Action,
  ): Promise<boolean> {
    if (action !== 'editPost' && action !== 'deletePost') return false

    const db = await getDb()
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      columns: { authorId: true },
    })

    if (!post) return false
    if (post.authorId === userId) return true
    return this.isRole(userId, 'teacher')
  }

  private async canAccessComment(
    userId: string,
    commentId: string,
    action: Action,
  ): Promise<boolean> {
    if (action !== 'editComment' && action !== 'deleteComment') return false

    const db = await getDb()
    const comment = await db.query.postComments.findFirst({
      where: eq(postComments.id, commentId),
      columns: { authorId: true },
    })

    if (!comment) return false
    if (comment.authorId === userId) return true
    return this.isRole(userId, 'teacher')
  }
}
