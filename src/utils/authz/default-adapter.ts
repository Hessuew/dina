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
  courseTeachers,
  lessons,
  postComments,
  posts,
  submissions,
} from '@/db/schema'
import { AuthorizationError } from '@/utils/errors'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import { findAssignmentById, findProfileRoleById } from '@/utils/repository'

type AuthorizationLookup =
  | 'role'
  | 'course'
  | 'lesson'
  | 'assignment'
  | 'submission'
  | 'post'
  | 'comment'

const AUTHORIZATION_ERROR_CATEGORIES: Record<AuthorizationLookup, string> = {
  role: 'authorization_role_read_persistence',
  course: 'authorization_course_read_persistence',
  lesson: 'authorization_lesson_read_persistence',
  assignment: 'authorization_assignment_read_persistence',
  submission: 'authorization_submission_read_persistence',
  post: 'authorization_post_read_persistence',
  comment: 'authorization_comment_read_persistence',
}

async function readAuthorizationData<T>(input: {
  lookup: AuthorizationLookup
  userId: string
  fields?: Record<string, unknown>
  read: () => Promise<T>
}): Promise<T> {
  const startedAt = performance.now()
  try {
    return await input.read()
  } catch (error) {
    logServerEvent('error', 'authorization_lookup_failed', {
      requestId: getRequestId(),
      path: `authz:${input.lookup}`,
      status: 'failure',
      durationMs: elapsedMs(startedAt),
      userId: input.userId,
      errorCategory: AUTHORIZATION_ERROR_CATEGORIES[input.lookup],
      ...input.fields,
    })
    throw error
  }
}

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

    const user = await readAuthorizationData({
      lookup: 'role',
      userId,
      fields: { role },
      read: () => findProfileRoleById(userId),
    })

    const result = user?.role === role
    setCachedRole(userId, role, result)
    return result
  }

  async getRole(userId: string): Promise<Role | null> {
    const user = await readAuthorizationData({
      lookup: 'role',
      userId,
      read: () => findProfileRoleById(userId),
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
    const isTeacher = await readAuthorizationData({
      lookup: 'course',
      userId,
      fields: { action, resourceType: 'course', resourceId: courseId },
      read: async () => {
        const db = await getDb()
        return db.query.courseTeachers.findFirst({
          where: and(
            eq(courseTeachers.courseId, courseId),
            eq(courseTeachers.teacherId, userId),
          ),
        })
      },
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
    const lesson = await readAuthorizationData({
      lookup: 'lesson',
      userId,
      fields: { action, resourceType: 'lesson', resourceId: lessonId },
      read: async () => {
        const db = await getDb()
        return db.query.lessons.findFirst({
          where: eq(lessons.id, lessonId),
          columns: { courseId: true },
        })
      },
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
    const assignment = await readAuthorizationData({
      lookup: 'assignment',
      userId,
      fields: {
        action,
        resourceType: 'assignment',
        resourceId: assignmentId,
      },
      read: async () => {
        const assignmentRecord = await findAssignmentById(assignmentId)
        return assignmentRecord
          ? { lessonId: assignmentRecord.lessonId }
          : undefined
      },
    })

    if (!assignment) return false

    return this.canAccessLesson(userId, assignment.lessonId, action)
  }

  private async canAccessSubmission(
    userId: string,
    submissionId: string,
    action: Action,
  ): Promise<boolean> {
    const submission = await readAuthorizationData({
      lookup: 'submission',
      userId,
      fields: { action, resourceType: 'submission', resourceId: submissionId },
      read: async () => {
        const db = await getDb()
        return db.query.submissions.findFirst({
          where: eq(submissions.id, submissionId),
          columns: { studentId: true, assignmentId: true },
        })
      },
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

    const post = await readAuthorizationData({
      lookup: 'post',
      userId,
      fields: { action, resourceType: 'post', resourceId: postId },
      read: async () => {
        const db = await getDb()
        return db.query.posts.findFirst({
          where: eq(posts.id, postId),
          columns: { authorId: true },
        })
      },
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

    const comment = await readAuthorizationData({
      lookup: 'comment',
      userId,
      fields: { action, resourceType: 'comment', resourceId: commentId },
      read: async () => {
        const db = await getDb()
        return db.query.postComments.findFirst({
          where: eq(postComments.id, commentId),
          columns: { authorId: true },
        })
      },
    })

    if (!comment) return false
    if (comment.authorId === userId) return true
    return this.isRole(userId, 'teacher')
  }
}
